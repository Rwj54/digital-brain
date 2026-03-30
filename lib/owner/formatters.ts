import {
  type AiNextAction,
  type AiSummary,
  type OwnerHealthMarker,
  type Tone,
  type WebsiteSummary,
} from "@/lib/owner/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringValue(
  source: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function readNumberValue(
  source: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function readBooleanValue(
  source: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function readStringArrayValue(
  source: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      const strings = value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );

      if (strings.length > 0) {
        return strings;
      }
    }
  }

  return [];
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatWho(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDifficulty(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatConfidence(value: number | null): string {
  if (value === null) {
    return "Confidence not set";
  }

  return `${Math.round(value * 100)}% confidence`;
}

export function formatStatus(value: string): string {
  if (value === "completed") return "Completed";
  if (value === "recommended") return "Recommended";
  return "Open";
}

export function formatDate(value: string | null): string {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatCount(value: number | null): string {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatRating(value: number | null): string {
  if (value === null) return "Not set";
  return `${value.toFixed(1)} / 5`;
}

export function formatConversionRate(value: number | null): string {
  if (value === null) return "Not set";
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

export function getWebsiteAlignmentLabel(summary: WebsiteSummary): string {
  if (!summary.hasTargetDomain || !summary.hasDerivedSiteDomain) {
    return "Cannot check yet";
  }

  return summary.hasDomainAlignment ? "Aligned" : "Needs review";
}

export function getWebsiteAlignmentHelper(summary: WebsiteSummary): string {
  if (!summary.hasSiteUrl) {
    return "A website URL is still needed before domain alignment can be checked.";
  }

  if (!summary.hasDerivedSiteDomain) {
    return "The saved website URL did not produce a usable domain yet.";
  }

  if (!summary.hasTargetDomain) {
    return "Save a target domain so Digital Brain can verify alignment.";
  }

  return summary.hasDomainAlignment
    ? "The saved website URL and target domain currently point to the same domain."
    : "The saved website URL and target domain do not currently point to the same domain.";
}

export function getAiReadinessScore(summary: AiSummary): number | null {
  return readNumberValue(summary, [
    "aiReadinessScore",
    "readinessScore",
    "score",
  ]);
}

export function getAiPlainLanguageSummary(summary: AiSummary): string | null {
  return readStringValue(summary, [
    "plainLanguageSummary",
    "summary",
    "summaryText",
  ]);
}

export function getAiTopIssue(summary: AiSummary): string | null {
  return readStringValue(summary, ["topIssue", "top_issue"]);
}

export function getAiWhyItMatters(summary: AiSummary): string | null {
  return readStringValue(summary, [
    "whyItMatters",
    "why_it_matters",
    "reason",
  ]);
}

export function getAiNamingAlignmentLabel(summary: AiSummary): string {
  const explicit = readStringValue(summary, [
    "namingAlignmentLabel",
    "nameAlignmentLabel",
  ]);
  if (explicit) return explicit;

  const alignment = readBooleanValue(summary, [
    "hasNamingAlignment",
    "namingAlignment",
    "hasNameAlignment",
    "nameAlignment",
  ]);

  if (alignment === null) {
    return "Cannot check yet";
  }

  return alignment ? "Aligned" : "Needs review";
}

export function getAiNamingAlignmentHelper(summary: AiSummary): string {
  const explicit = readStringValue(summary, [
    "namingAlignmentExplanation",
    "namingAlignmentHelper",
    "nameAlignmentExplanation",
    "nameAlignmentHelper",
  ]);
  if (explicit) return explicit;

  const targetBrand = readStringValue(summary, [
    "projectTargetBrandName",
    "targetBrandName",
    "savedBrandName",
  ]);
  const gbpName = summary.gbpName ?? null;
  const alignment = readBooleanValue(summary, [
    "hasNamingAlignment",
    "namingAlignment",
    "hasNameAlignment",
    "nameAlignment",
  ]);

  if (!targetBrand || !gbpName) {
    return "A saved brand name and visible GBP name are both needed before naming alignment can be checked.";
  }

  if (alignment === null) {
    return "Digital Brain has the identity values, but the naming alignment result is not available yet.";
  }

  return alignment
    ? "The saved brand identity and visible GBP name look aligned."
    : "The saved brand identity and visible GBP name do not fully align yet.";
}

export function getAiCategoryAlignmentLabel(summary: AiSummary): string {
  const explicit = readStringValue(summary, ["categoryAlignmentLabel"]);
  if (explicit) return explicit;

  const alignment = readBooleanValue(summary, [
    "hasCategoryAlignment",
    "categoryAlignment",
  ]);

  if (alignment === null) {
    return "Cannot check yet";
  }

  return alignment ? "Aligned" : "Needs review";
}

export function getAiCategoryAlignmentHelper(summary: AiSummary): string {
  const explicit = readStringValue(summary, [
    "categoryAlignmentExplanation",
    "categoryAlignmentHelper",
  ]);
  if (explicit) return explicit;

  const projectCategory = readStringValue(summary, [
    "projectCategory",
    "targetCategory",
    "savedCategory",
  ]);
  const primaryCategory = summary.primaryCategory ?? null;
  const alignment = readBooleanValue(summary, [
    "hasCategoryAlignment",
    "categoryAlignment",
  ]);

  if (!projectCategory || !primaryCategory) {
    return "A saved project category and visible GBP primary category are both needed before category alignment can be checked.";
  }

  if (alignment === null) {
    return "Digital Brain has the category values, but the category alignment result is not available yet.";
  }

  return alignment
    ? "The saved project category and visible GBP primary category look aligned."
    : "The saved project category and visible GBP primary category do not fully align yet.";
}

export function getAiNextAction(summary: AiSummary): AiNextAction {
  const fallbackReason =
    getAiWhyItMatters(summary) ??
    "Digital Brain still needs clearer business identity signals for stronger AI visibility.";

  if (isRecord(summary.nextAction)) {
    return {
      title:
        readStringValue(summary.nextAction, ["title"]) ??
        "Strengthen the saved business identity",
      whoShouldDoIt:
        readStringValue(summary.nextAction, [
          "whoShouldDoIt",
          "who_should_do_it",
        ]) ?? "Owner",
      difficulty:
        readStringValue(summary.nextAction, ["difficulty"]) ?? "Easy",
      reason:
        readStringValue(summary.nextAction, ["reason"]) ?? fallbackReason,
    };
  }

  return {
    title: "Strengthen the saved business identity",
    whoShouldDoIt: "Owner",
    difficulty: "Easy",
    reason: fallbackReason,
  };
}

export function getAiEvidence(summary: AiSummary): string[] {
  const explicitEvidence = readStringArrayValue(summary, ["evidence"]);
  if (explicitEvidence.length > 0) {
    return explicitEvidence;
  }

  const hasBusinessName = summary.hasBusinessName === true;
  const hasPrimaryCategory = summary.hasPrimaryCategory === true;
  const hasReviewSignals = summary.hasReviewSignals === true;

  return [
    `Business name present: ${hasBusinessName ? "yes" : "no"}.`,
    `Primary category present: ${hasPrimaryCategory ? "yes" : "no"}.`,
    `Review signals present: ${hasReviewSignals ? "yes" : "no"}.`,
  ];
}

export function getHealthTone(label: OwnerHealthMarker["label"]): Tone {
  if (label === "Visibility") {
    return { solid: "var(--brand-600)", soft: "var(--brand-100)" };
  }

  if (label === "Trust") {
    return { solid: "var(--accent-blue-600)", soft: "var(--accent-blue-100)" };
  }

  if (label === "Clarity") {
    return { solid: "var(--accent-mint-600)", soft: "var(--accent-mint-100)" };
  }

  return { solid: "var(--success)", soft: "var(--success-soft)" };
}

export function getScoreStatusTone(score: number): Tone {
  if (score >= 80) {
    return { solid: "var(--success)", soft: "var(--success-soft)" };
  }

  if (score >= 65) {
    return { solid: "var(--brand-600)", soft: "var(--brand-100)" };
  }

  if (score >= 45) {
    return { solid: "var(--warning)", soft: "var(--warning-soft)" };
  }

  return { solid: "var(--danger)", soft: "var(--danger-soft)" };
}

export function getStepTone(status: string): Tone {
  if (status === "completed") {
    return { solid: "var(--success)", soft: "var(--success-soft)" };
  }

  if (status === "recommended") {
    return { solid: "var(--accent-blue-600)", soft: "var(--accent-blue-100)" };
  }

  return { solid: "var(--brand-600)", soft: "var(--brand-100)" };
}

export function getSummaryTone(
  kind: "visibility" | "ai" | "website" | "outcomes",
): Tone {
  if (kind === "visibility") {
    return { solid: "var(--brand-600)", soft: "var(--brand-100)" };
  }

  if (kind === "ai") {
    return { solid: "var(--accent-mint-600)", soft: "var(--accent-mint-100)" };
  }

  if (kind === "website") {
    return { solid: "var(--accent-blue-600)", soft: "var(--accent-blue-100)" };
  }

  return { solid: "var(--success)", soft: "var(--success-soft)" };
}

export function getStepNumberTone(index: number): Tone {
  if (index === 1) {
    return { solid: "#ffffff", soft: "var(--brand-700)" };
  }

  return { solid: "var(--text-strong)", soft: "var(--reference-soft)" };
}