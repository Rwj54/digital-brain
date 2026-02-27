"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BUILD_TAG = "PHASE_2C_COMPETITORS__2026-02-27__TAG_001";

type Project = {
  id: string;
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
    }
  | {
      kind: "estimated";
      confidenceLabel: EstimatedLabel;
      marketGrowth90d: number;
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
  topCompetitor: CompetitorMetric | null,
  snapshotsDesc: CompetitorSnapshot[]
): VelocityResult {
  const estimated: VelocityResult = {
    kind: "estimated",
    confidenceLabel: "Estimated",
    marketGrowth90d: clampInt(((topCompetitor?.total_reviews ?? 0) * 0.06) / 1, 12, 180),
  };

  if (!topCompetitor) return estimated;
  if (!snapshotsDesc.length) return estimated;

  const latest = snapshotsDesc[0];
  if (latest.total_reviews == null) return estimated;

  const horizons: Array<{
    h: 90 | 30 | 14;
    label: ObservedLabel;
    maxDaysAway: number;
  }> = [
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
    };
  }

  return estimated;
}

function computeCapacityAwareTargets90d(args: {
  yourReviews: number;
  topCompetitorReviews: number;
  monthlyCustomerEvents: number;
  reviewConversionRate: number; // 0..1
}) {
  const gap = Math.max(0, args.topCompetitorReviews - args.yourReviews);
  const closePct = gap > 100 ? 0.25 : 0.5;
  const ruleTargetGain = Math.ceil(gap * closePct);

  const expectedPerMonth = args.monthlyCustomerEvents * args.reviewConversionRate;
  const capacity90d = Math.floor(expectedPerMonth * 3);

  const realisticTarget90d = Math.max(0, Math.min(ruleTargetGain, capacity90d));
  const weeklyNeeded = Math.ceil(realisticTarget90d / 13);

  return { gap, ruleTargetGain, capacity90d, realisticTarget90d, weeklyNeeded };
}

export default function CompetitorsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorMetric[]>([]);
  const [snapshotsForTop, setSnapshotsForTop] = useState<CompetitorSnapshot[]>([]);

  const [yourCurrentReviews, setYourCurrentReviews] = useState<number | null>(null);
  const [inputsError, setInputsError] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const topCompetitor = competitors[0] ?? null;

  async function loadProject() {
    const { data, error } = await supabase
      .from("projects")
      .select("id, monthly_customer_events, review_conversion_rate")
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

  async function loadSnapshotsForTopCompetitor(top: CompetitorMetric | null) {
    if (!top) return [];

    const { data, error } = await supabase
      .from("gbp_competitor_snapshots")
      .select("project_id, competitor_domain, total_reviews, captured_at")
      .eq("project_id", projectId)
      .eq("competitor_domain", top.competitor_domain)
      .order("captured_at", { ascending: false })
      .limit(400);

    if (error) return [];
    return (data as CompetitorSnapshot[]) ?? [];
  }

  async function loadInputs() {
    setInputsError(null);

    const { data, error } = await supabase
      .from("gbp_profiles")
      .select("total_reviews, captured_at")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .limit(1);

    if (error) {
      setYourCurrentReviews(null);
      setInputsError(`Error: ${error.message}`);
      return;
    }

    const row = (data ?? [])[0] as any | undefined;
    const reviews = row?.total_reviews;

    if (typeof reviews === "number") {
      setYourCurrentReviews(reviews);
    } else {
      setYourCurrentReviews(null);
      setInputsError(
        "Note: I couldn’t find your current review count from gbp_profiles. Add/confirm your latest GBP snapshot so targets are accurate."
      );
    }
  }

  async function refreshAll() {
    setLoading(true);
    try {
      const [proj, comps] = await Promise.all([loadProject(), loadCompetitors()]);
      setProject(proj);
      setCompetitors(comps);

      const snaps = await loadSnapshotsForTopCompetitor(comps[0] ?? null);
      setSnapshotsForTop(snaps);

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
    return computeVelocityAutoUpgrade(topCompetitor, snapshotsForTop);
  }, [topCompetitor, snapshotsForTop]);

  const catchUpFactor = 0.35;
  const marketBasedTarget90d = Math.max(0, Math.ceil(velocity.marketGrowth90d * catchUpFactor));

  const reviewModel = useMemo(() => {
    return computeCapacityAwareTargets90d({
      yourReviews: yourCurrentReviews ?? 0,
      topCompetitorReviews: topCompetitor?.total_reviews ?? 0,
      monthlyCustomerEvents: project?.monthly_customer_events ?? 0,
      reviewConversionRate: project?.review_conversion_rate ?? 0,
    });
  }, [yourCurrentReviews, topCompetitor, project]);

  const finalTarget90d =
    yourCurrentReviews == null
      ? null
      : Math.min(reviewModel.realisticTarget90d, marketBasedTarget90d);

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
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Build tag: <span className="font-mono font-semibold">{BUILD_TAG}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <div className="text-sm text-gray-500">
            Google Maps competitor discovery (DataForSEO). Sorted by total reviews.
          </div>
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
          <div className="text-sm font-semibold">Review gap & 90-day target</div>
          <button onClick={loadInputs} className="text-sm underline text-gray-700 hover:text-black">
            Refresh inputs
          </button>
        </div>

        {inputsError && <div className="mt-3 text-sm text-red-600">{inputsError}</div>}

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Your current reviews</div>
            <div className="text-xl font-semibold">{yourCurrentReviews ?? "—"}</div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Top competitor reviews</div>
            <div className="text-xl font-semibold">{topCompetitor?.total_reviews ?? 0}</div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">Realistic target (90d)</div>
            <div className="text-xl font-semibold">{finalTarget90d ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}