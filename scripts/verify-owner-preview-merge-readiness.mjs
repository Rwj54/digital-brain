import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function assertEqual(actual, expected, description) {
  if (actual !== expected) {
    throw new Error(`${description}: expected ${expected}, received ${actual}`);
  }
}

function assertTruthy(value, description) {
  if (!value) {
    throw new Error(description);
  }
}

console.log();
console.log("Verifying owner preview merge readiness");
console.log("Boundary: local git/readiness check only, no merge, no writes");
console.log();

const branch = runGit(["branch", "--show-current"]);
const head = runGit(["rev-parse", "--short", "HEAD"]);
const headFull = runGit(["rev-parse", "HEAD"]);
const originMain = runGit(["rev-parse", "origin/main"]);
const mergeBase = runGit(["merge-base", "origin/main", "HEAD"]);
const status = runGit(["status", "--short"]);
const aheadBehind = runGit([
  "rev-list",
  "--left-right",
  "--count",
  "origin/main...HEAD",
]);

const [behindText, aheadText] = aheadBehind.split(/\s+/);
const behind = Number(behindText);
const ahead = Number(aheadText);

assertEqual(branch, "phase-3j-owner-ui-preview", "preview branch check");
assertEqual(status, "", "working tree must be clean");
assertEqual(mergeBase, originMain, "merge base must be origin/main");
assertEqual(behind, 0, "branch must not be behind origin/main");
assertTruthy(ahead > 0, "branch must be ahead of origin/main");
assertTruthy(
  existsSync("docs/phase-3j-owner-ui-preview-merge-checklist.md"),
  "merge checklist must exist",
);

console.log("PASSED owner preview merge readiness verification");
console.log(`- branch: ${branch}`);
console.log(`- head: ${head}`);
console.log(`- full SHA: ${headFull}`);
console.log(`- origin/main: ${originMain}`);
console.log(`- ahead of origin/main: ${ahead}`);
console.log(`- behind origin/main: ${behind}`);
console.log("- working tree: clean");
console.log("- merge checklist: present");
console.log("- decision: preview branch is ready for continued preview work");
console.log("- decision: direct merge to main is still not approved");
