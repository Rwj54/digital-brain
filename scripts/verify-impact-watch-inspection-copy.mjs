import { readFileSync } from "node:fs";

const pagePath = "app/projects/[projectId]/impact-watches/page.tsx";
const source = readFileSync(pagePath, "utf8");

function assertIncludes(snippet, description) {
  if (!source.includes(snippet)) {
    throw new Error(`Missing required inspection copy: ${description}`);
  }
}

function assertExcludes(snippet, description) {
  if (source.includes(snippet)) {
    throw new Error(`Unsafe inspection copy found: ${description}`);
  }
}

console.log();
console.log("Verifying impact watch inspection copy guard");
console.log("Boundary: static page source only, no runtime calls, no writes");
console.log();

const requiredSnippets = [
  ["Changed since baseline preview", "changed-since-baseline preview heading"],
  ["Waiting for window", "waiting-state label"],
  ["Read-only", "read-only preview label"],
  ["No attribution claim", "no-attribution label"],
  [
    "should wait until the watch window is complete",
    "watch-window waiting explanation",
  ],
  [
    "reviewComparison.noClaimLanguage",
    "dynamic no-claim language is rendered from API data",
  ],
  [
    "This inspection row is read-only. It does not write comparison_metrics",
    "row-level no-write copy",
  ],
  [
    "impact_summary, confidence_level, or promote stored impact status",
    "blocked unsafe write fields copy",
  ],
];

for (const [snippet, description] of requiredSnippets) {
  assertIncludes(snippet, description);
}

const forbiddenPositiveClaims = [
  ["This action caused the change.", "positive action causation claim"],
  ["This task caused the change.", "positive task causation claim"],
  ["This action improved reviews.", "positive review-improvement attribution claim"],
  ["This task improved reviews.", "positive task-improvement attribution claim"],
  ["This action worked.", "positive worked claim"],
  ["The action worked.", "positive worked claim"],
  ["Digital Brain proved this action worked.", "proof claim"],
  ["Digital Brain proved this task worked.", "proof claim"],
  ["Attribution confirmed", "confirmed attribution claim"],
  ["Impact confirmed", "confirmed impact claim"],
];

for (const [snippet, description] of forbiddenPositiveClaims) {
  assertExcludes(snippet, description);
}

const forbiddenWriteMethods = [
  ['method: "POST"', "POST method"],
  ["method: 'POST'", "POST method"],
  ['method: "PATCH"', "PATCH method"],
  ["method: 'PATCH'", "PATCH method"],
  ['method: "PUT"', "PUT method"],
  ["method: 'PUT'", "PUT method"],
  ['method: "DELETE"', "DELETE method"],
  ["method: 'DELETE'", "DELETE method"],
];

for (const [snippet, description] of forbiddenWriteMethods) {
  assertExcludes(snippet, description);
}

console.log("PASSED impact watch inspection copy guard");
console.log("- required changed-since-baseline preview copy is present");
console.log("- dynamic no-claim language is rendered");
console.log("- read-only and no-attribution labels are present");
console.log("- positive attribution claim phrases are absent");
console.log("- write methods are absent from the inspection page");
console.log("- databaseWritesPerformed: false");
