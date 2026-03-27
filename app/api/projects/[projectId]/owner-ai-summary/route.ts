import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type GbpProfileRow = {
  gbp_name: string | null;
  primary_category: string | null;
  total_reviews: number | null;
  rating: number | null;
};

type ProjectRow = {
  target_brand_name: string | null;
  category: string | null;
  target_domain: string | null;
  site_url: string | null;
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCompare(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function valuesLooselyMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeCompare(left);
  const b = normalizeCompare(right);

  if (!a || !b) {
    return false;
  }

  return a === b || a.includes(b) || b.includes(a);
}

function buildAiSummary(input: {
  gbp: GbpProfileRow | null;
  project: ProjectRow | null;
}) {
  const gbpName = normalizeText(input.gbp?.gbp_name);
  const primaryCategory = normalizeText(input.gbp?.primary_category);
  const totalReviews = input.gbp?.total_reviews ?? null;
  const rating = input.gbp?.rating ?? null;

  const targetBrandName = normalizeText(input.project?.target_brand_name);
  const projectCategory = normalizeText(input.project?.category);
  const targetDomain = normalizeText(input.project?.target_domain);
  const siteUrl = normalizeText(input.project?.site_url);

  const hasBusinessName = Boolean(gbpName);
  const hasPrimaryCategory = Boolean(primaryCategory);
  const hasReviewSignals = Boolean((totalReviews ?? 0) > 0 || (rating ?? 0) > 0);
  const hasTargetBrandName = Boolean(targetBrandName);
  const hasProjectCategory = Boolean(projectCategory);
  const hasWebsiteAnchor = Boolean(targetDomain || siteUrl);

  const nameMatchesBrand = hasBusinessName && hasTargetBrandName
    ? valuesLooselyMatch(gbpName, targetBrandName)
    : false;

  const categoryMatchesProject = hasPrimaryCategory && hasProjectCategory
    ? valuesLooselyMatch(primaryCategory, projectCategory)
    : false;

  let aiReadinessLabel = "Very limited AI readiness";
  let aiReadinessScore = 18;
  let plainLanguageSummary =
    "Digital Brain does not have enough saved identity and trust detail yet for a strong AI visibility read.";
  let topIssue = "The business identity foundation is still too thin.";
  let whyItMatters =
    "Machines need clear business identity, category clarity, and trust signals before they can understand the business reliably.";
  let nextActionTitle = "Complete the core GBP identity fields";
  let nextActionWho = "Owner or marketing lead";
  let nextActionDifficulty = "Easy";
  let nextActionReason =
    "A stronger GBP identity foundation improves machine understanding and makes future AI visibility guidance more reliable.";

  if (!hasBusinessName) {
    aiReadinessLabel = "AI identity is missing a business name";
    aiReadinessScore = 18;
    plainLanguageSummary =
      "The saved GBP data does not yet include a business name, so AI-facing identity is still weak.";
    topIssue = "The business name is missing from the saved GBP snapshot.";
    whyItMatters =
      "Without a clear business name, machines have less confidence about who this business is.";
    nextActionTitle = "Save the GBP business name";
    nextActionWho = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "A clear business name is one of the most basic inputs for machine understanding.";
  } else if (!hasPrimaryCategory) {
    aiReadinessLabel = "AI identity is missing category clarity";
    aiReadinessScore = 34;
    plainLanguageSummary =
      "The business name is saved, but category clarity is still missing from the GBP snapshot.";
    topIssue = "The primary category is not saved.";
    whyItMatters =
      "Machines need category clarity to understand what the business does and where it belongs.";
    nextActionTitle = "Save the primary GBP category";
    nextActionWho = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "A clear category helps machines interpret the business more accurately.";
  } else if (!hasReviewSignals) {
    aiReadinessLabel = "AI identity exists, but trust signals are still thin";
    aiReadinessScore = 48;
    plainLanguageSummary =
      "The business identity is present, but saved review signals are too weak to create a stronger trust read.";
    topIssue = "Review trust signals are still limited.";
    whyItMatters =
      "Reviews and ratings help reinforce that the business is real, trusted, and active.";
    nextActionTitle = "Strengthen review signals in GBP data";
    nextActionWho = "Owner or team member";
    nextActionDifficulty = "Medium";
    nextActionReason =
      "More review evidence strengthens trust and helps later AI visibility guidance feel more grounded.";
  } else if (hasTargetBrandName && !nameMatchesBrand) {
    aiReadinessLabel = "AI identity needs naming alignment";
    aiReadinessScore = 63;
    plainLanguageSummary =
      "The GBP identity is mostly solid, but the saved business naming does not look fully aligned yet.";
    topIssue = "GBP business naming and project brand naming do not clearly match.";
    whyItMatters =
      "When names are inconsistent, machines can be less confident that all business references belong to the same entity.";
    nextActionTitle = "Align GBP naming with the saved brand name";
    nextActionWho = "Owner or marketing lead";
    nextActionDifficulty = "Medium";
    nextActionReason =
      "Clear naming alignment reduces entity confusion and improves machine confidence.";
  } else if (hasProjectCategory && !categoryMatchesProject) {
    aiReadinessLabel = "AI identity is good, but category alignment needs review";
    aiReadinessScore = 71;
    plainLanguageSummary =
      "The saved identity and review trust signals are good, but category wording between the project and GBP should be reviewed.";
    topIssue = "Project category and GBP primary category may not be aligned.";
    whyItMatters =
      "Category inconsistency can weaken machine understanding of what the business actually does.";
    nextActionTitle = "Review project category against GBP primary category";
    nextActionWho = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "Consistent business categorization gives machines a cleaner understanding of the business.";
  } else {
    aiReadinessLabel = "Good early AI readiness";
    aiReadinessScore = hasTargetBrandName && hasProjectCategory ? 86 : 79;
    plainLanguageSummary =
      "The saved business identity, category clarity, and review trust signals give Digital Brain a solid early AI visibility foundation.";
    topIssue =
      hasTargetBrandName && hasProjectCategory
        ? "No major AI identity issue is visible from saved project data."
        : "Core AI readiness looks good, but project-level identity detail could still be deepened.";
    whyItMatters =
      "Clear naming, category clarity, and trust signals make the business easier for machines to understand.";
    nextActionTitle =
      hasTargetBrandName && hasProjectCategory
        ? "Keep business identity and category signals consistent"
        : "Add the remaining project identity anchors";
    nextActionWho = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      hasTargetBrandName && hasProjectCategory
        ? "Consistency helps preserve trust and machine understanding over time."
        : "The last missing project-level anchors will make AI visibility guidance even more reliable.";
  }

  const evidence: string[] = [
    hasBusinessName
      ? `GBP business name is saved as ${gbpName}.`
      : "GBP business name is missing.",
    hasPrimaryCategory
      ? `GBP primary category is saved as ${primaryCategory}.`
      : "GBP primary category is missing.",
    hasReviewSignals
      ? `Review trust signals are present (${totalReviews ?? 0} reviews, rating ${rating ?? "not set"}).`
      : "Review trust signals are still missing or very thin.",
    hasTargetBrandName
      ? `Project brand name is saved as ${targetBrandName}.`
      : "Project brand name is not saved.",
    hasProjectCategory
      ? `Project category is saved as ${projectCategory}.`
      : "Project category is not saved.",
    hasWebsiteAnchor
      ? "A website/domain anchor is present at the project level."
      : "A website/domain anchor is not yet clearly present at the project level.",
    hasTargetBrandName
      ? nameMatchesBrand
        ? "GBP business naming and project brand naming look aligned."
        : "GBP business naming and project brand naming may not be aligned."
      : "Naming alignment cannot be fully checked yet.",
    hasProjectCategory
      ? categoryMatchesProject
        ? "Project category and GBP primary category look aligned."
        : "Project category and GBP primary category may not be aligned."
      : "Category alignment cannot be fully checked yet.",
  ];

  return {
    gbpName,
    primaryCategory,
    totalReviews,
    rating,
    targetBrandName,
    projectCategory,
    targetDomain,
    siteUrl,
    hasBusinessName,
    hasPrimaryCategory,
    hasReviewSignals,
    hasTargetBrandName,
    hasProjectCategory,
    hasWebsiteAnchor,
    nameMatchesBrand,
    categoryMatchesProject,
    aiReadinessLabel,
    aiReadinessScore,
    plainLanguageSummary,
    topIssue,
    whyItMatters,
    nextAction: {
      title: nextActionTitle,
      whoShouldDoIt: nextActionWho,
      difficulty: nextActionDifficulty,
      reason: nextActionReason,
    },
    evidence,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const [{ data: gbpData, error: gbpError }, { data: projectData, error: projectError }] =
      await Promise.all([
        supabase
          .from("gbp_profiles")
          .select("gbp_name, primary_category, total_reviews, rating")
          .eq("project_id", projectId)
          .maybeSingle<GbpProfileRow>(),
        supabase
          .from("projects")
          .select("target_brand_name, category, target_domain, site_url")
          .eq("id", projectId)
          .maybeSingle<ProjectRow>(),
      ]);

    if (gbpError) {
      throw new Error(
        `Failed to load GBP profile for owner AI summary: ${gbpError.message}`,
      );
    }

    if (projectError) {
      throw new Error(
        `Failed to load project identity for owner AI summary: ${projectError.message}`,
      );
    }

    const summary = buildAiSummary({
      gbp: gbpData ?? null,
      project: projectData ?? null,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner AI summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}