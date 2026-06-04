import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildOwnerTaskImpactComparisonEligibility,
  type OwnerTaskImpactComparisonEligibility,
} from "@/lib/owner/taskImpactComparisonEligibility";
import {
  buildOwnerTaskImpactComparisonPlanFromBaseline,
  type OwnerTaskImpactComparisonPlan,
} from "@/lib/owner/taskImpactComparisonSources";
import {
  buildOwnerTaskImpactComparisonWritePlan,
  type OwnerTaskImpactComparisonWritePlan,
} from "@/lib/owner/taskImpactComparisonWritePlan";
import {
  buildOwnerTaskReviewComparison,
  type OwnerTaskReviewComparison,
  type OwnerTaskReviewCurrentMetrics,
} from "@/lib/owner/taskImpactReviewComparison";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerTaskImpactStatus =
  | "waiting_for_window"
  | "window_ready"
  | "completed"
  | string;

type OwnerTaskImpactRow = {
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

type OwnerTaskImpactReadiness = {
  eligibleOn: string | null;
  daysRemaining: number | null;
  isWindowReady: boolean;
  computedStatus: "waiting_for_window" | "window_ready" | "completed" | "tracked";
};

type OwnerTaskImpactPreviewRow = OwnerTaskImpactRow & {
  readiness: OwnerTaskImpactReadiness;
  comparisonPlan: OwnerTaskImpactComparisonPlan;
  reviewComparison: OwnerTaskReviewComparison | null;
  comparisonEligibility: OwnerTaskImpactComparisonEligibility;
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

type SupabaseServiceRoleClient = ReturnType<typeof getServiceRoleSupabase>;

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

const IMPACT_SELECT = [
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

function buildImpactReadiness(
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

async function loadCurrentReviewMetrics(params: {
  supabase: SupabaseServiceRoleClient;
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

async function loadImpact(params: {
  supabase: SupabaseServiceRoleClient;
  projectId: string;
  impactId: string | null;
  ownerTaskId: string | null;
}): Promise<OwnerTaskImpactRow | null> {
  let query = params.supabase
    .from("owner_task_impacts")
    .select(IMPACT_SELECT)
    .eq("project_id", params.projectId)
    .order("captured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.impactId) {
    query = query.eq("id", params.impactId);
  } else if (params.ownerTaskId) {
    query = query.eq("owner_task_id", params.ownerTaskId);
  }

  const { data, error } = await query.returns<OwnerTaskImpactRow[]>();

  if (error) {
    throw new Error(`Failed to load owner task impact: ${error.message}`);
  }

  return data?.[0] ?? null;
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

function buildPreviewRow(params: {
  impact: OwnerTaskImpactRow;
  currentReviewMetrics: OwnerTaskReviewCurrentMetrics;
  generatedAt: string;
}): OwnerTaskImpactPreviewRow {
  const readiness = buildImpactReadiness(params.impact);
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
  const comparisonWritePlan = buildOwnerTaskImpactComparisonWritePlan({
    generatedAt: params.generatedAt,
    comparisonPlan,
    comparisonEligibility,
    reviewComparison,
    existingComparisonMetrics: params.impact.comparison_metrics,
  });

  return {
    ...params.impact,
    readiness,
    comparisonPlan,
    reviewComparison,
    comparisonEligibility,
    comparisonWritePlan,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const impactId = searchParams.get("impactId");
    const ownerTaskId =
      searchParams.get("ownerTaskId") ?? searchParams.get("taskId");

    if (!impactId && !ownerTaskId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing impactId or ownerTaskId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();
    const generatedAt = new Date().toISOString();

    const [impact, currentReviewMetrics] = await Promise.all([
      loadImpact({
        supabase,
        projectId,
        impactId,
        ownerTaskId,
      }),
      loadCurrentReviewMetrics({
        supabase,
        projectId,
      }),
    ]);

    if (!impact) {
      return NextResponse.json(
        {
          ok: false,
          error: "Owner task impact not found.",
          projectId,
          filters: {
            impactId,
            ownerTaskId,
          },
        },
        { status: 404 },
      );
    }

    const preview = buildPreviewRow({
      impact,
      currentReviewMetrics,
      generatedAt,
    });

    return NextResponse.json({
      ok: true,
      mode: "preview_only_no_write",
      projectId,
      filters: {
        impactId,
        ownerTaskId,
      },
      writeBoundary: {
        databaseWritesPerformed: false,
        shouldWriteComparisonMetrics:
          preview.comparisonWritePlan.shouldWriteComparisonMetrics,
        shouldWriteImpactSummary: false,
        shouldWriteConfidenceLevel: false,
        shouldPromoteStoredStatus: false,
        attributionClaimAllowed: false,
      },
      impact: preview,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to preview owner task impact comparison write plan.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
