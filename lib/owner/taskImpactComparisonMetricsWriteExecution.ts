import type { OwnerTaskImpactWithComparisonWritePlan } from "./taskImpactComparisonMetadata";
import type {
  OwnerTaskImpactComparisonMetricsUpdatePayload,
  OwnerTaskImpactComparisonMetricsWritePayloadPreparation,
} from "./taskImpactComparisonMetricsWrite";

export type OwnerTaskImpactComparisonMetricsWriteExecutionDecision =
  | "ready_but_write_disabled"
  | "missing_impact_identity"
  | "payload_not_ready"
  | "unsafe_payload_shape"
  | "existing_comparison_metrics_present";

export type OwnerTaskImpactComparisonMetricsWriteExecutionPlan = {
  mode: "execution_plan_only_no_write";
  decision: OwnerTaskImpactComparisonMetricsWriteExecutionDecision;
  canExecuteDatabaseWrite: false;
  databaseWritesPerformed: false;
  writeRouteEnabled: false;
  table: "owner_task_impacts";
  match: {
    id: string;
    project_id: string;
  } | null;
  updatePayload: OwnerTaskImpactComparisonMetricsUpdatePayload | null;
  blockedReason: string;
  safeguards: string[];
};

const METRICS_WRITE_EXECUTION_SAFEGUARDS = [
  "This helper only builds a database execution plan; it does not write to the database.",
  "The execution boundary is disabled.",
  "The target table must be owner_task_impacts.",
  "The update match must include both id and project_id.",
  "The update payload may contain comparison_metrics only.",
  "impact_summary must not be included in the update payload.",
  "confidence_level must not be included in the update payload.",
  "owner_task_impacts.status must not be included in the update payload.",
  "The comparison_metrics payload must remain compare-only and no-attribution.",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function buildImpactMatch(impact: OwnerTaskImpactWithComparisonWritePlan): {
  id: string;
  project_id: string;
} | null {
  const id = normalizeString(impact.id);
  const projectId = normalizeString(impact.project_id);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    project_id: projectId,
  };
}

function hasStoredComparisonMetrics(
  comparisonMetrics: Record<string, unknown> | null | undefined,
): boolean {
  return isRecord(comparisonMetrics) && Object.keys(comparisonMetrics).length > 0;
}

function hasOnlyComparisonMetricsPayload(
  updatePayload: OwnerTaskImpactComparisonMetricsUpdatePayload | null,
): updatePayload is OwnerTaskImpactComparisonMetricsUpdatePayload {
  if (!isRecord(updatePayload)) {
    return false;
  }

  const keys = Object.keys(updatePayload);

  return (
    keys.length === 1 &&
    keys[0] === "comparison_metrics" &&
    isRecord(updatePayload.comparison_metrics)
  );
}

function buildBlockedExecutionPlan(params: {
  decision: OwnerTaskImpactComparisonMetricsWriteExecutionDecision;
  match: OwnerTaskImpactComparisonMetricsWriteExecutionPlan["match"];
  blockedReason: string;
}): OwnerTaskImpactComparisonMetricsWriteExecutionPlan {
  return {
    mode: "execution_plan_only_no_write",
    decision: params.decision,
    canExecuteDatabaseWrite: false,
    databaseWritesPerformed: false,
    writeRouteEnabled: false,
    table: "owner_task_impacts",
    match: params.match,
    updatePayload: null,
    blockedReason: params.blockedReason,
    safeguards: METRICS_WRITE_EXECUTION_SAFEGUARDS,
  };
}

export function buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan(params: {
  impact: OwnerTaskImpactWithComparisonWritePlan;
  comparisonMetricsPayloadPreparation: OwnerTaskImpactComparisonMetricsWritePayloadPreparation;
}): OwnerTaskImpactComparisonMetricsWriteExecutionPlan {
  const match = buildImpactMatch(params.impact);

  if (!match) {
    return buildBlockedExecutionPlan({
      decision: "missing_impact_identity",
      match,
      blockedReason:
        "The comparison metrics write execution plan requires both impact id and project_id.",
    });
  }

  if (
    !params.comparisonMetricsPayloadPreparation.canWriteComparisonMetrics ||
    !params.comparisonMetricsPayloadPreparation.updatePayload
  ) {
    return buildBlockedExecutionPlan({
      decision: "payload_not_ready",
      match,
      blockedReason:
        params.comparisonMetricsPayloadPreparation.blockedReason ??
        "The comparison metrics payload is not ready for a database update plan.",
    });
  }

  if (
    !hasOnlyComparisonMetricsPayload(
      params.comparisonMetricsPayloadPreparation.updatePayload,
    )
  ) {
    return buildBlockedExecutionPlan({
      decision: "unsafe_payload_shape",
      match,
      blockedReason:
        "The comparison metrics execution plan only allows a comparison_metrics update payload.",
    });
  }

  if (hasStoredComparisonMetrics(params.impact.comparison_metrics)) {
    return buildBlockedExecutionPlan({
      decision: "existing_comparison_metrics_present",
      match,
      blockedReason:
        "Stored comparison_metrics already contains data, so this execution plan must not overwrite it.",
    });
  }

  return {
    mode: "execution_plan_only_no_write",
    decision: "ready_but_write_disabled",
    canExecuteDatabaseWrite: false,
    databaseWritesPerformed: false,
    writeRouteEnabled: false,
    table: "owner_task_impacts",
    match,
    updatePayload: params.comparisonMetricsPayloadPreparation.updatePayload,
    blockedReason:
      "Comparison metrics database writes are intentionally disabled at this boundary.",
    safeguards: METRICS_WRITE_EXECUTION_SAFEGUARDS,
  };
}
