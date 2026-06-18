import { execFileSync } from "node:child_process";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_PROJECT_ID = "13dfd7b7-3742-4bfc-98dc-fdb8cda90294";
const DEFAULT_LIMIT = "100";

const baseUrl = process.env.DIGITAL_BRAIN_BASE_URL ?? DEFAULT_BASE_URL;
const projectId = process.env.DIGITAL_BRAIN_PROJECT_ID ?? DEFAULT_PROJECT_ID;
const limit = process.env.DIGITAL_BRAIN_IMPACT_SCAN_LIMIT ?? DEFAULT_LIMIT;
const useVercelCurl = process.env.USE_VERCEL_CURL === "1";

function fetchJsonWithVercelCurl(url, method = "GET") {
  const args = ["-y", "vercel@latest", "curl", url];

  if (method === "POST") {
    args.push("-X", "POST");
  }

  const output = execFileSync("npx", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    status: null,
    json: JSON.parse(output),
  };
}

async function fetchJson(url, method = "GET") {
  if (useVercelCurl) {
    return fetchJsonWithVercelCurl(url, method);
  }

  const response = await fetch(url, { method });
  const body = await response.text();

  try {
    return {
      status: response.status,
      json: JSON.parse(body),
    };
  } catch {
    throw new Error(
      `Expected JSON response from ${method} ${url}, received: ${body.slice(0, 500)}`,
    );
  }
}

function getComparisonMetricsKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value);
}

function isEligibleCandidate(impact) {
  const readiness = impact.readiness ?? {};
  const reviewComparison = impact.reviewComparison ?? {};
  const eligibility = impact.comparisonEligibility ?? {};
  const writePlan = impact.comparisonWritePlan ?? {};
  const comparisonMetricsKeys = getComparisonMetricsKeys(impact.comparison_metrics);

  return (
    comparisonMetricsKeys.length === 0 &&
    impact.impact_summary === null &&
    impact.confidence_level === null &&
    readiness.isWindowReady === true &&
    reviewComparison.canCompare === true &&
    eligibility.isEligibleForComparisonMetricsWrite === true &&
    eligibility.canWriteImpactSummary === false &&
    eligibility.canWriteConfidenceLevel === false &&
    eligibility.canPromoteStoredStatus === false &&
    writePlan.isEligibleForFutureComparisonMetricsWrite === true &&
    writePlan.shouldWriteComparisonMetrics === true &&
    writePlan.shouldWriteImpactSummary === false &&
    writePlan.shouldWriteConfidenceLevel === false &&
    writePlan.shouldPromoteStoredStatus === false
  );
}

function getCandidateReason(impact) {
  const readiness = impact.readiness ?? {};
  const reviewComparison = impact.reviewComparison ?? {};
  const eligibility = impact.comparisonEligibility ?? {};
  const writePlan = impact.comparisonWritePlan ?? {};
  const comparisonMetricsKeys = getComparisonMetricsKeys(impact.comparison_metrics);

  if (comparisonMetricsKeys.length > 0) return "blocked: comparison_metrics already exists";
  if (impact.impact_summary !== null) return "blocked: impact_summary is already populated";
  if (impact.confidence_level !== null) return "blocked: confidence_level is already populated";
  if (readiness.isWindowReady !== true) return "blocked: impact watch window is not ready";
  if (reviewComparison.canCompare !== true) return "blocked: review comparison is not ready";
  if (eligibility.isEligibleForComparisonMetricsWrite !== true) return "blocked: comparison metrics write eligibility is false";
  if (writePlan.isEligibleForFutureComparisonMetricsWrite !== true) return "blocked: write plan is not eligible for future comparison metrics write";
  if (writePlan.shouldWriteComparisonMetrics !== true) return "blocked: write plan does not allow comparison_metrics draft";

  return "candidate: eligible dry-run comparison_metrics preview";
}

function requireNoWritePost(post) {
  const errors = [];
  const writeBoundary = post.writeBoundary ?? {};
  const payloadPreparation = post.comparisonMetricsPayloadPreparation ?? {};
  const executionPlan = post.comparisonMetricsWriteExecutionPlan ?? {};
  const impact = post.impact ?? {};
  const updatePayload = executionPlan.updatePayload;

  if (post.ok !== false) errors.push("POST ok is not false");
  if (post.mode !== "eligible_future_write_dry_run_only_no_write") errors.push(`POST mode changed: ${post.mode}`);
  if (writeBoundary.databaseWritesPerformed !== false) errors.push("POST databaseWritesPerformed is not false");
  if (writeBoundary.writeRouteEnabled !== false) errors.push("POST writeRouteEnabled is not false");
  if (writeBoundary.shouldWriteImpactSummary !== false) errors.push("POST shouldWriteImpactSummary is not false");
  if (writeBoundary.shouldWriteConfidenceLevel !== false) errors.push("POST shouldWriteConfidenceLevel is not false");
  if (writeBoundary.shouldPromoteStoredStatus !== false) errors.push("POST shouldPromoteStoredStatus is not false");
  if (writeBoundary.attributionClaimAllowed !== false) errors.push("POST attributionClaimAllowed is not false");
  if (payloadPreparation.databaseWritesPerformed !== false) errors.push("POST payloadPreparation databaseWritesPerformed is not false");
  if (payloadPreparation.decision !== "ready_for_comparison_metrics_update_payload") errors.push(`POST payload decision changed: ${payloadPreparation.decision}`);
  if (executionPlan.mode !== "execution_plan_only_no_write") errors.push(`POST execution plan mode changed: ${executionPlan.mode}`);
  if (executionPlan.decision !== "ready_but_write_disabled") errors.push(`POST execution decision changed: ${executionPlan.decision}`);
  if (executionPlan.canExecuteDatabaseWrite !== false) errors.push("POST canExecuteDatabaseWrite is not false");
  if (executionPlan.databaseWritesPerformed !== false) errors.push("POST execution plan databaseWritesPerformed is not false");
  if (executionPlan.writeRouteEnabled !== false) errors.push("POST execution plan writeRouteEnabled is not false");
  if (impact.impact_summary !== null) errors.push("POST impact_summary is not null");
  if (impact.confidence_level !== null) errors.push("POST confidence_level is not null");

  const updatePayloadKeys =
    updatePayload && typeof updatePayload === "object" ? Object.keys(updatePayload) : [];

  if (updatePayloadKeys.length !== 1 || updatePayloadKeys[0] !== "comparison_metrics") {
    errors.push(`POST updatePayload keys are not comparison_metrics only: ${updatePayloadKeys.join(", ")}`);
  }

  if (updatePayload?.comparison_metrics?.isAttributionClaim !== false) {
    errors.push("POST comparison_metrics isAttributionClaim is not false");
  }

  return errors;
}

async function main() {
  const impactsUrl = `${baseUrl}/api/projects/${projectId}/owner-task-impacts?limit=${encodeURIComponent(limit)}`;

  console.log();
  console.log("Inspecting owner task impact eligible candidates");
  console.log("Boundary: read-only scan, dry-run route check only, no writes");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Project: ${projectId}`);
  console.log(`Limit: ${limit}`);
  console.log(`Vercel curl: ${useVercelCurl ? "yes" : "no"}`);
  console.log();

  const impactsResponse = await fetchJson(impactsUrl, "GET");
  const impactsJson = impactsResponse.json;

  if (impactsJson.ok !== true) {
    console.error("FAILED owner-task-impacts scan did not return ok:true");
    console.error(JSON.stringify(impactsJson, null, 2));
    process.exit(1);
  }

  const impacts = Array.isArray(impactsJson.impacts) ? impactsJson.impacts : [];
  const candidates = impacts.filter(isEligibleCandidate);
  const firstCandidate = candidates[0] ?? null;

  console.log("Scan summary");
  console.log(`- inspected rows: ${impacts.length}`);
  console.log(`- candidate count: ${candidates.length}`);
  console.log(`- route summary comparisonMetricsWriteEligible: ${impactsJson.summary?.comparisonMetricsWriteEligible ?? "unknown"}`);
  console.log(`- route summary impactSummaryWriteEligible: ${impactsJson.summary?.impactSummaryWriteEligible ?? "unknown"}`);
  console.log(`- route summary confidenceWriteEligible: ${impactsJson.summary?.confidenceWriteEligible ?? "unknown"}`);
  console.log(`- route summary statusPromotionEligible: ${impactsJson.summary?.statusPromotionEligible ?? "unknown"}`);
  console.log();

  for (const impact of impacts) {
    const readiness = impact.readiness ?? {};
    const reviewComparison = impact.reviewComparison ?? {};
    const eligibility = impact.comparisonEligibility ?? {};
    const writePlan = impact.comparisonWritePlan ?? {};
    const comparisonMetricsKeys = getComparisonMetricsKeys(impact.comparison_metrics);

    console.log(`Impact ${impact.id}`);
    console.log(`- owner_task_id: ${impact.owner_task_id}`);
    console.log(`- stored_status: ${impact.status}`);
    console.log(`- computed_status: ${readiness.computedStatus ?? null}`);
    console.log(`- isWindowReady: ${readiness.isWindowReady ?? null}`);
    console.log(`- daysRemaining: ${readiness.daysRemaining ?? null}`);
    console.log(`- canCompareNow: ${impact.comparisonPlan?.canCompareNow ?? null}`);
    console.log(`- review_canCompare: ${reviewComparison.canCompare ?? null}`);
    console.log(`- comparisonMetricsWriteEligible: ${eligibility.isEligibleForComparisonMetricsWrite ?? null}`);
    console.log(`- writePlanDecision: ${writePlan.decision ?? null}`);
    console.log(`- shouldWriteComparisonMetrics: ${writePlan.shouldWriteComparisonMetrics ?? null}`);
    console.log(`- impact_summary: ${impact.impact_summary}`);
    console.log(`- confidence_level: ${impact.confidence_level}`);
    console.log(`- comparison_metrics_keys: ${comparisonMetricsKeys.length > 0 ? comparisonMetricsKeys.join(", ") : "(none)"}`);
    console.log(`- candidate: ${isEligibleCandidate(impact)}`);
    console.log(`- reason: ${getCandidateReason(impact)}`);
    console.log();
  }

  if (!firstCandidate) {
    console.log("PASSED owner task impact eligible candidate inspection");
    console.log("- inspected rows reported");
    console.log("- candidate count: 0");
    console.log("- no eligible dry-run candidate found");
    console.log("- databaseWritesPerformed: false");
    console.log("- writeRouteEnabled: false");
    console.log("- no POST route call was needed");
    return;
  }

  const postUrl = `${baseUrl}/api/projects/${projectId}/owner-task-impact-comparison-write-plan?impactId=${encodeURIComponent(firstCandidate.id)}`;
  const postResponse = await fetchJson(postUrl, "POST");
  const post = postResponse.json;
  const errors = requireNoWritePost(post);

  console.log("First eligible candidate dry-run route check");
  console.log(`- first eligible impact_id: ${firstCandidate.id}`);
  console.log(`- first eligible owner_task_id: ${firstCandidate.owner_task_id}`);
  console.log(`- POST mode: ${post.mode}`);
  console.log(`- POST databaseWritesPerformed: ${post.writeBoundary?.databaseWritesPerformed ?? "unknown"}`);
  console.log(`- POST writeRouteEnabled: ${post.writeBoundary?.writeRouteEnabled ?? "unknown"}`);
  console.log(`- payloadPreparation decision: ${post.comparisonMetricsPayloadPreparation?.decision ?? "unknown"}`);
  console.log(`- executionPlan decision: ${post.comparisonMetricsWriteExecutionPlan?.decision ?? "unknown"}`);
  console.log(`- executionPlan databaseWritesPerformed: ${post.comparisonMetricsWriteExecutionPlan?.databaseWritesPerformed ?? "unknown"}`);
  console.log(`- executionPlan writeRouteEnabled: ${post.comparisonMetricsWriteExecutionPlan?.writeRouteEnabled ?? "unknown"}`);

  if (errors.length > 0) {
    console.log();
    console.error("FAILED eligible candidate dry-run no-write verification");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log();
  console.log("PASSED owner task impact eligible candidate inspection");
  console.log(`- inspected rows: ${impacts.length}`);
  console.log(`- candidate count: ${candidates.length}`);
  console.log(`- first eligible impact_id: ${firstCandidate.id}`);
  console.log(`- first eligible owner_task_id: ${firstCandidate.owner_task_id}`);
  console.log(`- POST mode: ${post.mode}`);
  console.log("- databaseWritesPerformed: false");
  console.log("- writeRouteEnabled: false");
  console.log("- updatePayload keys: comparison_metrics only when dry-run ready");
  console.log("- no attribution claim allowed");
}

main().catch((error) => {
  console.error();
  console.error("FAILED owner task impact eligible candidate inspection");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
