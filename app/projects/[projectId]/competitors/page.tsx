"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  primary_category: string | null;
  target_metro: string | null;
  target_radius_miles: number | null;
};

type CompetitorMetric = {
  project_id: string;
  competitor_domain: string;
  place_id: string | null;
  name: string | null;
  rating: number | null;
  total_reviews: number | null;
  last_seen_at: string | null;
};

type CompetitorSnapshot = {
  project_id: string;
  competitor_domain: string;
  total_reviews: number | null;
  captured_at: string;
};

type ObservedLabel = "Observed (90d)" | "Observed (30d)" | "Observed (14d)";
type EstimatedLabel = "Estimated";

type VelocityResult =
  | {
      kind: "observed";
      confidenceLabel: ObservedLabel;
      marketGrowth90d: number;
      observedDeltaReviews: number;
      observedDays: number;
    }
  | {
      kind: "estimated";
      confidenceLabel: EstimatedLabel;
      marketGrowth90d: number;
      note: string;
    };

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

function findClosestSnapshotToDate(
  snapshotsDesc: CompetitorSnapshot[],
  targetDate: Date,
  maxDaysAway: number
) {
  let best: CompetitorSnapshot | null = null;
  let bestDiff = Infinity;

  for (const s of snapshotsDesc) {
    const t = new Date(s.captured_at).getTime();
    const diffDays = Math.abs(t - targetDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= maxDaysAway && diffDays < bestDiff) {
      best = s;
      bestDiff = diffDays;
    }
  }

  return best;
}

function computeVelocityAutoUpgrade(
  competitorForVelocity: CompetitorMetric | null,
  snapshotsDesc: CompetitorSnapshot[]
): VelocityResult {
  const estimated: VelocityResult = {
    kind: "estimated",
    confidenceLabel: "Estimated",
    marketGrowth90d: clampInt(
      ((competitorForVelocity?.total_reviews ?? 0) * 0.06) / 1,
      12,
      180
    ),
    note: "Not enough snapshot history yet. This will automatically upgrade after 2–4 weeks.",
  };

  if (!competitorForVelocity) return estimated;
  if (!snapshotsDesc.length) return estimated;

  const latest = snapshotsDesc[0];
  if (latest.total_reviews == null) return estimated;

  const horizons: Array<{ h: 90 | 30 | 14; label: ObservedLabel; maxDaysAway: number }> = [
    { h: 90, label: "Observed (90d)", maxDaysAway: 10 },
    { h: 30, label: "Observed (30d)", maxDaysAway: 6 },
    { h: 14, label: "Observed (14d)", maxDaysAway: 4 },
  ];

  for (const { h, label, maxDaysAway } of horizons) {
    const target = new Date(latest.captured_at);
    target.setDate(target.getDate() - h);

    const past = findClosestSnapshotToDate(snapshotsDesc, target, maxDaysAway);
    if (!past) continue;
    if (past.total_reviews == null) continue;

    const observedDays = daysBetween(latest.captured_at, past.captured_at);
    if (observedDays < h * 0.7) continue;

    const delta = (latest.total_reviews ?? 0) - (past.total_reviews ?? 0);
    if (delta <= 0) continue;

    const perDay = delta / observedDays;
    const projected90 = clampInt(perDay * 90, 0, 9999);

    return {
      kind: "observed",
      confidenceLabel: label,
      marketGrowth90d: projected90,
      observedDeltaReviews: delta,
      observedDays: Math.round(observedDays),
    };
  }

  return estimated;
}

function medianInt(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function shortName(s: string | null) {
  if (!s) return "—";
  return s.length > 42 ? s.slice(0, 41) + "…" : s;
}

export default function CompetitorsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorMetric[]>([]);
  const [snapshotsForThreshold, setSnapshotsForThreshold] = useState<CompetitorSnapshot[]>([]);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const top3 = useMemo(() => competitors.slice(0, 3), [competitors]);

  const thresholdCompetitor = useMemo(() => {
    if (top3.length === 0) return null;
    const idx = top3.length === 3 ? 1 : 0;
    return top3[idx] ?? null;
  }, [top3]);

  const thresholdReviews = useMemo(() => {
    const vals = top3
      .map((c) => c.total_reviews ?? 0)
      .filter((n) => Number.isFinite(n));

    if (!vals.length) return 0;
    return medianInt(vals);
  }, [top3]);

  const benchmarkUpdatedAt = useMemo(() => {
    return snapshotsForThreshold?.[0]?.captured_at ?? null;
  }, [snapshotsForThreshold]);

  const velocity = useMemo(() => {
    return computeVelocityAutoUpgrade(thresholdCompetitor, snapshotsForThreshold);
  }, [thresholdCompetitor, snapshotsForThreshold]);

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, primary_category, target_metro, target_radius_miles")
      .eq("id", projectId)
      .limit(1);

    if (error) throw new Error(`Project load failed: ${error.message}`);
    const row = (data ?? [])[0] as Project | undefined;
    return row ?? null;
  }

  async function loadCompetitors() {
    const { data, error } = await supabase
      .from("gbp_competitor_metrics")
      .select("project_id, competitor_domain, place_id, name, rating, total_reviews, last_seen_at")
      .eq("project_id", projectId);

    if (error) throw new Error(`Competitors load failed: ${error.message}`);

    const sorted = ((data ?? []) as CompetitorMetric[]).slice().sort((a, b) => {
      const ar = a.total_reviews ?? 0;
      const br = b.total_reviews ?? 0;
      return br - ar;
    });

    return sorted;
  }

  async function loadSnapshotsForCompetitor(c: CompetitorMetric | null) {
    if (!c) return [];

    const { data, error } = await supabase
      .from("gbp_competitor_snapshots")
      .select("project_id, competitor_domain, total_reviews, captured_at")
      .eq("project_id", projectId)
      .eq("competitor_domain", c.competitor_domain)
      .order("captured_at", { ascending: false })
      .limit(400);

    if (error) return [];
    return (data as CompetitorSnapshot[]) ?? [];
  }

  async function refreshAll() {
    setLoading(true);
    setStatus(null);

    try {
      const proj = await loadProject();

      if (!proj) {
        setProject(null);
        setCompetitors([]);
        setSnapshotsForThreshold([]);
        setStatus(
          "I can’t access this project. This usually means you are logged out or Row Level Security is blocking the current user."
        );
        return;
      }

      setProject(proj);

      const comps = await loadCompetitors();
      setCompetitors(comps);

      const top3Local = comps.slice(0, 3);
      const thresholdLocal = top3Local.length === 3 ? top3Local[1] : top3Local[0] ?? null;

      const snaps = await loadSnapshotsForCompetitor(thresholdLocal ?? null);
      setSnapshotsForThreshold(snaps);
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const ok = await requireAuth();
      if (!ok) {
        setLoading(false);
        return;
      }
      setAuthed(true);
      await refreshAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function runDiscovery() {
    setRunning(true);
    setStatus("Running discovery…");

    try {
      const res = await fetch(`/api/projects/${projectId}/discover-competitors`, {
        method: "POST",
      });

      const text = await res.text();

      if (!res.ok) {
        setStatus(`Discovery failed (${res.status}): ${text}`);
        return;
      }

      setStatus(text || "Discovery complete.");
      await refreshAll();
    } catch (e: any) {
      setStatus(`Discovery error: ${e?.message ?? "Unknown error"}`);
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-neutral-600">Loading competitor intelligence…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-500">
              Digital Brain
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950 dark:text-white">
              Competitor Intelligence
            </h1>
            <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-400">
              {project?.primary_category ?? "Category"} • {project?.target_metro ?? "Metro"} •{" "}
              {project?.target_radius_miles ?? "—"} mi
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Back to Authority
            </Link>
            <Link
              href={`/projects/${projectId}/rank`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              View Rank Intelligence
            </Link>
            <Link
              href={`/projects/${projectId}/actions`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              View Growth Actions
            </Link>
            <button
              onClick={runDiscovery}
              disabled={running || !authed || !project}
              className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
              type="button"
            >
              {running ? "Running…" : "Run discovery"}
            </button>
          </div>
        </div>

        {status ? (
          <div className="rounded-2xl border border-neutral-300 bg-white p-4 text-sm text-neutral-800 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300">
            {status}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
              Competitors Found
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
              {competitors.length}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
              Top 3 Median Reviews
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
              {thresholdReviews || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
              Market Growth (90d)
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
              {velocity.marketGrowth90d}
            </p>
            <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-400">
              {velocity.confidenceLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
            <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
              Benchmark Updated
            </p>
            <p className="mt-3 text-sm font-semibold text-neutral-950 dark:text-white">
              {benchmarkUpdatedAt ? formatWhen(benchmarkUpdatedAt) : "—"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Market Velocity
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
                Benchmark competitor review growth based on snapshot history.
              </p>
            </div>
            <div className="text-right text-xs text-neutral-700 dark:text-neutral-500">
              <p>{velocity.confidenceLabel}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
            {velocity.kind === "observed" ? (
              <div className="space-y-2 text-sm text-neutral-800 dark:text-neutral-300">
                <p>
                  Market growth is currently estimated at{" "}
                  <span className="font-semibold">{velocity.marketGrowth90d}</span> reviews per 90
                  days.
                </p>
                <p>
                  Observed from a change of{" "}
                  <span className="font-semibold">+{velocity.observedDeltaReviews}</span> reviews
                  across <span className="font-semibold">{velocity.observedDays}</span> days for the
                  current benchmark competitor.
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-neutral-800 dark:text-neutral-300">
                <p>
                  Market growth is currently estimated at{" "}
                  <span className="font-semibold">{velocity.marketGrowth90d}</span> reviews per 90
                  days.
                </p>
                <p>{velocity.note}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Top 3 Benchmark Competitors
            </h2>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
              These competitors define the current review benchmark for this market.
            </p>
          </div>

          {top3.length === 0 ? (
            <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              No competitors found yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {top3.map((c, idx) => (
                <div
                  key={c.competitor_domain}
                  className="rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                        {idx + 1}. {shortName(c.name)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-500">
                        {c.place_id ?? c.competitor_domain}
                      </p>
                    </div>

                    {top3.length === 3 && idx === 1 ? (
                      <span className="rounded-full border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                        Median benchmark
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-500">Reviews</p>
                      <p className="font-semibold text-neutral-950 dark:text-white">
                        {c.total_reviews ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-500">Rating</p>
                      <p className="font-semibold text-neutral-950 dark:text-white">
                        {c.rating ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              All Discovered Competitors
            </h2>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
              Sorted by total reviews.
            </p>
          </div>

          {competitors.length === 0 ? (
            <div className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
              No competitors found yet. Click <span className="font-medium">Run discovery</span>.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-neutral-800 dark:text-neutral-500">
                  <tr className="border-b border-neutral-300 dark:border-neutral-800">
                    <th className="px-3 py-3 font-medium">Competitor</th>
                    <th className="px-3 py-3 font-medium">Reviews</th>
                    <th className="px-3 py-3 font-medium">Rating</th>
                    <th className="px-3 py-3 font-medium">Domain</th>
                    <th className="px-3 py-3 font-medium">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c) => (
                    <tr
                      key={c.competitor_domain}
                      className="border-b border-neutral-200 dark:border-neutral-900"
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium text-neutral-950 dark:text-neutral-200">
                            {c.name ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-500">
                            {c.place_id ?? c.competitor_domain}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-neutral-950 dark:text-neutral-200">
                        {c.total_reviews ?? 0}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {c.rating ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {c.competitor_domain?.startsWith("place_id:")
                          ? "—"
                          : c.competitor_domain ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}