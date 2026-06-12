#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${DIGITAL_BRAIN_BASE_URL:-http://localhost:3000}"
PROJECT_ID="${DIGITAL_BRAIN_PROJECT_ID:-13dfd7b7-3742-4bfc-98dc-fdb8cda90294}"
OWNER_TASK_ID="${DIGITAL_BRAIN_OWNER_TASK_ID:-a6c659da-766d-4c91-b34b-68a00f8447bb}"
USE_VERCEL_CURL="${USE_VERCEL_CURL:-0}"

OWNER_IMPACTS_URL="${BASE_URL}/api/projects/${PROJECT_ID}/owner-task-impacts?ownerTaskId=${OWNER_TASK_ID}"
PREVIEW_URL="${BASE_URL}/api/projects/${PROJECT_ID}/owner-task-impact-comparison-write-plan?ownerTaskId=${OWNER_TASK_ID}"

OWNER_IMPACTS_JSON="$(mktemp)"
PREVIEW_JSON="$(mktemp)"

cleanup() {
  rm -f "$OWNER_IMPACTS_JSON" "$PREVIEW_JSON"
}

trap cleanup EXIT

fetch_json() {
  local url="$1"

  if [ "$USE_VERCEL_CURL" = "1" ]; then
    npx -y vercel@latest curl "$url"
  else
    curl -fsSL "$url"
  fi
}

printf '\nVerifying owner task impact no-write boundary\n'
printf 'Base URL: %s\n' "$BASE_URL"
printf 'Project: %s\n' "$PROJECT_ID"
printf 'Owner task: %s\n' "$OWNER_TASK_ID"

fetch_json "$OWNER_IMPACTS_URL" > "$OWNER_IMPACTS_JSON"
fetch_json "$PREVIEW_URL" > "$PREVIEW_JSON"

python3 - "$OWNER_IMPACTS_JSON" "$PREVIEW_JSON" <<'PY'
import json
import sys

owner_path = sys.argv[1]
preview_path = sys.argv[2]

with open(owner_path, "r", encoding="utf-8") as file:
    owner = json.load(file)

with open(preview_path, "r", encoding="utf-8") as file:
    preview = json.load(file)

errors = []

def require(condition, message):
    if not condition:
        errors.append(message)

require(owner.get("ok") is True, "owner-task-impacts did not return ok:true")
require(preview.get("ok") is True, "preview route did not return ok:true")
require(preview.get("mode") == "preview_only_no_write", "preview route mode is not preview_only_no_write")

summary = owner.get("summary") or {}
require(summary.get("impactSummaryWriteEligible") == 0, "impactSummaryWriteEligible is not 0")
require(summary.get("confidenceWriteEligible") == 0, "confidenceWriteEligible is not 0")
require(summary.get("statusPromotionEligible") == 0, "statusPromotionEligible is not 0")

write_boundary = preview.get("writeBoundary") or {}
require(write_boundary.get("databaseWritesPerformed") is False, "databaseWritesPerformed is not false")
require(write_boundary.get("shouldWriteImpactSummary") is False, "shouldWriteImpactSummary is not false")
require(write_boundary.get("shouldWriteConfidenceLevel") is False, "shouldWriteConfidenceLevel is not false")
require(write_boundary.get("shouldPromoteStoredStatus") is False, "shouldPromoteStoredStatus is not false")
require(write_boundary.get("attributionClaimAllowed") is False, "attributionClaimAllowed is not false")

impact = preview.get("impact") or {}
require(impact.get("impact_summary") is None, "impact_summary is not null")
require(impact.get("confidence_level") is None, "confidence_level is not null")

comparison_metrics = impact.get("comparison_metrics")
require(isinstance(comparison_metrics, dict), "comparison_metrics is not an object")
require(len(comparison_metrics) == 0, "comparison_metrics is not empty at this no-write checkpoint")

readiness = impact.get("readiness") or {}
if readiness.get("isWindowReady") is False:
    require(
        write_boundary.get("shouldWriteComparisonMetrics") is False,
        "shouldWriteComparisonMetrics should be false while the watch window is not ready",
    )

write_plan = impact.get("comparisonWritePlan") or {}
require(write_plan.get("mode") == "plan_only_no_write", "comparisonWritePlan mode is not plan_only_no_write")
require(write_plan.get("shouldWriteImpactSummary") is False, "write plan shouldWriteImpactSummary is not false")
require(write_plan.get("shouldWriteConfidenceLevel") is False, "write plan shouldWriteConfidenceLevel is not false")
require(write_plan.get("shouldPromoteStoredStatus") is False, "write plan shouldPromoteStoredStatus is not false")
require(write_plan.get("proposedImpactSummary") is None, "write plan proposedImpactSummary is not null")
require(write_plan.get("proposedConfidenceLevel") is None, "write plan proposedConfidenceLevel is not null")
require(write_plan.get("proposedStoredStatus") is None, "write plan proposedStoredStatus is not null")

if errors:
    print("\nFAILED owner task impact no-write boundary verification")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("\nPASSED owner task impact no-write boundary verification")
print(f"- owner-task-impacts ok: {owner.get('ok')}")
print(f"- preview ok: {preview.get('ok')}")
print(f"- preview mode: {preview.get('mode')}")
print(f"- databaseWritesPerformed: {write_boundary.get('databaseWritesPerformed')}")
print(f"- impact_summary: {impact.get('impact_summary')}")
print(f"- confidence_level: {impact.get('confidence_level')}")
print(f"- comparisonWritePlan mode: {write_plan.get('mode')}")
PY
