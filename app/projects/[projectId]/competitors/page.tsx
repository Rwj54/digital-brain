"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  primary_category: string | null;
  target_metro: string | null;
  target_radius_miles: number | null;
};

type OwnerDashboardContext = {
  ok: boolean;
  error?: string;
  projectId: string;
  projectDisplayName: string | null;
  domainDisplayValue: string | null;
  projectLocationLabel: string | null;
  pageScopeLabel: string;
  capturedAt: string;
};

type CompetitorMetric = {
  project_id: string;
  competitor_domain: string;
  place_id: string | null;
  name: string | null;
  competitor_name: string | null;
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
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

function formatDate(iso: string | null) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function shortName(s: string | null) {
  if (!s) return "—";
  return s.length > 42 ? `${s.slice(0, 41)}…` : s;
}

function getDisplayName(c: CompetitorMetric) {
  return c.name?.trim() || c.competitor_name?.trim() || "—";
}

function buildCompetitorRead(
  thresholdCompetitor: CompetitorMetric | null,
  velocity: VelocityResult,
  competitorsCount: number
) {
  if (!thresholdCompetitor || competitorsCount === 0) {
    return {
      headline: "Capture your first competitor benchmark",
      reason:
        "Run discovery to see which local businesses are currently setting the pace in this market.",
      nextMoves: [
        "Run competitor discovery for this project.",
        "Review the top local businesses that appear most often.",
        "Use the benchmark group to decide how much trust and activity you need to compete.",
      ],
    };
  }

  if (velocity.marketGrowth90d >= 120) {
    return {
      headline: "This market is moving fast",
      reason:
        "The benchmark competitor is gaining reviews quickly, so this market likely needs faster trust-building and stronger ongoing activity.",
      nextMoves: [
        "Treat review growth as a near-term priority.",
        "Compare your business against the benchmark group, not just one competitor.",
        "Re-check discovery often enough to catch fast market changes.",
      ],
    };
  }

  if (velocity.marketGrowth90d >= 60) {
    return {
      headline: "The benchmark group is still pulling ahead",
      reason:
        "Competitors are showing meaningful review growth, which means the market still expects steady trust and activity signals.",
      nextMoves: [
        "Use the benchmark group to set realistic review and authority goals.",
        "Track which competitors keep appearing near the top.",
        "Pair this page with authority and rank to see where the biggest gap is.",
      ],
    };
  }

  return {
    headline: "The benchmark group looks beatable",
    reason:
      "The market is not moving at an extreme pace right now, which means steady trust-building and visibility improvements can still change your position.",
    nextMoves: [
      "Use the benchmark group to define the current local standard.",
      "Focus on the competitors that appear most often and most recently.",
      "Watch for changes in review growth before the market speeds up again.",
    ],
  };
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function HeaderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">{value}</p>
    </div>
  );
}

function MetricStripItem({
  label,
  value,
  bg,
  tone,
  helper,
}: {
  label: string;
  value: string;
  bg: string;
  tone: string;
  helper?: string;
}) {
  return (
    <div className="px-4 py-4" style={{ backgroundColor: bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: tone }}>
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-[var(--text-body)]">{helper}</p> : null}
    </div>
  );
}

function InlineTag({
  children,
  tone,
  bg,
  border,
}: {
  children: ReactNode;
  tone?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: tone ?? "var(--text-body)",
        backgroundColor: bg ?? "transparent",
        borderColor: border ?? "var(--border)",
      }}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p> : null}
    </div>
  );
}

export default function CompetitorsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [dashboardContext, setDashboardContext] = useState<OwnerDashboardContext | null>(null);
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

  const competitorRead = useMemo(() => {
    return buildCompetitorRead(thresholdCompetitor, velocity, competitors.length);
  }, [thresholdCompetitor, velocity, competitors.length]);

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

  async function loadDashboardContext() {
    const res = await fetch(`/api/projects/${projectId}/owner-dashboard`, {
      cache: "no-store",
    });

    const json = (await res.json()) as OwnerDashboardContext;

    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? "Failed to load owner dashboard context.");
    }

    return json;
  }

  async function loadCompetitors() {
    const { data, error } = await supabase
      .from("gbp_competitor_metrics")
      .select(
        "project_id, competitor_domain, place_id, name, competitor_name, rating, total_reviews, last_seen_at"
      )
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
      const [proj, ownerContext] = await Promise.all([
        loadProject(),
        loadDashboardContext(),
      ]);

      if (!proj) {
        setProject(null);
        setCompetitors([]);
        setSnapshotsForThreshold([]);
        setDashboardContext(ownerContext);
        setStatus(
          "I can’t access this project. This usually means you are logged out or Row Level Security is blocking the current user."
        );
        return;
      }

      setProject(proj);
      setDashboardContext(ownerContext);

      const comps = await loadCompetitors();
      setCompetitors(comps);

      const top3Local = comps.slice(0, 3);
      const thresholdLocal = top3Local.length === 3 ? top3Local[1] : top3Local[0] ?? null;

      const snaps = await loadSnapshotsForCompetitor(thresholdLocal ?? null);
      setSnapshotsForThreshold(snaps);
    } catch (error: unknown) {
      setStatus(getErrorMessage(error, "Unknown load error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
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
    } catch (error: unknown) {
      setStatus(`Discovery error: ${getErrorMessage(error, "Unknown error")}`);
    } finally {
      setRunning(false);
    }
  }

  const businessValue = dashboardContext?.projectDisplayName ?? "Not set";
  const domainValue = dashboardContext?.domainDisplayValue ?? "Not set";
  const locationValue =
    dashboardContext?.projectLocationLabel ?? project?.target_metro ?? "Not set";
  const scopeValue = dashboardContext?.pageScopeLabel ?? "Project view";
  const snapshotValue = formatDate(benchmarkUpdatedAt ?? dashboardContext?.capturedAt ?? null);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">Loading competitor page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Competitor center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See who is setting the pace in your market.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page shows which local businesses appear strongest right now, which competitor
                is setting the current benchmark, and how fast the market seems to be moving.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {competitorRead.headline}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {competitorRead.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag tone="var(--brand-600)" bg="var(--brand-100)" border="var(--brand-600)">
                  {project?.primary_category ?? "Category not set"}
                </InlineTag>
                <InlineTag>{locationValue}</InlineTag>
                <InlineTag>
                  Radius: {project?.target_radius_miles != null ? `${project.target_radius_miles} mi` : "—"}
                </InlineTag>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta label="Business" value={businessValue} />
            <HeaderMeta label="Domain" value={domainValue} />
            <HeaderMeta label="Location / Market" value={locationValue} />
            <HeaderMeta label="Scope" value={scopeValue} />
            <HeaderMeta label="Snapshot" value={snapshotValue} />
          </div>
        </section>

        {status ? (
          <section className="border-b border-[var(--border)] py-5">
            <p className="text-sm text-[var(--text-body)]">{status}</p>
          </section>
        ) : null}

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Competitor markers</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="Competitors found"
              value={String(competitors.length)}
              bg="var(--reference-soft)"
              tone="var(--text-strong)"
            />
            <MetricStripItem
              label="Top 3 median reviews"
              value={thresholdReviews ? String(thresholdReviews) : "—"}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Market growth (90d)"
              value={String(velocity.marketGrowth90d)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
              helper={velocity.confidenceLabel}
            />
            <MetricStripItem
              label="Benchmark snapshots"
              value={String(snapshotsForThreshold.length)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to do next</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              Start with the current benchmark group
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              These competitors define the current local standard. Use them to judge how much trust,
              activity, and visibility work your business still needs.
            </p>

            <div className="mt-6">
              {competitorRead.nextMoves.map((item, index) => (
                <article
                  key={item}
                  className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                    index === competitorRead.nextMoves.length - 1
                      ? ""
                      : "border-b border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center md:justify-center">
                    <div
                      className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor:
                          index === 0 ? "var(--brand-700)" : "var(--reference-soft)",
                        color: index === 0 ? "#ffffff" : "var(--text-strong)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                      {item}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                      {index === 0
                        ? "This is the first move most likely to help you understand the current market standard."
                        : "This supports the main market-benchmark read and helps turn competitor data into action."}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Benchmark competitors</SectionLabel>

              {top3.length === 0 ? (
                <div className="mt-4 text-sm text-[var(--text-body)]">
                  No competitors found yet. Run discovery to capture the local market set.
                </div>
              ) : (
                <div className="mt-4">
                  {top3.map((c, idx) => (
                    <article
                      key={c.competitor_domain}
                      className={`grid gap-4 py-6 md:grid-cols-[56px_1fr_auto] md:items-start ${
                        idx === top3.length - 1 ? "" : "border-b border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center md:justify-center">
                        <div
                          className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                          style={{
                            backgroundColor:
                              idx === 0 ? "var(--brand-700)" : "var(--reference-soft)",
                            color: idx === 0 ? "#ffffff" : "var(--text-strong)",
                          }}
                        >
                          {idx + 1}
                        </div>
                      </div>

                      <div className="max-w-3xl">
                        <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                          {shortName(getDisplayName(c))}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                          {c.place_id ?? c.competitor_domain}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <InlineTag>Reviews: {c.total_reviews ?? 0}</InlineTag>
                          <InlineTag>Rating: {c.rating ?? "—"}</InlineTag>
                          {top3.length === 3 && idx === 1 ? (
                            <InlineTag
                              tone="var(--accent-blue-600)"
                              bg="var(--accent-blue-100)"
                              border="var(--accent-blue-600)"
                            >
                              Median benchmark
                            </InlineTag>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-sm text-[var(--text-body)] md:text-right">
                        Last seen: {formatWhen(c.last_seen_at)}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>All discovered competitors</SectionLabel>

              {competitors.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
                  No competitors found yet. Click run discovery to populate this page.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto border border-[var(--border)]">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-body)]">
                        <th className="px-3 py-3 font-medium">Competitor</th>
                        <th className="px-3 py-3 font-medium">Reviews</th>
                        <th className="px-3 py-3 font-medium">Rating</th>
                        <th className="px-3 py-3 font-medium">Domain</th>
                        <th className="px-3 py-3 font-medium">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((c) => (
                        <tr
                          key={c.competitor_domain}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-3 py-3">
                            <div>
                              <p className="font-medium text-[var(--text-strong)]">
                                {getDisplayName(c)}
                              </p>
                              <p className="mt-1 text-xs text-[var(--text-muted)]">
                                {c.place_id ?? c.competitor_domain}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-medium text-[var(--text-strong)]">
                            {c.total_reviews ?? 0}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-body)]">
                            {c.rating ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-body)]">
                            {c.competitor_domain?.startsWith("place_id:")
                              ? "—"
                              : c.competitor_domain ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-[var(--text-body)]">
                            {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>Market velocity</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Growth pace"
                  value={`${velocity.marketGrowth90d} reviews per 90 days`}
                  helper="This is the current benchmark estimate used to describe review growth in the local market."
                />
                <DetailRow
                  label="Confidence"
                  value={velocity.confidenceLabel}
                  helper={
                    velocity.kind === "observed"
                      ? `Observed from +${velocity.observedDeltaReviews} reviews across ${velocity.observedDays} days.`
                      : velocity.note
                  }
                />
                <DetailRow
                  label="Benchmark competitor"
                  value={
                    thresholdCompetitor
                      ? shortName(getDisplayName(thresholdCompetitor))
                      : "Not set"
                  }
                  helper="This is the competitor currently used as the benchmark reference."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Navigation</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/owner`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Back to owner page
                </Link>
                <Link
                  href={`/projects/${projectId}/authority`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View authority page
                </Link>
                <Link
                  href={`/projects/${projectId}/rank`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View rank page
                </Link>
                <Link
                  href={`/projects/${projectId}/actions`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View actions page
                </Link>
                <button
                  onClick={() => {
                    void runDiscovery();
                  }}
                  disabled={running || !authed || !project}
                  className="px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--text-strong)",
                    border: "1px solid var(--text-strong)",
                  }}
                  type="button"
                >
                  {running ? "Running..." : "Run discovery"}
                </button>
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress and proof</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {competitors.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  discovered competitors currently available for this project
                </p>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Top 3 median"
                    value={thresholdReviews ? String(thresholdReviews) : "Not set"}
                  />
                  <HeaderMeta
                    label="Benchmark updated"
                    value={benchmarkUpdatedAt ? formatDate(benchmarkUpdatedAt) : "Not set"}
                  />
                  <HeaderMeta
                    label="Snapshot rows"
                    value={String(snapshotsForThreshold.length)}
                  />
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
