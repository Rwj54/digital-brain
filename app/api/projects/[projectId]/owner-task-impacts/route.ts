import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildOwnerTaskImpactComparisonMetadata,
  loadOwnerTaskCurrentReviewMetrics,
  OWNER_TASK_IMPACT_SELECT,
  type OwnerTaskImpactRow,
  type OwnerTaskImpactWithComparisonMetadata,
} from "@/lib/owner/taskImpactComparisonMetadata";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

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

function normalizeLimit(value: string | null): number {
  if (!value) {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function buildImpactSummary(impacts: OwnerTaskImpactWithComparisonMetadata[]) {
  const waitingForWindow = impacts.filter(
    (impact) => impact.status === "waiting_for_window",
  ).length;
  const windowReady = impacts.filter(
    (impact) => impact.status === "window_ready",
  ).length;
  const completed = impacts.filter(
    (impact) => impact.status === "completed",
  ).length;
  const computedWindowReady = impacts.filter(
    (impact) => impact.readiness.computedStatus === "window_ready",
  ).length;
  const comparableNow = impacts.filter(
    (impact) => impact.comparisonPlan.canCompareNow,
  ).length;
  const contextOnly = impacts.filter(
    (impact) => impact.comparisonPlan.claimPolicy === "context_only_no_claim",
  ).length;
  const futureRequired = impacts.filter(
    (impact) => impact.comparisonPlan.claimPolicy === "future_required_no_claim",
  ).length;
  const reviewComparisons = impacts.filter(
    (impact) => impact.reviewComparison !== null,
  ).length;
  const reviewComparisonsReady = impacts.filter(
    (impact) => impact.reviewComparison?.canCompare,
  ).length;
  const comparisonReadsEligible = impacts.filter(
    (impact) => impact.comparisonEligibility.isEligibleForComparisonRead,
  ).length;
  const comparisonMetricsWriteEligible = impacts.filter(
    (impact) =>
      impact.comparisonEligibility.isEligibleForComparisonMetricsWrite,
  ).length;
  const impactSummaryWriteEligible = impacts.filter(
    (impact) => impact.comparisonEligibility.canWriteImpactSummary,
  ).length;
  const confidenceWriteEligible = impacts.filter(
    (impact) => impact.comparisonEligibility.canWriteConfidenceLevel,
  ).length;
  const statusPromotionEligible = impacts.filter(
    (impact) => impact.comparisonEligibility.canPromoteStoredStatus,
  ).length;

  return {
    totalImpacts: impacts.length,
    waitingForWindow,
    windowReady,
    completed,
    computedWindowReady,
    comparableNow,
    contextOnly,
    futureRequired,
    reviewComparisons,
    reviewComparisonsReady,
    comparisonReadsEligible,
    comparisonMetricsWriteEligible,
    impactSummaryWriteEligible,
    confidenceWriteEligible,
    statusPromotionEligible,
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
    const ownerTaskId =
      searchParams.get("ownerTaskId") ?? searchParams.get("taskId");
    const statusFilter = searchParams.get("status");
    const limit = normalizeLimit(searchParams.get("limit"));

    const supabase = getServiceRoleSupabase();

    let query = supabase
      .from("owner_task_impacts")
      .select(OWNER_TASK_IMPACT_SELECT)
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (ownerTaskId) {
      query = query.eq("owner_task_id", ownerTaskId);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const [{ data, error }, currentReviewMetrics] = await Promise.all([
      query.returns<OwnerTaskImpactRow[]>(),
      loadOwnerTaskCurrentReviewMetrics({ supabase, projectId }),
    ]);

    if (error) {
      throw new Error(`Failed to load owner task impacts: ${error.message}`);
    }

    const impacts = (data ?? []).map((impact) =>
      buildOwnerTaskImpactComparisonMetadata({
        impact,
        currentReviewMetrics,
      }),
    );

    return NextResponse.json({
      ok: true,
      projectId,
      filters: {
        ownerTaskId: ownerTaskId ?? null,
        status: statusFilter ?? "all",
        limit,
      },
      count: impacts.length,
      summary: buildImpactSummary(impacts),
      impacts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner task impacts.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
