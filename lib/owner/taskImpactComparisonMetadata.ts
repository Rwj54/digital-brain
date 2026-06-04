import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildOwnerTaskImpactComparisonEligibility,
  type OwnerTaskImpactComparisonEligibility,
} from "./taskImpactComparisonEligibility";
import {
  buildOwnerTaskImpactComparisonPlanFromBaseline,
  type OwnerTaskImpactComparisonPlan,
} from "./taskImpactComparisonSources";
import {
  buildOwnerTaskImpactComparisonWritePlan,
  type OwnerTaskImpactComparisonWritePlan,
} from "./taskImpactComparisonWritePlan";
import {
  buildOwnerTaskReviewComparison,
  type OwnerTaskReviewComparison,
  type OwnerTaskReviewCurrentMetrics,
} from "./taskImpactReviewComparison";

export type OwnerTaskImpactStatus =
  | "waiting_for_window"
  | "window_ready"
  | "completed"
  | string;

export type OwnerTaskImpactRow = {
  id: string;
  project_id: string;
  owner_task_id: string;
  captured_at: string;
  impact_window_days: number;
  status: OwnerTaskImpactStatus;
  source: string;
  baseline_metrics: Record<string, unknown>;
  comparison_metrics: Record<string, unknown>;
  impact_summary: string | null;
  confidence_level: number | null;
  created_at: string;
  updated_at: string;
};

export type OwnerTaskImpactReadiness = {
  eligibleOn: string | null;
  daysRemaining: number | null;
  isWindowReady: boolean;
  computedStatus: "waiting_for_window" | "window_ready" | "completed" | "tracked";
};

export type OwnerTaskImpactWithComparisonMetadata = OwnerTaskImpactRow & {
  readiness: OwnerTaskImpactReadiness;
  comparisonPlan: OwnerTaskImpactComparisonPlan;
  reviewComparison: OwnerTaskReviewComparison | null;
  comparisonEligibility: OwnerTaskImpactComparisonEligibility;
};

export type OwnerTaskImpactWithComparisonWritePlan =
  OwnerTaskImpactWithComparisonMetadata & {
    comparisonWritePlan: OwnerTaskImpactComparisonWritePlan;
  };

type GbpReviewCurrentRow = {
  total_reviews: number | null;
  rating: number | null;
  last_fetched_at: string | null;
};

type CompetitorReviewCurrentRow = {
  competitor_name: string | null;
  total_reviews: number | null;
};

export const OWNER_TASK_IMPACT_SELECT = [
  "id",
  "project_id",
  "owner_task_id",
  "captured_at",
  "impact_window_days",
  "status",
  "source",
  "baseline_metrics",
  "comparison_metrics",
  "impact_summary",
  "confidence_level",
  "created_at",
  "updated_at",
].join(",");

function normalizeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function calculateReviewGap(
  currentReviews: number | null,
  topCompetitorReviews: number | null,
): number | null {
  if (currentReviews === null || topCompetitorReviews === null) {
    return null;
  }

  return Math.max(0, topCompetitorReviews - currentReviews);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseCapturedAtDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function addUtcDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function calculateDaysRemaining(today: Date, eligibleDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const difference = eligibleDate.getTime() - today.getTime();

  return Math.max(0, Math.ceil(difference / millisecondsPerDay));
}

export function buildOwnerTaskImpactReadiness(
  impact: OwnerTaskImpactRow,
): OwnerTaskImpactReadiness {
  if (impact.status === "completed") {
    return {
      eligibleOn: null,
      daysRemaining: 0,
      isWindowReady: true,
      computedStatus: "completed",
    };
  }

  const capturedAtDate = parseCapturedAtDate(impact.captured_at);

  if (!capturedAtDate) {
    return {
      eligibleOn: null,
      daysRemaining: null,
      isWindowReady: false,
      computedStatus:
        impact.status === "window_ready" ? "window_ready" : "tracked",
    };
  }

  const impactWindowDays = Math.max(impact.impact_window_days, 1);
  const today = startOfUtcDay(new Date());
  const eligibleDate = addUtcDays(capturedAtDate, impactWindowDays);
  const isWindowReady = eligibleDate.getTime() <= today.getTime();

  if (impact.status === "window_ready" || isWindowReady) {
    return {
      eligibleOn: formatUtcDate(eligibleDate),
      daysRemaining: 0,
      isWindowReady: true,
      computedStatus: "window_ready",
    };
  }

  return {
    eligibleOn: formatUtcDate(eligibleDate),
    daysRemaining: calculateDaysRemaining(today, eligibleDate),
    isWindowReady: false,
    computedStatus: "waiting_for_window",
  };
}

export async function loadOwnerTaskCurrentReviewMetrics(params: {
  supabase: SupabaseClient;
  projectId: string;
}): Promise<OwnerTaskReviewCurrentMetrics> {
  const [
    { data: gbpProfiles, error: gbpError },
    { data: competitors, error: competitorError },
  ] = await Promise.all([
    params.supabase
      .from("gbp_profiles")
      .select("total_reviews, rating, last_fetched_at")
      .eq("project_id", params.projectId)
      .order("last_fetched_at", { ascending: false })
      .limit(1)
      .returns<GbpReviewCurrentRow[]>(),
    params.supabase
      .from("gbp_competitor_metrics")
      .select("competitor_name, total_reviews")
      .eq("project_id", params.projectId)
      .order("total_reviews", { ascending: false })
      .limit(1)
      .returns<CompetitorReviewCurrentRow[]>(),
  ]);

  if (gbpError) {
    throw new Error(`Failed to load current review profile data: ${gbpError.message}`);
  }

  if (competitorError) {
    throw new Error(
      `Failed to load current review competitor data: ${competitorError.message}`,
    );
  }

  const gbpProfile = gbpProfiles?.[0] ?? null;
  const topCompetitor = competitors?.[0] ?? null;
  const currentReviews = normalizeNumber(gbpProfile?.total_reviews);
  const currentRating = normalizeNumber(gbpProfile?.rating);
  const currentTopCompetitorReviews = normalizeNumber(
    topCompetitor?.total_reviews,
  );

  return {
    currentReviews,
    currentRating,
    currentProfileLastFetchedAt: gbpProfile?.last_fetched_at ?? null,
    currentTopCompetitorName: topCompetitor?.competitor_name ?? null,
    currentTopCompetitorReviews,
    currentReviewGap: calculateReviewGap(
      currentReviews,
      currentTopCompetitorReviews,
    ),
  };
}

function buildReviewComparison(params: {
  impact: OwnerTaskImpactRow;
  readiness: OwnerTaskImpactReadiness;
  comparisonPlan: OwnerTaskImpactComparisonPlan;
  currentReviewMetrics: OwnerTaskReviewCurrentMetrics;
}): OwnerTaskReviewComparison | null {
  if (params.comparisonPlan.intent !== "reviews") {
    return null;
  }

  return buildOwnerTaskReviewComparison({
    baselineMetrics: params.impact.baseline_metrics,
    currentMetrics: params.currentReviewMetrics,
    isWindowReady: params.readiness.isWindowReady,
  });
}

export function buildOwnerTaskImpactComparisonMetadata(params: {
  impact: OwnerTaskImpactRow;
  currentReviewMetrics: OwnerTaskReviewCurrentMetrics;
}): OwnerTaskImpactWithComparisonMetadata {
  const readiness = buildOwnerTaskImpactReadiness(params.impact);
  const comparisonPlan = buildOwnerTaskImpactComparisonPlanFromBaseline(
    params.impact.baseline_metrics,
  );
  const reviewComparison = buildReviewComparison({
    impact: params.impact,
    readiness,
    comparisonPlan,
    currentReviewMetrics: params.currentReviewMetrics,
  });
  const comparisonEligibility = buildOwnerTaskImpactComparisonEligibility({
    storedStatus: params.impact.status,
    readiness,
    comparisonPlan,
    reviewComparison,
  });

  return {
    ...params.impact,
    readiness,
    comparisonPlan,
    reviewComparison,
    comparisonEligibility,
  };
}

export function buildOwnerTaskImpactComparisonWritePlanPreview(params: {
  impact: OwnerTaskImpactRow;
  currentReviewMetrics: OwnerTaskReviewCurrentMetrics;
  generatedAt: string;
}): OwnerTaskImpactWithComparisonWritePlan {
  const metadata = buildOwnerTaskImpactComparisonMetadata({
    impact: params.impact,
    currentReviewMetrics: params.currentReviewMetrics,
  });
  const comparisonWritePlan = buildOwnerTaskImpactComparisonWritePlan({
    generatedAt: params.generatedAt,
    comparisonPlan: metadata.comparisonPlan,
    comparisonEligibility: metadata.comparisonEligibility,
    reviewComparison: metadata.reviewComparison,
    existingComparisonMetrics: metadata.comparison_metrics,
  });

  return {
    ...metadata,
    comparisonWritePlan,
  };
}
