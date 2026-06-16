import type { OwnerTaskImpactWithComparisonWritePlan } from "./taskImpactComparisonMetadata";
import type { OwnerTaskImpactComparisonMetricsWritePayloadPreparation } from "./taskImpactComparisonMetricsWrite";
import type { OwnerTaskImpactComparisonMetricsWriteExecutionPlan } from "./taskImpactComparisonMetricsWriteExecution";

export type OwnerTaskImpactComparisonWriteRouteFilters = {
  impactId: string | null;
  ownerTaskId: string | null;
};

export type OwnerTaskImpactComparisonWriteBoundary = {
  databaseWritesPerformed: false;
  writeRouteEnabled: false;
  shouldWriteComparisonMetrics: boolean;
  shouldWriteImpactSummary: false;
  shouldWriteConfidenceLevel: false;
  shouldPromoteStoredStatus: false;
  attributionClaimAllowed: false;
};

export type OwnerTaskImpactComparisonWritePostResponseMode =
  | "blocked_no_write"
  | "eligible_future_write_dry_run_only_no_write";

export type OwnerTaskImpactComparisonWritePostResponseBody = {
  ok: false;
  mode: OwnerTaskImpactComparisonWritePostResponseMode;
  projectId: string;
  filters: OwnerTaskImpactComparisonWriteRouteFilters;
  writeBoundary: OwnerTaskImpactComparisonWriteBoundary;
  comparisonMetricsPayloadPreparation: OwnerTaskImpactComparisonMetricsWritePayloadPreparation;
  comparisonMetricsWriteExecutionPlan: OwnerTaskImpactComparisonMetricsWriteExecutionPlan;
  blockedReason: string;
  comparisonWritePlanDecision: OwnerTaskImpactWithComparisonWritePlan["comparisonWritePlan"]["decision"];
  requiredBeforeWrite: string[];
  noClaimLanguage: string;
  impact: OwnerTaskImpactWithComparisonWritePlan;
};

export type OwnerTaskImpactComparisonWritePostResponse = {
  status: 409;
  body: OwnerTaskImpactComparisonWritePostResponseBody;
};

export function buildOwnerTaskImpactComparisonWriteBoundary(
  preview: OwnerTaskImpactWithComparisonWritePlan,
): OwnerTaskImpactComparisonWriteBoundary {
  return {
    databaseWritesPerformed: false,
    writeRouteEnabled: false,
    shouldWriteComparisonMetrics:
      preview.comparisonWritePlan.shouldWriteComparisonMetrics,
    shouldWriteImpactSummary: false,
    shouldWriteConfidenceLevel: false,
    shouldPromoteStoredStatus: false,
    attributionClaimAllowed: false,
  };
}

export function buildOwnerTaskImpactComparisonWritePostResponse(params: {
  projectId: string;
  filters: OwnerTaskImpactComparisonWriteRouteFilters;
  preview: OwnerTaskImpactWithComparisonWritePlan;
  comparisonMetricsPayloadPreparation: OwnerTaskImpactComparisonMetricsWritePayloadPreparation;
  comparisonMetricsWriteExecutionPlan: OwnerTaskImpactComparisonMetricsWriteExecutionPlan;
}): OwnerTaskImpactComparisonWritePostResponse {
  const writeBoundary = buildOwnerTaskImpactComparisonWriteBoundary(
    params.preview,
  );

  if (!params.preview.comparisonWritePlan.shouldWriteComparisonMetrics) {
    return {
      status: 409,
      body: {
        ok: false,
        mode: "blocked_no_write",
        projectId: params.projectId,
        filters: params.filters,
        writeBoundary,
        comparisonMetricsPayloadPreparation:
          params.comparisonMetricsPayloadPreparation,
        comparisonMetricsWriteExecutionPlan:
          params.comparisonMetricsWriteExecutionPlan,
        blockedReason:
          params.preview.comparisonWritePlan.blockedReason ??
          "Comparison metrics are not eligible for writing.",
        comparisonWritePlanDecision: params.preview.comparisonWritePlan.decision,
        requiredBeforeWrite:
          params.preview.comparisonWritePlan.requiredBeforeWrite,
        noClaimLanguage: params.preview.comparisonWritePlan.noClaimLanguage,
        impact: params.preview,
      },
    };
  }

  return {
    status: 409,
    body: {
      ok: false,
      mode: "eligible_future_write_dry_run_only_no_write",
      projectId: params.projectId,
      filters: params.filters,
      writeBoundary,
      comparisonMetricsPayloadPreparation:
        params.comparisonMetricsPayloadPreparation,
      comparisonMetricsWriteExecutionPlan:
        params.comparisonMetricsWriteExecutionPlan,
      blockedReason:
        "Comparison metrics writes are eligible for dry-run preview only; database writes are intentionally disabled at this boundary.",
      comparisonWritePlanDecision: params.preview.comparisonWritePlan.decision,
      requiredBeforeWrite: [
        "Accept a separate write boundary before enabling database updates.",
        "Write only comparison_metrics.",
        "Keep impact_summary null.",
        "Keep confidence_level null.",
        "Do not promote owner_task_impacts.status.",
        "Keep owner-facing language compare-only and no-attribution.",
      ],
      noClaimLanguage: params.preview.comparisonWritePlan.noClaimLanguage,
      impact: params.preview,
    },
  };
}
