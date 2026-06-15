import assert from "node:assert/strict";

import { prepareOwnerTaskImpactComparisonMetricsUpdatePayload } from "../lib/owner/taskImpactComparisonMetricsWrite.ts";
import { buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan } from "../lib/owner/taskImpactComparisonMetricsWriteExecution.ts";
import { buildOwnerTaskImpactComparisonWritePostResponse } from "../lib/owner/taskImpactComparisonWriteRouteResponse.ts";

const PROJECT_ID = "mock-project-id";
const IMPACT_ID = "mock-impact-id";
const OWNER_TASK_ID = "mock-owner-task-id";
const NO_CLAIM_LANGUAGE =
  "Digital Brain can compare signals after the watch window, but it should not claim this task caused the change without stronger proof.";

const comparisonMetricsDraft = {
  metricsVersion: "owner_task_review_comparison_v1",
  comparisonType: "reviews",
  generatedAt: "2026-07-03T12:00:00.000Z",
  claimPolicy: "compare_only_no_attribution",
  noClaimLanguage: NO_CLAIM_LANGUAGE,
  isAttributionClaim: false,
  baseline: {
    baselineReviewDataAvailable: true,
    baselineCurrentReviews: 282,
    baselineCurrentRating: 4.9,
    baselineProfileLastFetchedAt: "2026-06-02T16:20:52.319+00:00",
    baselineTopCompetitorName: "Janousek Florist & Greenhouse",
    baselineTopCompetitorReviews: 964,
    baselineReviewGap: 682,
  },
  current: {
    currentReviews: 286,
    currentRating: 4.9,
    currentProfileLastFetchedAt: "2026-07-03T16:20:52.319+00:00",
    currentTopCompetitorName: "Janousek Florist & Greenhouse",
    currentTopCompetitorReviews: 970,
    currentReviewGap: 684,
  },
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
  ],
};

const eligibleWritePlan = {
  mode: "plan_only_no_write",
  decision: "eligible_for_future_comparison_metrics_write",
  isEligibleForFutureComparisonMetricsWrite: true,
  shouldWriteComparisonMetrics: true,
  shouldWriteImpactSummary: false,
  shouldWriteConfidenceLevel: false,
  shouldPromoteStoredStatus: false,
  proposedComparisonMetrics: comparisonMetricsDraft,
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
};

const preview = {
  id: IMPACT_ID,
  project_id: PROJECT_ID,
  owner_task_id: OWNER_TASK_ID,
  captured_at: "2026-06-03",
  impact_window_days: 30,
  status: "window_ready",
  source: "owner_task_completion",
  baseline_metrics: comparisonMetricsDraft.baseline,
  comparison_metrics: {},
  impact_summary: null,
  confidence_level: null,
  created_at: "2026-06-03T14:59:42.640901+00:00",
  updated_at: "2026-06-03T21:52:37.361+00:00",
  readiness: {
    eligibleOn: "2026-07-03",
    daysRemaining: 0,
    isWindowReady: true,
    computedStatus: "window_ready",
  },
  comparisonPlan: {
    intent: "reviews",
    canCompareNow: true,
    claimPolicy: "compare_only_no_attribution",
    ownerSummary: "Mock eligible comparison plan.",
    blockedReason: null,
    allowedSources: [],
    contextSources: [],
    futureSources: [],
  },
  reviewComparison: {
    comparisonType: "reviews",
    isWindowReady: true,
    canCompare: true,
    claimPolicy: "compare_only_no_attribution",
    ownerSummary: "Mock eligible review comparison.",
    blockedReason: null,
    baseline: comparisonMetricsDraft.baseline,
    current: comparisonMetricsDraft.current,
    signals: comparisonMetricsDraft.signals.map((signal) => ({
      ...signal,
      hasComparableValues: true,
    })),
    noClaimLanguage: NO_CLAIM_LANGUAGE,
  },
  comparisonEligibility: {
    decision: "eligible_for_comparison_metrics_write",
    isEligibleForComparisonRead: true,
    isEligibleForComparisonMetricsWrite: true,
    canWriteImpactSummary: false,
    canWriteConfidenceLevel: false,
    canPromoteStoredStatus: false,
    recommendedStoredStatus: null,
    ownerSummary: "Mock eligible comparison metrics write.",
    blockedReason: null,
    requiredBeforeWrite: [
      "Keep owner-facing copy clear that no outcome impact has been claimed.",
    ],
    noClaimLanguage: NO_CLAIM_LANGUAGE,
  },
  comparisonWritePlan: eligibleWritePlan,
};

console.log("Verifying route-level eligible comparison write remains no-write");

const comparisonMetricsPayloadPreparation =
  prepareOwnerTaskImpactComparisonMetricsUpdatePayload(eligibleWritePlan);
const comparisonMetricsWriteExecutionPlan =
  buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: preview,
    comparisonMetricsPayloadPreparation,
  });
const response = buildOwnerTaskImpactComparisonWritePostResponse({
  projectId: PROJECT_ID,
  filters: {
    impactId: IMPACT_ID,
    ownerTaskId: null,
  },
  preview,
  comparisonMetricsPayloadPreparation,
  comparisonMetricsWriteExecutionPlan,
});

assert.equal(response.status, 409);
assert.equal(response.body.ok, false);
assert.equal(response.body.mode, "eligible_but_write_disabled_no_write");

assert.equal(response.body.writeBoundary.databaseWritesPerformed, false);
assert.equal(response.body.writeBoundary.writeRouteEnabled, false);
assert.equal(response.body.writeBoundary.shouldWriteComparisonMetrics, true);
assert.equal(response.body.writeBoundary.shouldWriteImpactSummary, false);
assert.equal(response.body.writeBoundary.shouldWriteConfidenceLevel, false);
assert.equal(response.body.writeBoundary.shouldPromoteStoredStatus, false);
assert.equal(response.body.writeBoundary.attributionClaimAllowed, false);

assert.equal(
  response.body.comparisonMetricsPayloadPreparation.mode,
  "prepare_payload_only_no_write",
);
assert.equal(
  response.body.comparisonMetricsPayloadPreparation.decision,
  "ready_for_comparison_metrics_update_payload",
);
assert.equal(
  response.body.comparisonMetricsPayloadPreparation.canWriteComparisonMetrics,
  true,
);
assert.equal(
  response.body.comparisonMetricsPayloadPreparation.databaseWritesPerformed,
  false,
);
assert.deepEqual(
  Object.keys(response.body.comparisonMetricsPayloadPreparation.updatePayload),
  ["comparison_metrics"],
);
assert.equal(
  response.body.comparisonMetricsPayloadPreparation.updatePayload
    .comparison_metrics.claimPolicy,
  "compare_only_no_attribution",
);
assert.equal(
  response.body.comparisonMetricsPayloadPreparation.updatePayload
    .comparison_metrics.isAttributionClaim,
  false,
);

assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.mode,
  "execution_plan_only_no_write",
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.decision,
  "ready_but_write_disabled",
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.canExecuteDatabaseWrite,
  false,
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.databaseWritesPerformed,
  false,
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.writeRouteEnabled,
  false,
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.table,
  "owner_task_impacts",
);
assert.deepEqual(response.body.comparisonMetricsWriteExecutionPlan.match, {
  id: IMPACT_ID,
  project_id: PROJECT_ID,
});
assert.deepEqual(
  Object.keys(response.body.comparisonMetricsWriteExecutionPlan.updatePayload),
  ["comparison_metrics"],
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.updatePayload
    .comparison_metrics.claimPolicy,
  "compare_only_no_attribution",
);
assert.equal(
  response.body.comparisonMetricsWriteExecutionPlan.updatePayload
    .comparison_metrics.isAttributionClaim,
  false,
);

assert.equal(
  response.body.blockedReason,
  "Comparison metrics writes are intentionally disabled at this boundary.",
);
assert.equal(
  response.body.comparisonWritePlanDecision,
  "eligible_for_future_comparison_metrics_write",
);
assert.equal(response.body.noClaimLanguage, NO_CLAIM_LANGUAGE);
assert.deepEqual(response.body.impact, preview);

assert.ok(
  response.body.requiredBeforeWrite.includes(
    "Accept a separate write boundary before enabling database updates.",
  ),
);
assert.ok(response.body.requiredBeforeWrite.includes("Write only comparison_metrics."));
assert.ok(response.body.requiredBeforeWrite.includes("Keep impact_summary null."));
assert.ok(response.body.requiredBeforeWrite.includes("Keep confidence_level null."));
assert.ok(
  response.body.requiredBeforeWrite.includes(
    "Do not promote owner_task_impacts.status.",
  ),
);
assert.ok(
  response.body.requiredBeforeWrite.includes(
    "Keep owner-facing language compare-only and no-attribution.",
  ),
);

console.log("PASSED route-level eligible no-write verification");
console.log("- status: 409");
console.log("- mode: eligible_but_write_disabled_no_write");
console.log("- writeRouteEnabled: false");
console.log("- databaseWritesPerformed: false");
console.log("- payload keys: comparison_metrics only");
console.log("- execution plan: ready_but_write_disabled");
console.log("- no attribution claim allowed");
