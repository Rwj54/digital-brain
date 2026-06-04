import type { OwnerTaskImpactComparisonPlan } from "./taskImpactComparisonSources";
import type { OwnerTaskReviewComparison } from "./taskImpactReviewComparison";

export type OwnerTaskImpactStoredStatus =
  | "waiting_for_window"
  | "window_ready"
  | "completed"
  | "tracked"
  | string;

export type OwnerTaskImpactComputedStatus =
  | "waiting_for_window"
  | "window_ready"
  | "completed"
  | "tracked";

export type OwnerTaskImpactReadinessForEligibility = {
  eligibleOn: string | null;
  daysRemaining: number | null;
  isWindowReady: boolean;
  computedStatus: OwnerTaskImpactComputedStatus;
};

export type OwnerTaskImpactComparisonEligibilityDecision =
  | "eligible_for_comparison_metrics_write"
  | "waiting_for_watch_window"
  | "already_completed"
  | "context_only_no_write"
  | "future_source_required"
  | "missing_comparison_plan_sources"
  | "missing_review_comparison"
  | "review_comparison_not_ready";

export type OwnerTaskImpactComparisonEligibility = {
  decision: OwnerTaskImpactComparisonEligibilityDecision;
  isEligibleForComparisonRead: boolean;
  isEligibleForComparisonMetricsWrite: boolean;
  canWriteImpactSummary: false;
  canWriteConfidenceLevel: false;
  canPromoteStoredStatus: false;
  recommendedStoredStatus: null;
  ownerSummary: string;
  blockedReason: string | null;
  requiredBeforeWrite: string[];
  noClaimLanguage: string;
};

const NO_ATTRIBUTION_LANGUAGE =
  "Digital Brain can compare signals after the watch window, but it should not claim this task caused the change without stronger proof.";

function buildEligibility(params: {
  decision: OwnerTaskImpactComparisonEligibilityDecision;
  isEligibleForComparisonRead?: boolean;
  isEligibleForComparisonMetricsWrite?: boolean;
  ownerSummary: string;
  blockedReason: string | null;
  requiredBeforeWrite?: string[];
  noClaimLanguage?: string;
}): OwnerTaskImpactComparisonEligibility {
  return {
    decision: params.decision,
    isEligibleForComparisonRead: params.isEligibleForComparisonRead ?? false,
    isEligibleForComparisonMetricsWrite:
      params.isEligibleForComparisonMetricsWrite ?? false,
    canWriteImpactSummary: false,
    canWriteConfidenceLevel: false,
    canPromoteStoredStatus: false,
    recommendedStoredStatus: null,
    ownerSummary: params.ownerSummary,
    blockedReason: params.blockedReason,
    requiredBeforeWrite: params.requiredBeforeWrite ?? [],
    noClaimLanguage: params.noClaimLanguage ?? NO_ATTRIBUTION_LANGUAGE,
  };
}

function hasComparableReviewSignals(
  reviewComparison: OwnerTaskReviewComparison,
): boolean {
  return reviewComparison.signals.some((signal) => signal.hasComparableValues);
}

export function buildOwnerTaskImpactComparisonEligibility(params: {
  storedStatus: OwnerTaskImpactStoredStatus;
  readiness: OwnerTaskImpactReadinessForEligibility;
  comparisonPlan: OwnerTaskImpactComparisonPlan;
  reviewComparison: OwnerTaskReviewComparison | null;
}): OwnerTaskImpactComparisonEligibility {
  if (params.storedStatus === "completed") {
    return buildEligibility({
      decision: "already_completed",
      ownerSummary:
        "This impact record is already marked completed, so Digital Brain should not write a new comparison over it.",
      blockedReason: "The impact record is already completed.",
      requiredBeforeWrite: [
        "Review the existing completed impact record before creating any follow-up comparison.",
      ],
    });
  }

  if (!params.readiness.isWindowReady) {
    return buildEligibility({
      decision: "waiting_for_watch_window",
      ownerSummary:
        "The watch window is still open, so Digital Brain should wait before writing comparison metrics.",
      blockedReason: "The impact watch window has not elapsed yet.",
      requiredBeforeWrite: [
        "Wait until readiness.isWindowReady is true.",
        "Keep owner-facing copy clear that no outcome impact has been claimed.",
      ],
    });
  }

  if (params.comparisonPlan.claimPolicy === "future_required_no_claim") {
    return buildEligibility({
      decision: "future_source_required",
      ownerSummary:
        "This impact needs future outcome sources before Digital Brain should write comparison metrics.",
      blockedReason: "Required future outcome sources are not built yet.",
      requiredBeforeWrite: [
        "Design the future outcome source table contract.",
        "Capture durable before-and-after outcome snapshots.",
        "Define missing-data behavior before writing comparison metrics.",
      ],
      noClaimLanguage:
        params.comparisonPlan.futureSources[0]?.noClaimLanguage ??
        NO_ATTRIBUTION_LANGUAGE,
    });
  }

  if (params.comparisonPlan.claimPolicy === "context_only_no_claim") {
    return buildEligibility({
      decision: "context_only_no_write",
      isEligibleForComparisonRead: true,
      ownerSummary:
        "This impact can be shown as owner context, but it should not write comparison metrics as proof of task impact.",
      blockedReason:
        "The available sources are context-only and should not be stored as impact comparison proof.",
      requiredBeforeWrite: [
        "Add a stronger comparison source before enabling comparison_metrics writes.",
        "Keep this impact as read-only context until then.",
      ],
      noClaimLanguage:
        params.comparisonPlan.contextSources[0]?.noClaimLanguage ??
        NO_ATTRIBUTION_LANGUAGE,
    });
  }

  if (!params.comparisonPlan.canCompareNow) {
    return buildEligibility({
      decision: "missing_comparison_plan_sources",
      ownerSummary:
        "The comparison plan does not have enough available sources to write comparison metrics safely.",
      blockedReason: params.comparisonPlan.blockedReason,
      requiredBeforeWrite: [
        "Confirm at least one allowed comparison source is available.",
        "Confirm the source has both baseline and current values.",
      ],
      noClaimLanguage:
        params.comparisonPlan.allowedSources[0]?.noClaimLanguage ??
        NO_ATTRIBUTION_LANGUAGE,
    });
  }

  if (params.comparisonPlan.intent === "reviews") {
    if (!params.reviewComparison) {
      return buildEligibility({
        decision: "missing_review_comparison",
        ownerSummary:
          "This review impact does not have a review comparison object yet, so Digital Brain should not write comparison metrics.",
        blockedReason: "Review comparison metadata is missing.",
        requiredBeforeWrite: [
          "Build reviewComparison from stored baseline metrics and current review metrics.",
          "Confirm reviewComparison.canCompare is true before writing comparison_metrics.",
        ],
      });
    }

    if (
      !params.reviewComparison.canCompare ||
      !hasComparableReviewSignals(params.reviewComparison)
    ) {
      return buildEligibility({
        decision: "review_comparison_not_ready",
        isEligibleForComparisonRead: true,
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

    return buildEligibility({
      decision: "eligible_for_comparison_metrics_write",
      isEligibleForComparisonRead: true,
      isEligibleForComparisonMetricsWrite: true,
      ownerSummary:
        "This review impact is eligible for a conservative comparison_metrics write. It is still not eligible for impact_summary, confidence_level, status promotion, or attribution claims.",
      blockedReason: null,
      requiredBeforeWrite: [
        "Write only numeric/context comparison metrics.",
        "Do not write impact_summary yet.",
        "Do not write confidence_level yet.",
        "Do not promote owner_task_impacts.status in this helper.",
        "Keep owner copy in compare-only, no-attribution language.",
      ],
      noClaimLanguage: params.reviewComparison.noClaimLanguage,
    });
  }

  return buildEligibility({
    decision: "context_only_no_write",
    isEligibleForComparisonRead: true,
    ownerSummary:
      "This impact has comparison context, but this helper only approves review comparison_metrics writes at the current Phase 3AC boundary.",
    blockedReason:
      "Non-review write eligibility has not been accepted yet for this phase.",
    requiredBeforeWrite: [
      "Design and accept a specific comparison helper for this intent.",
      "Verify baseline/current source availability.",
      "Define owner-facing no-claim language for this intent.",
    ],
    noClaimLanguage:
      params.comparisonPlan.allowedSources[0]?.noClaimLanguage ??
      NO_ATTRIBUTION_LANGUAGE,
  });
}

export function isOwnerTaskImpactEligibleForComparisonMetricsWrite(
  eligibility: OwnerTaskImpactComparisonEligibility,
): boolean {
  return eligibility.isEligibleForComparisonMetricsWrite;
}
