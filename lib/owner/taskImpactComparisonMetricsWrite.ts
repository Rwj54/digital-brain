import type {
  OwnerTaskImpactComparisonMetricsDraft,
  OwnerTaskImpactComparisonWritePlan,
} from "./taskImpactComparisonWritePlan";

export type OwnerTaskImpactComparisonMetricsUpdatePayload = {
  comparison_metrics: OwnerTaskImpactComparisonMetricsDraft;
};

export type OwnerTaskImpactComparisonMetricsWritePayloadDecision =
  | "ready_for_comparison_metrics_update_payload"
  | "not_eligible"
  | "missing_proposed_comparison_metrics"
  | "unsafe_summary_write_requested"
  | "unsafe_confidence_write_requested"
  | "unsafe_status_promotion_requested"
  | "unsafe_attribution_claim_requested"
  | "empty_comparable_signals";

export type OwnerTaskImpactComparisonMetricsWritePayloadPreparation = {
  mode: "prepare_payload_only_no_write";
  decision: OwnerTaskImpactComparisonMetricsWritePayloadDecision;
  canWriteComparisonMetrics: boolean;
  databaseWritesPerformed: false;
  updatePayload: OwnerTaskImpactComparisonMetricsUpdatePayload | null;
  blockedReason: string | null;
  safeguards: string[];
};

const METRICS_WRITE_PAYLOAD_SAFEGUARDS = [
  "This helper only prepares a payload object; it does not write to the database.",
  "The payload may contain comparison_metrics only.",
  "impact_summary must not be included in this payload.",
  "confidence_level must not be included in this payload.",
  "owner_task_impacts.status must not be included in this payload.",
  "The comparison_metrics payload must remain compare-only and no-attribution.",
];

function buildBlockedPreparation(params: {
  decision: OwnerTaskImpactComparisonMetricsWritePayloadDecision;
  blockedReason: string;
}): OwnerTaskImpactComparisonMetricsWritePayloadPreparation {
  return {
    mode: "prepare_payload_only_no_write",
    decision: params.decision,
    canWriteComparisonMetrics: false,
    databaseWritesPerformed: false,
    updatePayload: null,
    blockedReason: params.blockedReason,
    safeguards: METRICS_WRITE_PAYLOAD_SAFEGUARDS,
  };
}

function hasComparableSignals(
  proposedComparisonMetrics: OwnerTaskImpactComparisonMetricsDraft,
): boolean {
  return proposedComparisonMetrics.signals.length > 0;
}

function isSafeNoAttributionDraft(
  proposedComparisonMetrics: OwnerTaskImpactComparisonMetricsDraft,
): boolean {
  return (
    proposedComparisonMetrics.claimPolicy === "compare_only_no_attribution" &&
    proposedComparisonMetrics.isAttributionClaim === false
  );
}

export function prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
  writePlan: OwnerTaskImpactComparisonWritePlan,
): OwnerTaskImpactComparisonMetricsWritePayloadPreparation {
  if (!writePlan.shouldWriteComparisonMetrics) {
    return buildBlockedPreparation({
      decision: "not_eligible",
      blockedReason:
        writePlan.blockedReason ??
        "The comparison write plan is not eligible to write comparison_metrics.",
    });
  }

  if (writePlan.shouldWriteImpactSummary) {
    return buildBlockedPreparation({
      decision: "unsafe_summary_write_requested",
      blockedReason:
        "The comparison metrics payload boundary does not allow impact_summary writes.",
    });
  }

  if (writePlan.shouldWriteConfidenceLevel) {
    return buildBlockedPreparation({
      decision: "unsafe_confidence_write_requested",
      blockedReason:
        "The comparison metrics payload boundary does not allow confidence_level writes.",
    });
  }

  if (writePlan.shouldPromoteStoredStatus) {
    return buildBlockedPreparation({
      decision: "unsafe_status_promotion_requested",
      blockedReason:
        "The comparison metrics payload boundary does not allow owner_task_impacts.status promotion.",
    });
  }

  if (!writePlan.proposedComparisonMetrics) {
    return buildBlockedPreparation({
      decision: "missing_proposed_comparison_metrics",
      blockedReason:
        "The comparison write plan is eligible but does not contain proposedComparisonMetrics.",
    });
  }

  if (!isSafeNoAttributionDraft(writePlan.proposedComparisonMetrics)) {
    return buildBlockedPreparation({
      decision: "unsafe_attribution_claim_requested",
      blockedReason:
        "The comparison_metrics draft must remain compare-only and no-attribution.",
    });
  }

  if (!hasComparableSignals(writePlan.proposedComparisonMetrics)) {
    return buildBlockedPreparation({
      decision: "empty_comparable_signals",
      blockedReason:
        "The comparison_metrics draft must contain at least one comparable signal.",
    });
  }

  return {
    mode: "prepare_payload_only_no_write",
    decision: "ready_for_comparison_metrics_update_payload",
    canWriteComparisonMetrics: true,
    databaseWritesPerformed: false,
    updatePayload: {
      comparison_metrics: writePlan.proposedComparisonMetrics,
    },
    blockedReason: null,
    safeguards: METRICS_WRITE_PAYLOAD_SAFEGUARDS,
  };
}
