#!/usr/bin/env bash
set -euo pipefail

echo
echo "Verifying owner task impact safety suite"
echo "Boundary: route eligible no-write, payload preparation, live impact no-write"
echo

npm run verify:owner-task-impact-route-eligible-no-write
npm run verify:owner-task-impact-comparison-metrics-payload
npm run verify:owner-task-impact-boundary

echo
echo "PASSED owner task impact safety suite"
echo "- route eligible write remains disabled"
echo "- comparison_metrics payload helper remains payload-only"
echo "- owner task impact route boundary remains no-write"
