import assert from "node:assert/strict";
import { buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan } from "../lib/owner/taskImpactComparisonMetricsWriteExecution.ts";
import { prepareOwnerTaskImpactComparisonMetricsUpdatePayload } from "../lib/owner/taskImpactComparisonMetricsWrite.ts";

const safeDraft = {
  generatedAt: "2026-06-12T15:00:00.000Z",
  intent: "reviews",
  claimPolicy: "compare_only_no_attribution",
  isAttributionClaim: false,
  baseline: {
    totalReviews: 10,
    rating: 4.5,
    topCompetitorReviews: 100,
    reviewGap: 90,
  },
  current: {
    totalReviews: 12,
    rating: 4.6,
    topCompetitorReviews: 101,
    reviewGap: 89,
  },
  signals: [
    {
      key: "total_reviews",
      label: "Review count",
      baselineValue: 10,
      currentValue: 12,
      changeValue: 2,
      comparisonDirection: "higher_is_better",
      ownerRead:
        "Review count increased during the watch window, but this is not proof that the task caused the change.",
    },
  ],
};

const readyWritePlan = {
  mode: "plan_only_no_write",
  decision: "eligible_for_future_comparison_metrics_write",
  shouldWriteComparisonMetrics: true,
  shouldWriteImpactSummary: false,
  shouldWriteConfidenceLevel: false,
  shouldPromoteStoredStatus: false,
  shouldClaimAttribution: false,
  proposedComparisonMetrics: safeDraft,
  ownerSummary:
    "This impact can produce a conservative comparison_metrics draft only.",
  blockedReason: null,
  requiredBeforeWrite: [
    "Accept a separate write boundary before enabling database updates.",
    "Write only comparison_metrics.",
    "Keep impact_summary null.",
    "Keep confidence_level null.",
    "Do not promote owner_task_impacts.status.",
    "Keep owner-facing language compare-only and no-attribution.",
  ],
  noClaimLanguage:
    "Digital Brain can compare signals after the watch window, but it should not claim this task caused the change without stronger proof.",
};

const baseImpact = {
  id: "impact-123",
  project_id: "project-123",
  owner_task_id: "task-123",
  captured_at: "2026-06-01",
  impact_window_days: 30,
  status: "window_ready",
  source: "owner_task_completion",
  baseline_metrics: {},
  comparison_metrics: {},
  impact_summary: null,
  confidence_level: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
  comparisonWritePlan: readyWritePlan,
};

function runCase(name, fn) {
  fn();
  console.log(`PASSED ${name}`);
}

function assertAlwaysNoWrite(result) {
  assert.equal(result.mode, "execution_plan_only_no_write");
  assert.equal(result.canExecuteDatabaseWrite, false);
  assert.equal(result.databaseWritesPerformed, false);
  assert.equal(result.writeRouteEnabled, false);
  assert.equal(result.table, "owner_task_impacts");
  assert.ok(result.safeguards.includes("The execution boundary is disabled."));
  assert.ok(
    result.safeguards.includes(
      "The update payload may contain comparison_metrics only.",
    ),
  );
  assert.ok(
    result.safeguards.includes(
      "impact_summary must not be included in the update payload.",
    ),
  );
  assert.ok(
    result.safeguards.includes(
      "confidence_level must not be included in the update payload.",
    ),
  );
  assert.ok(
    result.safeguards.includes(
      "owner_task_impacts.status must not be included in the update payload.",
    ),
  );
}

console.log("Verifying owner task impact write execution plan");
console.log("Boundary: execution plan only, no database writes");

const readyPayloadPreparation =
  prepareOwnerTaskImpactComparisonMetricsUpdatePayload(readyWritePlan);

assert.equal(
  readyPayloadPreparation.decision,
  "ready_for_comparison_metrics_update_payload",
);

runCase("ready plan remains write-disabled", () => {
  const result = buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: baseImpact,
    comparisonMetricsPayloadPreparation: readyPayloadPreparation,
  });

  assertAlwaysNoWrite(result);
  assert.equal(result.decision, "ready_but_write_disabled");
  assert.deepEqual(result.match, {
    id: "impact-123",
    project_id: "project-123",
  });
  assert.deepEqual(Object.keys(result.updatePayload), ["comparison_metrics"]);
  assert.equal(
    result.updatePayload.comparison_metrics.claimPolicy,
    "compare_only_no_attribution",
  );
  assert.equal(result.updatePayload.comparison_metrics.isAttributionClaim, false);
  assert.equal(
    result.blockedReason,
    "Comparison metrics database writes are intentionally disabled at this boundary.",
  );
});

runCase("blocked when impact identity is missing", () => {
  const result = buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: {
      ...baseImpact,
      id: "",
    },
    comparisonMetricsPayloadPreparation: readyPayloadPreparation,
  });

  assertAlwaysNoWrite(result);
  assert.equal(result.decision, "missing_impact_identity");
  assert.equal(result.match, null);
  assert.equal(result.updatePayload, null);
});

runCase("blocked when payload is not ready", () => {
  const blockedPayloadPreparation =
    prepareOwnerTaskImpactComparisonMetricsUpdatePayload({
      ...readyWritePlan,
      shouldWriteComparisonMetrics: false,
      proposedComparisonMetrics: null,
      blockedReason: "Not eligible in this test case.",
    });

  const result = buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: baseImpact,
    comparisonMetricsPayloadPreparation: blockedPayloadPreparation,
  });

  assertAlwaysNoWrite(result);
  assert.equal(result.decision, "payload_not_ready");
  assert.deepEqual(result.match, {
    id: "impact-123",
    project_id: "project-123",
  });
  assert.equal(result.updatePayload, null);
});

runCase("blocked when payload shape is unsafe", () => {
  const result = buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: baseImpact,
    comparisonMetricsPayloadPreparation: {
      ...readyPayloadPreparation,
      updatePayload: {
        comparison_metrics: safeDraft,
        impact_summary: "Unsafe summary should never be allowed.",
      },
    },
  });

  assertAlwaysNoWrite(result);
  assert.equal(result.decision, "unsafe_payload_shape");
  assert.equal(result.updatePayload, null);
});

runCase("blocked when comparison metrics already exist", () => {
  const result = buildOwnerTaskImpactComparisonMetricsWriteExecutionPlan({
    impact: {
      ...baseImpact,
      comparison_metrics: {
        existing: true,
      },
    },
    comparisonMetricsPayloadPreparation: readyPayloadPreparation,
  });

  assertAlwaysNoWrite(result);
  assert.equal(result.decision, "existing_comparison_metrics_present");
  assert.equal(result.updatePayload, null);
});

console.log();
console.log("PASSED owner task impact write execution plan verification");
console.log("- mode: execution_plan_only_no_write");
console.log("- ready decision: ready_but_write_disabled");
console.log("- target table: owner_task_impacts");
console.log("- match keys: id and project_id");
console.log("- payload keys: comparison_metrics only");
console.log("- databaseWritesPerformed: false");
