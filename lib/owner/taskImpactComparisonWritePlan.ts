import type { OwnerTaskImpactComparisonEligibility } from "./taskImpactComparisonEligibility";
import type { OwnerTaskImpactComparisonPlan } from "./taskImpactComparisonSources";
import type { OwnerTaskReviewComparison } from "./taskImpactReviewComparison";

export type OwnerTaskImpactComparisonWritePlanDecision =
  | "eligible_for_future_comparison_metrics_write"
  | "not_eligible"
  | "existing_comparison_metrics_present"
  | "missing_review_comparison"
  | "review_comparison_not_ready"
  | "unsupported_intent";

export type OwnerTaskImpactComparisonMetricsDraft = {
  metricsVersion: "owner_task_review_comparison_v1";
  comparisonType: "reviews";
  generatedAt: string;
  claimPolicy: "compare_only_no_attribution";
  noClaimLanguage: string;
  isAttributionClaim: false;
  baseline: OwnerTaskReviewComparison["baseline"];
  current: OwnerTaskReviewComparison["current"];
  signals: Array<{
    key: string;
    ownerLabel: string;
    baselineValue: number | null;
    currentValue: number | null;
    changeValue: number | null;
    comparisonDirection: string;
    ownerRead: string;
  }>;
};

export type OwnerTaskImpactComparisonWritePlan = {
  mode: "plan_only_no_write";
  decision: OwnerTaskImpactComparisonWritePlanDecision;
  isEligibleForFutureComparisonMetricsWrite: boolean;
  shouldWriteComparisonMetrics: boolean;
  shouldWriteImpactSummary: false;
  shouldWriteConfidenceLevel: false;
  shouldPromoteStoredStatus: false;
  proposedComparisonMetrics: OwnerTaskImpactComparisonMetricsDraft | null;
  proposedImpactSummary: null;
  proposedConfidenceLevel: null;
  proposedStoredStatus: null;
  ownerSummary: string;
  blockedReason: string | null;
  requiredBeforeWrite: string[];
  safeguards: string[];
  noClaimLanguage: string;
};

const DEFAULT_NO_CLAIM_LANGUAGE =
  "Digital Brain can compare signals after the watch window, but it should not claim this task caused the change without stronger proof.";

const WRITE_PLAN_SAFEGUARDS = [
  "This helper only returns a plan object; it does not write to the database.",
  "Only comparison_metrics can be proposed by this helper.",
  "impact_summary must remain null until a separate impact-summary boundary is accepted.",
  "confidence_level must remain null until a separate confidence-scoring boundary is accepted.",
  "owner_task_impacts.status must not be promoted by this helper.",
  "Owner-facing language must remain compare-only and no-attribution.",
];

function hasStoredComparisonMetrics(
  comparisonMetrics: Record<string, unknown> | null | undefined,
): boolean {
  return (
    typeof comparisonMetrics === "object" &&
    comparisonMetrics !== null &&
    Object.keys(comparisonMetrics).length > 0
  );
}

function buildBlockedPlan(params: {
  decision: OwnerTaskImpactComparisonWritePlanDecision;
  ownerSummary: string;
  blockedReason: string | null;
  requiredBeforeWrite?: string[];
  noClaimLanguage?: string;
}): OwnerTaskImpactComparisonWritePlan {
  return {
    mode: "plan_only_no_write",
    decision: params.decision,
    isEligibleForFutureComparisonMetricsWrite: false,
    shouldWriteComparisonMetrics: false,
    shouldWriteImpactSummary: false,
    shouldWriteConfidenceLevel: false,
    shouldPromoteStoredStatus: false,
    proposedComparisonMetrics: null,
    proposedImpactSummary: null,
    proposedConfidenceLevel: null,
    proposedStoredStatus: null,
    ownerSummary: params.ownerSummary,
    blockedReason: params.blockedReason,
    requiredBeforeWrite: params.requiredBeforeWrite ?? [],
    safeguards: WRITE_PLAN_SAFEGUARDS,
    noClaimLanguage: params.noClaimLanguage ?? DEFAULT_NO_CLAIM_LANGUAGE,
  };
}

function buildReviewComparisonMetricsDraft(params: {
  generatedAt: string;
  reviewComparison: OwnerTaskReviewComparison;
}): OwnerTaskImpactComparisonMetricsDraft {
  return {
    metricsVersion: "owner_task_review_comparison_v1",
    comparisonType: "reviews",
    generatedAt: params.generatedAt,
    claimPolicy: "compare_only_no_attribution",
    noClaimLanguage: params.reviewComparison.noClaimLanguage,
    isAttributionClaim: false,
    baseline: params.reviewComparison.baseline,
    current: params.reviewComparison.current,
    signals: params.reviewComparison.signals
      .filter((signal) => signal.hasComparableValues)
      .map((signal) => ({
        key: signal.key,
        ownerLabel: signal.ownerLabel,
        baselineValue: signal.baselineValue,
        currentValue: signal.currentValue,
        changeValue: signal.changeValue,
        comparisonDirection: signal.comparisonDirection,
        ownerRead: signal.ownerRead,
      })),
  };
}

export function buildOwnerTaskImpactComparisonWritePlan(params: {
  generatedAt: string;
  comparisonPlan: OwnerTaskImpactComparisonPlan;
  comparisonEligibility: OwnerTaskImpactComparisonEligibility;
  reviewComparison: OwnerTaskReviewComparison | null;
  existingComparisonMetrics: Record<string, unknown> | null | undefined;
}): OwnerTaskImpactComparisonWritePlan {
  if (!params.comparisonEligibility.isEligibleForComparisonMetricsWrite) {
    return buildBlockedPlan({
      decision: "not_eligible",
      ownerSummary: params.comparisonEligibility.ownerSummary,
      blockedReason: params.comparisonEligibility.blockedReason,
      requiredBeforeWrite: params.comparisonEligibility.requiredBeforeWrite,
      noClaimLanguage: params.comparisonEligibility.noClaimLanguage,
    });
  }

  if (hasStoredComparisonMetrics(params.existingComparisonMetrics)) {
    return buildBlockedPlan({
      decision: "existing_comparison_metrics_present",
      ownerSummary:
        "Comparison metrics already exist for this impact record, so Digital Brain should not overwrite them without a separate update policy.",
      blockedReason: "Stored comparison_metrics already contains data.",
      requiredBeforeWrite: [
        "Design an explicit overwrite or append policy before changing existing comparison metrics.",
        "Confirm the existing comparison record should be replaced.",
      ],
      noClaimLanguage: params.comparisonEligibility.noClaimLanguage,
    });
  }

  if (params.comparisonPlan.intent !== "reviews") {
    return buildBlockedPlan({
      decision: "unsupported_intent",
      ownerSummary:
        "This helper only proposes review comparison metric writes at the current boundary.",
      blockedReason:
        "Non-review comparison metric writes have not been accepted yet.",
      requiredBeforeWrite: [
        "Design a separate comparison metric draft for this impact intent.",
        "Verify baseline and current source availability.",
        "Define no-attribution owner language for this intent.",
      ],
      noClaimLanguage: params.comparisonEligibility.noClaimLanguage,
    });
  }

  if (!params.reviewComparison) {
    return buildBlockedPlan({
      decision: "missing_review_comparison",
      ownerSummary:
        "A review comparison object is required before Digital Brain can propose review comparison metrics.",
      blockedReason: "reviewComparison is missing.",
      requiredBeforeWrite: [
        "Build reviewComparison from stored baseline metrics and current review metrics.",
        "Confirm reviewComparison.canCompare is true.",
      ],
      noClaimLanguage: params.comparisonEligibility.noClaimLanguage,
    });
  }

  if (!params.reviewComparison.canCompare) {
    return buildBlockedPlan({
      decision: "review_comparison_not_ready",
      ownerSummary: params.reviewComparison.ownerSummary,
      blockedReason: params.reviewComparison.blockedReason,
      requiredBeforeWrite: [
        "Confirm the watch window has elapsed.",
        "Confirm baseline review values exist.",
        "Confirm current review values exist.",
        "Confirm at least one review signal has comparable values.",
      ],
      noClaimLanguage: params.reviewComparison.noClaimLanguage,
    });
  }

  const proposedComparisonMetrics = buildReviewComparisonMetricsDraft({
    generatedAt: params.generatedAt,
    reviewComparison: params.reviewComparison,
  });

  return {
    mode: "plan_only_no_write",
    decision: "eligible_for_future_comparison_metrics_write",
    isEligibleForFutureComparisonMetricsWrite: true,
    shouldWriteComparisonMetrics: true,
    shouldWriteImpactSummary: false,
    shouldWriteConfidenceLevel: false,
    shouldPromoteStoredStatus: false,
    proposedComparisonMetrics,
    proposedImpactSummary: null,
    proposedConfidenceLevel: null,
    proposedStoredStatus: null,
    ownerSummary:
      "This impact can produce a conservative comparison_metrics draft only. It still must not write an impact summary, confidence level, status promotion, or attribution claim.",
    blockedReason: null,
    requiredBeforeWrite: [
      "Use only the proposedComparisonMetrics object.",
      "Keep impact_summary null.",
      "Keep confidence_level null.",
      "Do not promote owner_task_impacts.status.",
      "Keep owner-facing language in compare-only, no-attribution form.",
    ],
    safeguards: WRITE_PLAN_SAFEGUARDS,
    noClaimLanguage: params.reviewComparison.noClaimLanguage,
  };
}
