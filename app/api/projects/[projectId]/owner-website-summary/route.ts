import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectRow = {
  site_url: string | null;
  target_domain: string | null;
  target_brand_name: string | null;
  category: string | null;
  metro: string | null;
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

function normalizeDomain(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  try {
    const withProtocol =
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalized}`;

    return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return normalized
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

function getDerivedSiteDomain(siteUrl: string | null | undefined): string | null {
  return normalizeDomain(siteUrl);
}

function buildWebsiteSummary(project: ProjectRow) {
  const siteUrl = normalizeText(project.site_url);
  const targetDomain = normalizeDomain(project.target_domain);
  const targetBrandName = normalizeText(project.target_brand_name);
  const category = normalizeText(project.category);
  const metro = normalizeText(project.metro);

  const derivedSiteDomain = getDerivedSiteDomain(siteUrl);

  const hasSiteUrl = Boolean(siteUrl);
  const hasTargetDomain = Boolean(targetDomain);
  const hasBrandName = Boolean(targetBrandName);
  const hasDerivedSiteDomain = Boolean(derivedSiteDomain);
  const hasDomainAlignment =
    Boolean(targetDomain) &&
    Boolean(derivedSiteDomain) &&
    targetDomain === derivedSiteDomain;

  let websiteReadinessLabel = "Very limited website identity setup";
  let websiteReadinessScore = 15;
  let plainLanguageSummary =
    "Digital Brain does not have enough saved website identity information yet.";
  let topIssue = "No website URL is saved for this project.";
  let whyItMatters =
    "Without a saved website anchor, the system cannot reliably connect website identity to the business.";
  let nextActionTitle = "Add the real website URL for this business";
  let nextActionOwner = "Owner or team member";
  let nextActionDifficulty = "Easy";
  let nextActionReason =
    "A saved website URL is the first step for clearer identity matching and stronger website trust guidance.";

  if (!hasSiteUrl) {
    websiteReadinessLabel = "Website URL is still missing";
    websiteReadinessScore = 15;
    plainLanguageSummary =
      "This project still needs a saved website URL before Digital Brain can anchor website identity.";
    topIssue = "The project has no saved website URL.";
    whyItMatters =
      "Without a website URL, the system cannot connect domain identity or website-facing trust signals to the business.";
    nextActionTitle = "Add the real website URL for this business";
    nextActionOwner = "Owner or team member";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "This creates the basic website anchor needed for stronger matching and owner-facing website guidance.";
  } else if (hasSiteUrl && !hasTargetDomain && hasDerivedSiteDomain) {
    websiteReadinessLabel = "Website exists, but domain identity is not locked";
    websiteReadinessScore = 55;
    plainLanguageSummary =
      "The project has a website URL, but the target domain is not explicitly anchored yet.";
    topIssue = "The project is missing an explicit target domain.";
    whyItMatters =
      "When the target domain is not locked, identity matching can be weaker across onboarding and downstream trust logic.";
    nextActionTitle = `Set the target domain to ${derivedSiteDomain}`;
    nextActionOwner = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "Locking the domain anchor reduces identity ambiguity and makes future website intelligence more reliable.";
  } else if (hasSiteUrl && hasTargetDomain && hasDerivedSiteDomain && !hasDomainAlignment) {
    websiteReadinessLabel = "Website identity needs domain cleanup";
    websiteReadinessScore = 45;
    plainLanguageSummary =
      "The saved website URL and target domain do not currently point to the same domain.";
    topIssue = "The website URL and target domain are out of alignment.";
    whyItMatters =
      "When those two anchors disagree, the project can carry identity confusion into matching, reporting, and action generation.";
    nextActionTitle = "Make the website URL and target domain match";
    nextActionOwner = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "Use one clear domain anchor so the system is not trying to reason across conflicting identity inputs.";
  } else if (hasSiteUrl && hasTargetDomain && !hasBrandName) {
    websiteReadinessLabel = "Website identity is mostly set, but brand naming is incomplete";
    websiteReadinessScore = 72;
    plainLanguageSummary =
      "The project has a website and domain anchor, but the business brand name is not explicitly saved yet.";
    topIssue = "The brand name is still missing from website identity.";
    whyItMatters =
      "A saved brand name helps reduce confusion when the website, GBP, and business naming do not match perfectly.";
    nextActionTitle = "Save the business brand name for this project";
    nextActionOwner = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason =
      "This gives Digital Brain a clearer identity anchor for matching and owner-facing trust guidance.";
  } else if (hasSiteUrl && hasTargetDomain && hasBrandName) {
    websiteReadinessLabel = "Website identity is clearly anchored";
    websiteReadinessScore = hasDomainAlignment ? 88 : 76;
    plainLanguageSummary =
      "This project has the core website identity anchors needed for stronger matching and better website trust guidance.";
    topIssue = hasDomainAlignment
      ? "No major website identity issue is visible from saved project data."
      : "The identity anchor is mostly strong, but domain alignment should still be confirmed.";
    whyItMatters =
      "A clear website, domain, and brand anchor makes later website intelligence more trustworthy and easier to explain to the owner.";
    nextActionTitle = hasDomainAlignment
      ? "Keep website, domain, and brand naming consistent"
      : "Confirm the saved website URL and target domain match exactly";
    nextActionOwner = "Owner or marketing lead";
    nextActionDifficulty = "Easy";
    nextActionReason = hasDomainAlignment
      ? "Consistency across the site, GBP, and business identity reduces confusion and strengthens trust."
      : "A fully aligned domain anchor removes the last source of website identity ambiguity.";
  }

  const evidence: string[] = [
    hasSiteUrl ? "Website URL is saved." : "Website URL is missing.",
    hasTargetDomain
      ? `Target domain is saved as ${targetDomain}.`
      : "Target domain is not saved.",
    hasBrandName
      ? `Brand name is saved as ${targetBrandName}.`
      : "Brand name is not saved.",
    hasDerivedSiteDomain
      ? `Domain derived from website URL is ${derivedSiteDomain}.`
      : "No domain could be derived from the saved website URL.",
    hasTargetDomain && hasDerivedSiteDomain
      ? hasDomainAlignment
        ? "Saved website URL and target domain are aligned."
        : "Saved website URL and target domain are not aligned."
      : "Domain alignment cannot be fully checked yet.",
  ];

  return {
    siteUrl,
    targetDomain,
    targetBrandName,
    category,
    metro,
    derivedSiteDomain,
    hasSiteUrl,
    hasTargetDomain,
    hasBrandName,
    hasDerivedSiteDomain,
    hasDomainAlignment,
    websiteReadinessLabel,
    websiteReadinessScore,
    plainLanguageSummary,
    topIssue,
    whyItMatters,
    nextAction: {
      title: nextActionTitle,
      whoShouldDoIt: nextActionOwner,
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

    const { data, error } = await supabase
      .from("projects")
      .select("site_url, target_domain, target_brand_name, category, metro")
      .eq("id", projectId)
      .single<ProjectRow>();

    if (error) {
      throw new Error(`Failed to load project website summary: ${error.message}`);
    }

    const summary = buildWebsiteSummary(data);

    return NextResponse.json({
      ok: true,
      projectId,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner website summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}