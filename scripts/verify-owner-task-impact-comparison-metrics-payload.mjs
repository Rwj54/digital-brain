import assert from "node:assert/strict";

import { prepareOwnerTaskImpactComparisonMetricsUpdatePayload } from "../lib/owner/taskImpactComparisonMetricsWrite.ts";

const NO_CLAIM_LANGUAGE =
  "Digital Brain can compare signals after the watch window, but it should not claim this task caused the change without stronger proof.";

const baseline = {
  baselineReviewDataAvailable: true,
  baselineCurrentReviews: 282,
  baselineCurrentRating: 4.9,
  baselineProfileLastFetchedAt: "2026-06-02T16:20:52.319+00:00",
  baselineTopCompetitorName: "Janousek Florist & Greenhouse",
  baselineTopCompetitorReviews: 964,
  baselineReviewGap: 682,
};

const current = {
  currentReviews: 286,
  currentRating: 4.9,
  currentProfileLastFetchedAt: "2026-07-03T16:20:52.319+00:00",
  currentTopCompetitorName: "Janousek Florist & Greenhouse",
  currentTopCompetitorReviews: 970,
  currentReviewGap: 684,
};

const safeDraft = {
  metricsVersion: "owner_task_review_comparison_v1",
  comparisonType: "reviews",
  generatedAt: "2026-07-03T12:00:00.000Z",
  claimPolicy: "compare_only_no_attribution",
  noClaimLanguage: NO_CLAIM_LANGUAGE,
  isAttributionClaim: false,
  baseline,
  current,
  signals: [
    {
      key: "business_total_reviews",
      ownerLabel: "Business review count",
      baselineValue: 282,
      currentValue: 286,
      changeValue: 4,
      comparisonDirection: "higher_is_better",
      ownerRead: "Business review count increased by 4.",
    },
    {
      key: "review_gap",
      ownerLabel: "Review gap versus strongest visible competitor",
      baselineValue: 682,
      currentValue: 684,
      changeValue: 2,
      comparisonDirection: "lower_is_better",
      ownerRead:
        "Review gap versus strongest visible competitor widened by 2.",
    },
  ],
};

function buildPlan(overrides = {}) {
  return {
    mode: "plan_only_no_write",
    decision: "eligible_for_future_comparison_metrics_write",
    isEligibleForFutureComparisonMetricsWrite: true,
    shouldWriteComparisonMetrics: true,
    shouldWriteImpactSummary: false,
    shouldWriteConfidenceLevel: false,
    shouldPromoteStoredStatus: false,
    proposedComparisonMetrics: safeDraft,
    proposedImpactSummary: null,
    proposedConfidenceLevel: null,
    proposedStoredStatus: null,
    ownerSummary:
      "This impact can produce a conservative comparison_metrics draft only.",
    blockedReason: null,
    requiredBeforeWrite: [
      "Use only the proposedComparisonMetrics object.",
      "Keep impact_summary null.",
      "Keep confidence_level null.",
      "Do not promote owner_task_impacts.status.",
      "Keep owner-facing language in compare-only, no-attribution form.",
    ],
    safeguards: [
      "This helper only returns a plan object; it does not write to the database.",
    ],
    noClaimLanguage: NO_CLAIM_LANGUAGE,
    ...overrides,
  };
}

function assertBlockedPreparation(result, decision) {
  assert.equal(result.mode, "prepare_payload_only_no_write");
  assert.equal(result.decision, decision);
  assert.equal(result.canWriteComparisonMetrics, false);
  assert.equal(result.databaseWritesPerformed, false);
  assert.equal(result.updatePayload, null);
  assert.equal(typeof result.blockedReason, "string");
  assert.ok(result.blockedReason.length > 0);
  assert.ok(Array.isArray(result.safeguards));
  assert.ok(result.safeguards.length > 0);
}

function assertReadyPreparation(result) {
  assert.equal(result.mode, "prepare_payload_only_no_write");
  assert.equal(result.decision, "ready_for_comparison_metrics_update_payload");
  assert.equal(result.canWriteComparisonMetrics, true);
  assert.equal(result.databaseWritesPerformed, false);
  assert.equal(result.blockedReason, null);
  assert.deepEqual(result.updatePayload, {
    comparison_metrics: safeDraft,
  });

  assert.deepEqual(Object.keys(result.updatePayload), ["comparison_metrics"]);
  assert.equal(result.updatePayload.comparison_metrics.claimPolicy, "compare_only_no_attribution");
  assert.equal(result.updatePayload.comparison_metrics.isAttributionClaim, false);
  assert.ok(result.updatePayload.comparison_metrics.signals.length > 0);
  assert.ok(Array.isArray(result.safeguards));
  assert.ok(result.safeguards.length > 0);
}

function runCase(name, callback) {
  callback();
  console.log(`PASSED ${name}`);
}

console.log("Verifying owner task comparison metrics payload helper");
console.log("Boundary: prepare payload only, no database writes");

runCase("blocked not eligible plan", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      decision: "not_eligible",
      isEligibleForFutureComparisonMetricsWrite: false,
      shouldWriteComparisonMetrics: false,
      proposedComparisonMetrics: null,
      blockedReason: "The impact watch window has not elapsed yet.",
    }),
  );

  assertBlockedPreparation(result, "not_eligible");
});

runCase("ready comparison_metrics payload only", () => {
  const result =
    prepareOwnerTaskImpactComparisonMetricsUpdatePayload(buildPlan());

  assertReadyPreparation(result);
});

runCase("blocked unsafe impact_summary write", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      shouldWriteImpactSummary: true,
      proposedImpactSummary: "Unsafe summary write must be blocked.",
    }),
  );

  assertBlockedPreparation(result, "unsafe_summary_write_requested");
});

runCase("blocked unsafe confidence_level write", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      shouldWriteConfidenceLevel: true,
      proposedConfidenceLevel: "low",
    }),
  );

  assertBlockedPreparation(result, "unsafe_confidence_write_requested");
});

runCase("blocked unsafe status promotion", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      shouldPromoteStoredStatus: true,
      proposedStoredStatus: "ready",
    }),
  );

  assertBlockedPreparation(result, "unsafe_status_promotion_requested");
});

runCase("blocked missing proposed comparison metrics", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      proposedComparisonMetrics: null,
    }),
  );

  assertBlockedPreparation(result, "missing_proposed_comparison_metrics");
});

runCase("blocked unsafe attribution claim", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      proposedComparisonMetrics: {
        ...safeDraft,
        claimPolicy: "claim_attribution",
        isAttributionClaim: true,
      },
    }),
  );

  assertBlockedPreparation(result, "unsafe_attribution_claim_requested");
});

runCase("blocked empty comparable signals", () => {
  const result = prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
    buildPlan({
      proposedComparisonMetrics: {
        ...safeDraft,
        signals: [],
      },
    }),
  );

  assertBlockedPreparation(result, "empty_comparable_signals");
});

console.log("");
console.log("PASSED owner task comparison metrics payload helper verification");
console.log("- mode: prepare_payload_only_no_write");
console.log("- ready decision: ready_for_comparison_metrics_update_payload");
console.log("- blocked decisions verified: 7");
console.log("- payload keys: comparison_metrics only");
console.log("- databaseWritesPerformed: false");
console.log("- no attribution claim allowed");
