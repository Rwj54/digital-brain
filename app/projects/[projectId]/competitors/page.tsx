"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  return { gap, ruleTargetGain, capacity90d, realistic90dGain, weeklyNeeded };
}

function medianInt(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function pct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function shortName(s: string | null) {
  if (!s) return "—";
  return s.length > 42 ? s.slice(0, 41) + "…" : s;
}

function formatHorizonFromDays(days: number) {
  const safeDays = Math.max(0, Math.round(days));
  const weeks = Math.max(1, Math.ceil(safeDays / 7));
  const months = Math.max(1, Math.ceil(safeDays / 30));
  return { days: safeDays, weeks, months };
}

export default function CompetitorsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [authed, setAuthed] = useState(false);

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

  const benchmarkUpdatedAt = useMemo(() => {
    const latest = snapshotsForThreshold?.[0]?.captured_at ?? null;
    return latest;
  }, [snapshotsForThreshold]);

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
      .select(
        "id, primary_category, target_metro, target_radius_miles, monthly_customer_events, review_conversion_rate"
      )
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

  async function loadInputs() {
    setInputsMessage(null);

    const res = await supabase
      .from("gbp_profiles")
      .select("total_reviews, last_fetched_at, created_at")
      .eq("project_id", projectId)
      .order("last_fetched_at", { ascending: false })
      .limit(1);

    if (res.error) {
      setYourCurrentReviews(null);
      setInputsMessage(`Error: ${res.error.message}`);
      return;
    }

    const row = (res.data ?? [])[0] as any | undefined;
    const reviews = row?.total_reviews;

    if (typeof reviews === "number") {
      setYourCurrentReviews(reviews);
      return;
    }

    const res2 = await supabase
      .from("gbp_profiles")
      .select("total_reviews, last_fetched_at, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (res2.error) {
      setYourCurrentReviews(null);
      setInputsMessage(`Error: ${res2.error.message}`);
      return;
    }

    const row2 = (res2.data ?? [])[0] as any | undefined;
    const reviews2 = row2?.total_reviews;

    if (typeof reviews2 === "number") {
      setYourCurrentReviews(reviews2);
      return;
    }

    setYourCurrentReviews(null);
    setInputsMessage(
      "Note: I couldn’t find your current review count from gbp_profiles. Make sure your GBP profile row has total_reviews."
    );
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
        setYourCurrentReviews(null);
        setInputsMessage(null);
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

      await loadInputs();
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

  const progress = useMemo(() => {
    if (yourCurrentReviews == null) return null;
    if (thresholdReviews <= 0) return null;

    const pctDone = pct((yourCurrentReviews / thresholdReviews) * 100);
    const remaining = Math.max(0, thresholdReviews - yourCurrentReviews);

    return { pctDone, remaining };
  }, [yourCurrentReviews, thresholdReviews]);

  const parity = useMemo(() => {
    if (yourCurrentReviews == null) return null;
    if (thresholdReviews <= 0) return null;

    const gapToToday = Math.max(0, thresholdReviews - yourCurrentReviews);

    // already at/above median
    if (gapToToday === 0) {
      return {
        gapToToday,
        status: "at_or_above" as const,
        static: null as null | { days: number; weeks: number; months: number },
        moving: null as null | { days: number; weeks: number; months: number },
        net90d: null as null | number,
      };
    }

    const your90d = finalTarget90d ?? 0;
    if (your90d <= 0) {
      return {
        gapToToday,
        status: "no_pace" as const,
        static: null,
        moving: null,
        net90d: null,
      };
    }

    // Static: reach today's benchmark (median doesn't move)
    const yourPerDay = your90d / 90;
    const staticDays = Math.ceil(gapToToday / yourPerDay);
    const staticH = formatHorizonFromDays(staticDays);

    // Moving: benchmark grows by observed market growth
    const market90d = Math.max(0, velocity.marketGrowth90d);
    const net90d = your90d - market90d;

    if (net90d <= 0) {
      return {
        gapToToday,
        status: "market_faster" as const,
        static: staticH,
        moving: null,
        net90d,
      };
    }

    const netPerDay = net90d / 90;
    const movingDays = Math.ceil(gapToToday / netPerDay);
    const movingH = formatHorizonFromDays(movingDays);

    return {
      gapToToday,
      status: "ok" as const,
      static: staticH,
      moving: movingH,
      net90d,
    };
  }, [yourCurrentReviews, thresholdReviews, finalTarget90d, velocity.marketGrowth90d]);

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
          disabled={running || !authed || !project}
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

      {/* Market velocity */}
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

      {/* Review gap & 90-day target */}
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
            disabled={!authed || !project}
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

        {/* Review position (clarified) */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Your review position (vs local competitors)</div>
              <div className="text-xs text-gray-600 mt-0.5">
                Benchmark = <span className="font-medium">median</span> review count of the{" "}
                <span className="font-medium">top 3 discovered competitors</span> (more stable than using the #1 outlier).
              </div>

              <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-2 py-1">
                <span className="text-xs font-semibold text-gray-900">Updated nightly</span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs font-semibold text-gray-800">
                  {benchmarkUpdatedAt
                    ? `Benchmark snapshot: ${new Date(benchmarkUpdatedAt).toLocaleString()}`
                    : "Benchmark snapshot: —"}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-700 tabular-nums shrink-0 pt-0.5">
              {yourCurrentReviews ?? "—"} / {thresholdReviews}
            </div>
          </div>

          {progress ? (
            <>
              <div className="mt-2 h-3 w-full rounded-full bg-white border border-gray-200 overflow-hidden">
                <div className="h-full bg-black" style={{ width: `${progress.pctDone}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <div>{Math.round(progress.pctDone)}% of benchmark</div>
                <div>{progress.remaining} reviews to reach the median</div>
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-gray-600">
              Progress will appear once your reviews and competitors are loaded.
            </div>
          )}

          {/* Show the actual top 3 used */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-700">Top 3 competitors used</div>
            {top3.length === 0 ? (
              <div className="text-xs text-gray-600 mt-1">—</div>
            ) : (
              <ul className="mt-1 space-y-1">
                {top3.map((c, idx) => (
                  <li
                    key={c.competitor_domain}
                    className="flex items-center justify-between text-xs text-gray-700"
                  >
                    <span className="truncate pr-3">
                      {idx + 1}. {shortName(c.name)}
                      {top3.length === 3 && idx === 1 ? (
                        <span className="ml-2 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                          median benchmark
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums font-medium">{c.total_reviews ?? 0}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Your current reviews</div>
            <div className="text-lg font-semibold">{yourCurrentReviews ?? "—"}</div>
            <div className="text-xs text-gray-500">From latest GBP snapshot</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Top 3 median reviews</div>
            <div className="text-lg font-semibold">{thresholdReviews}</div>
            <div className="text-xs text-gray-500">Benchmark (median of top 3)</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Review gap</div>
            <div className="text-lg font-semibold">
              {yourCurrentReviews == null ? "—" : reviewModel.gap}
            </div>
            <div className="text-xs text-gray-500">Benchmark − you</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Realistic target (90d)</div>
            <div className="text-lg font-semibold">{finalTarget90d ?? "—"}</div>
            <div className="text-xs text-gray-500">Market + capacity constrained</div>
          </div>
        </div>

        {/* Time-to-parity projection */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Time-to-parity projection</div>
              <div className="text-xs text-gray-600 mt-0.5">
                Based on your <span className="font-medium">realistic 90-day target pace</span>. “Moving market” assumes
                competitors keep gaining reviews at the current market velocity.
              </div>
            </div>
            <div className="text-xs text-gray-700 tabular-nums">
              Gap: {parity?.gapToToday ?? "—"}
            </div>
          </div>

          {!parity ? (
            <div className="mt-2 text-xs text-gray-600">
              Projection will appear once your reviews and competitors are loaded.
            </div>
          ) : parity.status === "at_or_above" ? (
            <div className="mt-2 text-sm text-gray-800">
              ✅ You’re already at or above the median benchmark.
            </div>
          ) : parity.status === "no_pace" ? (
            <div className="mt-2 text-sm text-gray-800">
              ⚠️ Time-to-parity can’t be calculated because your 90-day target is 0 (capacity or inputs may be too low).
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white border border-gray-200 p-3">
                <div className="text-xs text-gray-500">To reach today’s median (benchmark stays still)</div>
                {parity.static ? (
                  <div className="mt-1">
                    <div className="text-lg font-semibold">~{parity.static.weeks} weeks</div>
                    <div className="text-xs text-gray-500">
                      (~{parity.static.months} months • {parity.static.days} days)
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-700">—</div>
                )}
              </div>

              <div className="rounded-lg bg-white border border-gray-200 p-3">
                <div className="text-xs text-gray-500">To catch up in a moving market</div>
                {parity.status === "market_faster" ? (
                  <div className="mt-1">
                    <div className="text-lg font-semibold">Not reachable (at current pace)</div>
                    <div className="text-xs text-gray-500">
                      Your 90d pace: {finalTarget90d ?? 0} • Market 90d growth: {velocity.marketGrowth90d} • Net:{" "}
                      {parity.net90d ?? 0}
                    </div>
                  </div>
                ) : parity.moving ? (
                  <div className="mt-1">
                    <div className="text-lg font-semibold">~{parity.moving.weeks} weeks</div>
                    <div className="text-xs text-gray-500">
                      (~{parity.moving.months} months • {parity.moving.days} days)
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Net gain (you − market) per 90d: {parity.net90d}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-700">—</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discovered competitors */}
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