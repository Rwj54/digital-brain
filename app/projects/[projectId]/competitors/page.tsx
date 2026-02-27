"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  primary_category: string | null;
  target_metro: string | null;
  target_radius_miles: number | null;
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
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
    marketGrowth90d: clampInt(((competitorForVelocity?.total_reviews ?? 0) * 0.06) / 1, 12, 180),
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

function computeCapacityAwareTargets90d(args: {
  yourReviews: number;
  thresholdCompetitorReviews: number;
  monthlyCustomerEvents: number;
  reviewConversionRate: number; // 0..1
}) {
  const gap = Math.max(0, args.thresholdCompetitorReviews - args.yourReviews);

  const closePct = gap > 100 ? 0.25 : 0.5;
  const ruleTargetGain = Math.ceil(gap * closePct);

  const expectedPerMonth = args.monthlyCustomerEvents * args.reviewConversionRate;
  const capacity90d = Math.floor(expectedPerMonth * 3);

  const realistic90dGain = Math.max(0, Math.min(ruleTargetGain, capacity90d));
  const weeklyNeeded = Math.ceil(realistic90dGain / 13);

  const timeToCloseFullGapDays =
    expectedPerMonth > 0 ? Math.ceil((gap / expectedPerMonth) * 30) : null;

  return {
    gap,
    ruleTargetGain,
    capacity90d,
    realistic90dGain,
    weeklyNeeded,
    timeToCloseFullGapDays,
  };
}

function medianInt(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export default function CompetitorsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorMetric[]>([]);
  const [snapshotsForThreshold, setSnapshotsForThreshold] = useState<CompetitorSnapshot[]>([]);

  const [yourCurrentReviews, setYourCurrentReviews] = useState<number | null>(null);
  const [inputsMessage, setInputsMessage] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const top3 = useMemo(() => competitors.slice(0, 3), [competitors]);

  const thresholdCompetitor = useMemo(() => {
    if (top3.length === 0) return null;
    const idx = top3.length === 3 ? 1 : 0;
    return top3[idx] ?? null;
  }, [top3]);

  const thresholdReviews = useMemo(() => {
    const vals = top3.map((c) => c.total_reviews ?? 0).filter((n) => Number.isFinite(n));
    if (!vals.length) return 0;
    return medianInt(vals);
  }, [top3]);

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, primary_category, target_metro, target_radius_miles, monthly_customer_events, review_conversion_rate"
      )
      .eq("id", projectId)
      .limit(1);

    if (error) throw new Error(`Project load failed: ${error.message}`);
    const row = (data ?? [])[0] as Project | undefined;
    if (!row) throw new Error("Project not found (0 rows).");
    return row;
  }

  async function loadCompetitors() {
    const { data, error } = await supabase
      .from("gbp_competitor_metrics")
      .select("project_id, competitor_domain, place_id, name, rating, total_reviews, last_seen_at")
      .eq("project_id", projectId);

    if (error) throw new Error(`Competitors load failed: ${error.message}`);

    const sorted = (data as CompetitorMetric[]).slice().sort((a, b) => {
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

  /**
   * ✅ Resilient "latest GBP snapshot" fetch:
   * Some installs use created_at or updated_at instead of captured_at.
   */
  async function loadInputs() {
    setInputsMessage(null);

    const orderCandidates = ["captured_at", "created_at", "updated_at"] as const;

    for (const col of orderCandidates) {
      const { data, error } = await supabase
        .from("gbp_profiles")
        .select("total_reviews")
        .eq("project_id", projectId)
        .order(col, { ascending: false })
        .limit(1);

      if (error) {
        // If this column doesn't exist, try the next candidate.
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("does not exist") && msg.includes(col)) continue;

        // Otherwise, it's a real error (RLS, permissions, etc.)
        setYourCurrentReviews(null);
        setInputsMessage(`Error: ${error.message}`);
        return;
      }

      const row = (data ?? [])[0] as any | undefined;
      const reviews = row?.total_reviews;

      if (typeof reviews === "number") {
        setYourCurrentReviews(reviews);
        return;
      }

      // Column exists, but no usable reviews yet
      setYourCurrentReviews(null);
      setInputsMessage(
        "Note: I couldn’t find your current review count from gbp_profiles. Add/confirm your latest GBP snapshot so targets are accurate."
      );
      return;
    }

    // None of the timestamp columns exist (or table is non-standard)
    const { data, error } = await supabase
      .from("gbp_profiles")
      .select("total_reviews")
      .eq("project_id", projectId)
      .limit(1);

    if (error) {
      setYourCurrentReviews(null);
      setInputsMessage(`Error: ${error.message}`);
      return;
    }

    const row = (data ?? [])[0] as any | undefined;
    const reviews = row?.total_reviews;

    if (typeof reviews === "number") {
      setYourCurrentReviews(reviews);
      return;
    }

    setYourCurrentReviews(null);
    setInputsMessage(
      "Note: I couldn’t find your current review count from gbp_profiles. Add/confirm your latest GBP snapshot so targets are accurate."
    );
  }

  async function refreshAll() {
    setLoading(true);
    setStatus(null);

    try {
      const [proj, comps] = await Promise.all([loadProject(), loadCompetitors()]);
      setProject(proj);
      setCompetitors(comps);

      const top3Local = comps.slice(0, 3);
      const thresholdLocal = top3Local.length === 3 ? top3Local[1] : top3Local[0] ?? null;

      const snaps = await loadSnapshotsForCompetitor(thresholdLocal ?? null);
      setSnapshotsForThreshold(snaps);

      await loadInputs();
    } catch (e: any) {
      setStatus(e?.message ?? "Unknown load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const velocity = useMemo(() => {
    return computeVelocityAutoUpgrade(thresholdCompetitor, snapshotsForThreshold);
  }, [thresholdCompetitor, snapshotsForThreshold]);

  const catchUpFactor = 0.35;
  const marketBasedTarget90d = Math.max(0, Math.ceil(velocity.marketGrowth90d * catchUpFactor));

  const reviewModel = useMemo(() => {
    return computeCapacityAwareTargets90d({
      yourReviews: yourCurrentReviews ?? 0,
      thresholdCompetitorReviews: thresholdReviews,
      monthlyCustomerEvents: project?.monthly_customer_events ?? 0,
      reviewConversionRate: project?.review_conversion_rate ?? 0,
    });
  }, [yourCurrentReviews, thresholdReviews, project]);

  const finalTarget90d =
    yourCurrentReviews == null ? null : Math.min(reviewModel.realistic90dGain, marketBasedTarget90d);

  async function runDiscovery() {
    setRunning(true);
    setStatus("Running discovery…");

    try {
      const res = await fetch(`/api/projects/${projectId}/discover-competitors`, { method: "POST" });
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

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <div className="text-sm text-gray-500">
            Google Maps competitor discovery (DataForSEO). Sorted by total reviews.
          </div>
          {project && (
            <div className="text-xs text-gray-500 mt-1">
              {project.primary_category ?? "Category"} • {project.target_metro ?? "Metro"} •{" "}
              {project.target_radius_miles ?? "—"} mi
            </div>
          )}
        </div>

        <button
          onClick={runDiscovery}
          disabled={running}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-60"
        >
          {running ? "Running…" : "Run discovery"}
        </button>
      </div>

      {status && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {status}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Market velocity</div>
          <div className="text-xs text-gray-500">
            {velocity.confidenceLabel} • Automatically improves as nightly snapshots accumulate.
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Market growth (90d)</div>
            <div className="text-lg font-semibold">{velocity.marketGrowth90d}</div>
            {velocity.kind === "observed" ? (
              <div className="text-xs text-gray-500">
                +{velocity.observedDeltaReviews} over {velocity.observedDays}d
              </div>
            ) : (
              <div className="text-xs text-gray-500">{velocity.note}</div>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Market-based target (90d)</div>
            <div className="text-lg font-semibold">{marketBasedTarget90d}</div>
            <div className="text-xs text-gray-500">Catch-up factor applied</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Confidence</div>
            <div className="text-lg font-semibold">{velocity.confidenceLabel}</div>
            <div className="text-xs text-gray-500">Will upgrade over time</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Using <span className="font-medium">Top 3 median</span> competitor for stability.
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Review gap & 90-day target</div>
            <div className="text-xs text-gray-500">
              Final target = min(rule target, market target, capacity).
            </div>
          </div>

          <button
            onClick={loadInputs}
            className="text-sm underline text-gray-700 hover:text-black"
            type="button"
          >
            Refresh inputs
          </button>
        </div>

        {inputsMessage && (
          <div
            className={`mt-3 text-sm ${
              inputsMessage.startsWith("Error:") ? "text-red-600" : "text-orange-600"
            }`}
          >
            {inputsMessage}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Your current reviews</div>
            <div className="text-lg font-semibold">{yourCurrentReviews ?? "—"}</div>
            <div className="text-xs text-gray-500">From latest GBP snapshot</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Top 3 median reviews</div>
            <div className="text-lg font-semibold">{thresholdReviews}</div>
            <div className="text-xs text-gray-500">Stable benchmark</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Review gap</div>
            <div className="text-lg font-semibold">
              {yourCurrentReviews == null ? "—" : reviewModel.gap}
            </div>
            <div className="text-xs text-gray-500">Top 3 median − you</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Realistic target (90d)</div>
            <div className="text-lg font-semibold">{finalTarget90d ?? "—"}</div>
            <div className="text-xs text-gray-500">Market + capacity constrained</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold">Discovered competitors</div>

        {competitors.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">
            No competitors found yet. Click <span className="font-medium">Run discovery</span>.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Reviews</th>
                  <th className="py-2 pr-4">Rating</th>
                  <th className="py-2 pr-4">Domain</th>
                  <th className="py-2 pr-4">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c) => (
                  <tr key={c.competitor_domain} className="border-t border-gray-100">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{c.name ?? "—"}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[420px]">
                        {c.place_id ?? c.competitor_domain}
                      </div>
                    </td>
                    <td className="py-2 pr-4 font-medium">{c.total_reviews ?? 0}</td>
                    <td className="py-2 pr-4">{c.rating ?? "—"}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {c.competitor_domain?.startsWith("place_id:") ? "—" : c.competitor_domain ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-700">
                      {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="h-10" />
    </div>
  );
}