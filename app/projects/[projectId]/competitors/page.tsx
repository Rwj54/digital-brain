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

type ActionItem = {
  title: string;
  priority: "High" | "Medium" | "Low";
  why: string;
  nextStep: string;
  metric?: string;
};

type TabKey = "overview" | "market" | "strategy" | "actions" | "data";

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

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function buildActionPlan(args: {
  authed: boolean;
  yourCurrentReviews: number | null;
  thresholdReviews: number;
  finalTarget90d: number | null;
  reviewModel: {
    gap: number;
    ruleTargetGain: number;
    capacity90d: number;
    realistic90dGain: number;
    weeklyNeeded: number;
  };
  velocity: VelocityResult;
  project: Project | null;
}) {
  const items: ActionItem[] = [];

  const monthlyCustomerEvents = args.project?.monthly_customer_events ?? 0;
  const reviewConversionRate = args.project?.review_conversion_rate ?? 0;

  const market90d = Math.max(0, args.velocity.marketGrowth90d);
  const your90d = args.finalTarget90d ?? 0;
  const net90d = your90d - market90d;

  const missingInputs =
    !args.authed ||
    args.yourCurrentReviews == null ||
    args.thresholdReviews <= 0 ||
    args.project == null;

  if (missingInputs) {
    items.push({
      title: "Fix inputs so the plan is accurate",
      priority: "High",
      why: "Action Plan needs your review count, competitors, and capacity inputs. Right now something is missing.",
      nextStep:
        "Click “Refresh inputs”, then run discovery if competitors are empty. Also confirm monthly customer events and review conversion rate are set.",
    });
    return items;
  }

  const weekly = Math.max(0, args.reviewModel.weeklyNeeded);
  const cap90 = args.reviewModel.capacity90d;

  items.push({
    title: "Build a simple review capture system (90-day sprint)",
    priority: "High",
    why: `Your realistic 90-day target is ${args.finalTarget90d ?? 0} reviews. That requires about ${weekly}/week.`,
    nextStep:
      "After every completed job, send a text/email asking for a Google review within 24 hours. Follow up once after 48–72 hours if no response.",
    metric: `Target: ~${weekly}/week`,
  });

  if (net90d <= 0) {
    items.push({
      title: "Increase review conversion rate (market is moving faster)",
      priority: "High",
      why: `Market adds ~${market90d} reviews per 90 days. You add ~${your90d}. Net = ${net90d}.`,
      nextStep:
        "Improve conversion: ask in-person + send link by text, use a short script, train staff, and make the ask part of checkout/closeout. If possible, increase monthly customer volume.",
      metric: `Capacity (90d): ${cap90}`,
    });
  } else {
    items.push({
      title: "Stay consistent (you’re outpacing the market)",
      priority: "Medium",
      why: `You gain ~${your90d} per 90 days while the market gains ~${market90d}. Net = +${net90d}.`,
      nextStep: "Keep the review ask consistent every week. Consistency beats bursts.",
      metric: `Net gain (90d): +${net90d}`,
    });
  }

  items.push({
    title: "Verify Google Business Profile category alignment",
    priority: "High",
    why: "Category match is a major Maps ranking factor. A mismatch can block you from the right searches.",
    nextStep:
      "Confirm your primary category is the best match for your main service. Add only true secondary categories.",
  });

  items.push({
    title: "Respond to reviews weekly (trust + conversion)",
    priority: "Medium",
    why: "Owner responses increase trust and can improve conversions from views → calls/visits.",
    nextStep:
      "Respond to every review weekly. Thank positives. For negatives: apologize, offer a fix, keep it short and calm.",
  });

  items.push({
    title: "Increase photo + post cadence (engagement signals)",
    priority: "Medium",
    why: "Fresh activity increases engagement signals that correlate with Maps performance.",
    nextStep: "Add 5–10 new photos per month and post once per week (offer, update, or featured service).",
  });

  items.push({
    title: "Website: strengthen local signals + AI discoverability",
    priority: "Low",
    why: "Your website supports Maps + organic. Clear business + geo signals help both Google and AI search.",
    nextStep:
      "Confirm NAP consistency, clear service area text, internal links to key pages, an FAQ section, and LocalBusiness structured data (schema).",
  });

  if (monthlyCustomerEvents > 0) {
    const expectedPerMonth = monthlyCustomerEvents * reviewConversionRate;
    items.push({
      title: "Sanity check your capacity inputs",
      priority: "Low",
      why: `Based on your inputs: ${monthlyCustomerEvents}/mo × ${Math.round(
        reviewConversionRate * 100
      )}% ≈ ${Math.round(expectedPerMonth)} reviews/mo potential.`,
      nextStep:
        "If that feels wrong, update monthly customer events and review conversion rate so targets match reality.",
    });
  }

  return items;
}

function prioritySort(p: ActionItem["priority"]) {
  if (p === "High") return 0;
  if (p === "Medium") return 1;
  return 2;
}

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");

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

    const yourPerDay = your90d / 90;
    const staticDays = Math.ceil(gapToToday / yourPerDay);
    const staticH = formatHorizonFromDays(staticDays);

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

  const annual = useMemo(() => {
    if (yourCurrentReviews == null) return null;
    if (thresholdReviews <= 0) return null;

    const gapToday = Math.max(0, thresholdReviews - yourCurrentReviews);

    const your90d = finalTarget90d ?? 0;
    const market90d = Math.max(0, velocity.marketGrowth90d);

    const yourAnnual = your90d * 4;
    const marketAnnual = market90d * 4;
    const netAnnual = yourAnnual - marketAnnual;

    const projectedYou = yourCurrentReviews + yourAnnual;
    const projectedBenchmark = thresholdReviews + marketAnnual;

    const projectedGap = Math.max(0, projectedBenchmark - projectedYou);

    return {
      gapToday,
      yourAnnual,
      marketAnnual,
      netAnnual,
      projectedYou,
      projectedBenchmark,
      projectedGap,
      parityReachableInYear: netAnnual >= gapToday,
    };
  }, [yourCurrentReviews, thresholdReviews, finalTarget90d, velocity.marketGrowth90d]);

  const actionPlan = useMemo(() => {
    return buildActionPlan({
      authed,
      yourCurrentReviews,
      thresholdReviews,
      finalTarget90d,
      reviewModel,
      velocity,
      project,
    });
  }, [authed, yourCurrentReviews, thresholdReviews, finalTarget90d, reviewModel, velocity, project]);

  const topPriorities = useMemo(() => {
    const sorted = actionPlan.slice().sort((a, b) => prioritySort(a.priority) - prioritySort(b.priority));
    return sorted.slice(0, 5);
  }, [actionPlan]);

  const navTabs: Array<{ key: TabKey; label: string; desc: string }> = [
    { key: "overview", label: "Overview", desc: "What matters most right now" },
    { key: "market", label: "Market", desc: "Competitors + velocity" },
    { key: "strategy", label: "Strategy", desc: "Plain-English findings" },
    { key: "actions", label: "Action Plan", desc: "Numbered steps" },
    { key: "data", label: "Data", desc: "Inputs + calculations" },
  ];

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
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Digital Brain</div>
            <h1 className="text-lg md:text-xl font-semibold truncate">Project Dashboard</h1>
            {project ? (
              <div className="text-xs text-gray-500 mt-0.5">
                {project.primary_category ?? "Category"} • {project.target_metro ?? "Metro"} •{" "}
                {project.target_radius_miles ?? "—"} mi
              </div>
            ) : null}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={loadInputs}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
              type="button"
              disabled={!authed || !project}
            >
              Refresh inputs
            </button>

            <button
              onClick={runDiscovery}
              disabled={running || !authed || !project}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-60"
            >
              {running ? "Running…" : "Run discovery"}
            </button>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {status ? (
        <div className="mx-auto max-w-7xl px-4 md:px-6 mt-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {status}
          </div>
        </div>
      ) : null}

      {/* Layout: sidebar (desktop) + content */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 mt-4 pb-24 md:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
          {/* Sidebar (desktop) */}
          <div className="hidden md:block">
            <div className="sticky top-[76px] space-y-2">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">Navigation</div>
                <div className="mt-2 space-y-1">
                  {navTabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`w-full text-left rounded-lg px-3 py-2 border ${
                        activeTab === t.key
                          ? "border-gray-300 bg-gray-50"
                          : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                      }`}
                      type="button"
                    >
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-xs text-gray-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">Updated nightly</div>
                <div className="text-sm font-semibold mt-1">
                  {benchmarkUpdatedAt ? formatWhen(benchmarkUpdatedAt) : "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Benchmark snapshot (Top 3 median competitor)
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-4">
            {/* Inputs message */}
            {inputsMessage ? (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  inputsMessage.startsWith("Error:")
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-orange-200 bg-orange-50 text-orange-700"
                }`}
              >
                {inputsMessage}
              </div>
            ) : null}

            {/* OVERVIEW */}
            {activeTab === "overview" ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Overview</div>
                      <div className="text-xs text-gray-500 mt-1">
                        A simple summary based on your market data and realistic capacity.
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 tabular-nums">
                      Target (90d): {finalTarget90d ?? "—"}
                    </div>
                  </div>

                  {/* Review position */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Your review position</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Benchmark = <span className="font-medium">median</span> review count of the{" "}
                          <span className="font-medium">top 3 discovered competitors</span>.
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 tabular-nums">
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
                  </div>

                  {/* Key stats */}
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Review gap</div>
                      <div className="text-lg font-semibold">
                        {yourCurrentReviews == null ? "—" : reviewModel.gap}
                      </div>
                      <div className="text-xs text-gray-500">Benchmark − you</div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Weekly requirement</div>
                      <div className="text-lg font-semibold">
                        {yourCurrentReviews == null ? "—" : reviewModel.weeklyNeeded}
                      </div>
                      <div className="text-xs text-gray-500">To hit 90-day target</div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Market growth (90d)</div>
                      <div className="text-lg font-semibold">{velocity.marketGrowth90d}</div>
                      <div className="text-xs text-gray-500">{velocity.confidenceLabel}</div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Capacity (90d)</div>
                      <div className="text-lg font-semibold">{reviewModel.capacity90d}</div>
                      <div className="text-xs text-gray-500">From your inputs</div>
                    </div>
                  </div>

                  {/* Time-to-parity */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Time-to-parity</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          “Moving market” assumes competitors keep gaining reviews at the current market velocity.
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
                      <div className="mt-2 text-sm text-gray-800">✅ You’re already at or above the benchmark.</div>
                    ) : parity.status === "no_pace" ? (
                      <div className="mt-2 text-sm text-gray-800">
                        ⚠️ Can’t calculate because your 90-day target is 0 (capacity or inputs may be too low).
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="text-xs text-gray-500">To reach today’s median (static)</div>
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
                                Your 90d: {finalTarget90d ?? 0} • Market 90d: {velocity.marketGrowth90d} • Net:{" "}
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

                  {/* Annual */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Annual outlook</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Uses your 90-day realistic pace × 4. Market assumes current velocity continues.
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 tabular-nums">Starting gap: {annual?.gapToday ?? "—"}</div>
                    </div>

                    {!annual ? (
                      <div className="mt-2 text-xs text-gray-600">
                        Projection will appear once your reviews and competitors are loaded.
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="text-xs text-gray-500">Projected gains (12 months)</div>
                          <div className="mt-1 text-sm text-gray-800">
                            <div className="flex items-center justify-between">
                              <span>Your gain</span>
                              <span className="font-semibold tabular-nums">{annual.yourAnnual}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span>Market gain</span>
                              <span className="font-semibold tabular-nums">{annual.marketAnnual}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span>Net (you − market)</span>
                              <span className="font-semibold tabular-nums">{annual.netAnnual}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="text-xs text-gray-500">Projected position (12 months)</div>
                          <div className="mt-1 text-sm text-gray-800">
                            <div className="flex items-center justify-between">
                              <span>You</span>
                              <span className="font-semibold tabular-nums">{annual.projectedYou}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span>Benchmark</span>
                              <span className="font-semibold tabular-nums">{annual.projectedBenchmark}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span>Gap after 12 months</span>
                              <span className="font-semibold tabular-nums">{annual.projectedGap}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="text-xs text-gray-500">Parity outlook</div>
                          <div className="mt-1">
                            {annual.parityReachableInYear ? (
                              <div className="text-sm font-semibold text-gray-900">✅ Reachable in ~12 months</div>
                            ) : (
                              <div className="text-sm font-semibold text-gray-900">⚠️ Not reachable at current pace</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              This will self-correct as velocity upgrades from snapshots.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top priorities */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Top priorities (next 90 days)</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Generated from your gap, your realistic capacity, and your market velocity.
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("actions")}
                        className="text-sm underline text-gray-700 hover:text-black"
                        type="button"
                      >
                        View full Action Plan
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {topPriorities.map((a, idx) => (
                        <div key={`${a.title}-${idx}`} className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {idx + 1}. {a.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{a.why}</div>
                            </div>
                            <span className="shrink-0 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700">
                              {a.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      This plan follows widely accepted Google Business Profile + local SEO best practices (not a Google
                      guarantee), combined with your market data and realistic capacity.
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {/* MARKET */}
            {activeTab === "market" ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Market & competitors</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Competitor discovery is based on Google Maps results (DataForSEO). Sorted by total reviews.
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 tabular-nums">
                      Updated nightly: {benchmarkUpdatedAt ? formatWhen(benchmarkUpdatedAt) : "—"}
                    </div>
                  </div>

                  {/* Market velocity */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Market velocity</div>
                      <div className="text-xs text-gray-500">
                        {velocity.confidenceLabel} • Improves automatically as snapshots accumulate.
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-white border border-gray-200 p-3">
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

                      <div className="rounded-lg bg-white border border-gray-200 p-3">
                        <div className="text-xs text-gray-500">Market-based target (90d)</div>
                        <div className="text-lg font-semibold">{marketBasedTarget90d}</div>
                        <div className="text-xs text-gray-500">Catch-up factor applied</div>
                      </div>

                      <div className="rounded-lg bg-white border border-gray-200 p-3">
                        <div className="text-xs text-gray-500">Benchmark</div>
                        <div className="text-lg font-semibold">{thresholdReviews}</div>
                        <div className="text-xs text-gray-500">Top 3 median reviews</div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Benchmark uses <span className="font-medium">Top 3 median</span> to avoid #1 outlier distortion.
                    </div>
                  </div>

                  {/* Competitors */}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-sm font-semibold">Discovered competitors</div>
                    <div className="text-xs text-gray-500 mt-1">
                      These are competitors Google surfaces in your target area for your category.
                    </div>

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
                                  {c.competitor_domain?.startsWith("place_id:")
                                    ? "—"
                                    : c.competitor_domain ?? "—"}
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

                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-700">Top 3 used for benchmark</div>
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
                </div>
              </>
            ) : null}

            {/* STRATEGY */}
            {activeTab === "strategy" ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold">Strategy summary</div>
                  <div className="text-xs text-gray-500 mt-1">
                    A concise explanation of what we found and what it means.
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">What Google sees</div>
                      <div className="text-sm font-semibold mt-1">Local competitors + review position</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Your benchmark is the <span className="font-medium">median of the top 3 competitors</span> in your
                        target area. This avoids a single outlier skewing your target.
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Your biggest constraint</div>
                      <div className="text-sm font-semibold mt-1">Capacity (realistic reviews you can earn)</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Targets are constrained by your monthly customers and your review conversion rate.
                        {project ? (
                          <>
                            {" "}
                            Your inputs:{" "}
                            <span className="font-medium tabular-nums">
                              {project.monthly_customer_events ?? 0}/mo
                            </span>{" "}
                            at{" "}
                            <span className="font-medium tabular-nums">
                              {Math.round((project.review_conversion_rate ?? 0) * 100)}%
                            </span>
                            .
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">What this means</div>
                    <div className="mt-2 space-y-2 text-sm text-gray-800">
                      <div>
                        • Your review gap is{" "}
                        <span className="font-semibold tabular-nums">
                          {yourCurrentReviews == null ? "—" : reviewModel.gap}
                        </span>{" "}
                        versus the benchmark.
                      </div>
                      <div>
                        • Your realistic 90-day target is{" "}
                        <span className="font-semibold tabular-nums">{finalTarget90d ?? "—"}</span>, which is about{" "}
                        <span className="font-semibold tabular-nums">
                          {yourCurrentReviews == null ? "—" : reviewModel.weeklyNeeded}
                        </span>{" "}
                        per week.
                      </div>
                      <div>
                        • The market is currently gaining{" "}
                        <span className="font-semibold tabular-nums">{velocity.marketGrowth90d}</span> reviews per 90 days (
                        <span className="font-medium">{velocity.confidenceLabel}</span>).
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      This summary is based on widely accepted GBP + local SEO best practices plus your market data. It is
                      not a Google guarantee.
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => setActiveTab("actions")}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                      type="button"
                    >
                      Go to Action Plan
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {/* ACTION PLAN */}
            {activeTab === "actions" ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Action Plan (next 90 days)</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Numbered steps generated from your gap, capacity, and market velocity.
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 tabular-nums">
                      Target (90d): {finalTarget90d ?? "—"}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    This plan follows widely accepted Google Business Profile + local SEO best practices (not a Google
                    guarantee), combined with your market data and realistic capacity.
                  </div>

                  <div className="mt-3 space-y-3">
                    {actionPlan.map((a, idx) => (
                      <div key={`${a.title}-${idx}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">
                              {idx + 1}. {a.title}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{a.why}</div>
                          </div>
                          <span className="shrink-0 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700">
                            {a.priority}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-gray-800">
                          <span className="font-medium">Next step:</span> {a.nextStep}
                        </div>

                        {a.metric ? (
                          <div className="mt-2 text-[11px] text-gray-600">
                            <span className="font-medium">Metric:</span> {a.metric}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {/* DATA */}
            {activeTab === "data" ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold">Data & inputs</div>
                  <div className="text-xs text-gray-500 mt-1">
                    This section shows the numbers used to generate targets and projections.
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Project inputs</div>
                      <div className="mt-2 space-y-1 text-sm text-gray-800">
                        <div className="flex items-center justify-between">
                          <span>Monthly customer events</span>
                          <span className="font-semibold tabular-nums">{project?.monthly_customer_events ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Review conversion rate</span>
                          <span className="font-semibold tabular-nums">
                            {project ? `${Math.round((project.review_conversion_rate ?? 0) * 100)}%` : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        These two fields drive capacity and realistic targets.
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">Benchmark + snapshot</div>
                      <div className="mt-2 space-y-1 text-sm text-gray-800">
                        <div className="flex items-center justify-between">
                          <span>Top 3 median benchmark</span>
                          <span className="font-semibold tabular-nums">{thresholdReviews}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Benchmark updated</span>
                          <span className="font-semibold tabular-nums">{benchmarkUpdatedAt ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Latest snapshot time</span>
                          <span className="font-semibold tabular-nums">
                            {benchmarkUpdatedAt ? formatWhen(benchmarkUpdatedAt) : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Snapshots accumulate nightly and upgrade velocity accuracy.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Target math (90 days)</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 text-sm text-gray-800">
                      <div className="flex items-center justify-between">
                        <span>Gap</span>
                        <span className="font-semibold tabular-nums">{yourCurrentReviews == null ? "—" : reviewModel.gap}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rule target gain</span>
                        <span className="font-semibold tabular-nums">
                          {yourCurrentReviews == null ? "—" : reviewModel.ruleTargetGain}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Capacity (90d)</span>
                        <span className="font-semibold tabular-nums">{reviewModel.capacity90d}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Market-based target (90d)</span>
                        <span className="font-semibold tabular-nums">{marketBasedTarget90d}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Final target (90d)</span>
                        <span className="font-semibold tabular-nums">{finalTarget90d ?? "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Weekly needed</span>
                        <span className="font-semibold tabular-nums">
                          {yourCurrentReviews == null ? "—" : reviewModel.weeklyNeeded}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Velocity details</div>
                    <div className="mt-2 text-sm text-gray-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Confidence</span>
                        <span className="font-semibold">{velocity.confidenceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Market growth (90d)</span>
                        <span className="font-semibold tabular-nums">{velocity.marketGrowth90d}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Source</span>
                        <span className="font-semibold">{velocity.kind === "observed" ? "Observed from snapshots" : "Estimated fallback"}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Observed velocity auto-upgrades from 90d → 30d → 14d once enough snapshots exist.
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white md:hidden">
        <div className="mx-auto max-w-7xl px-2 py-2 grid grid-cols-5 gap-1">
          {navTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-lg px-2 py-2 text-center ${
                activeTab === t.key ? "bg-gray-50 border border-gray-200" : "border border-transparent"
              }`}
              type="button"
            >
              <div className="text-[11px] font-semibold text-gray-900">{t.label}</div>
              <div className="text-[10px] text-gray-500 truncate">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}