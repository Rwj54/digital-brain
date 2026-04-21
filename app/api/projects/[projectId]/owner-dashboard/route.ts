import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateOwnerPriorityQueue } from "@/lib/owner/buildOwnerPriorityQueue";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerTaskStatusRow = {
  id: string;
  status: string;
};

type RankKeywordRow = {
  keyword: string;
  metro: string;
  priority: number;
  is_active: boolean;
};

type RankSnapshotRow = {
  rank_position: number;
  captured_at: string;
};

type GbpProfileRow = {
  gbp_name: string | null;
  primary_category: string | null;
  total_reviews: number | null;
  rating: number | null;
};

type ProjectWebsiteRow = {
  site_url: string | null;
  target_domain: string | null;
  target_brand_name: string | null;
  category: string | null;
  metro: string | null;
};

type ProjectOutcomesRow = {
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
  event_label_singular: string | null;
  event_label_plural: string | null;
};

type OwnerPriorityLite = {
  title: string;
  plain_language_reason: string;
  why_now: string;
  expected_benefit: string;
  who_should_do_it: string;
  difficulty: string;
  time_to_complete_estimate: string;
  proof_of_completion: string;
  confidence_level: number;
  source: string;
  sort_order: number;
  task_type: string;
  task_data: Record<string, unknown>;
};

type OwnerHealthMarker = {
  label: "Visibility" | "Trust" | "Clarity" | "Activity";
  score: number;
  statusLabel: string;
  explanation: string;
  nextActionHint: string;
};

type PriorityFlags = {
  review: boolean;
  posts: boolean;
  photos: boolean;
  category: boolean;
  description: boolean;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toRate(completedTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) {
    return 0;
  }

  return Math.round((completedTasks / totalTasks) * 100) / 100;
}

function buildVisibilityLabel(rank: number | null): string {
  if (rank === null) {
    return "No rank data yet";
  }

  if (rank <= 3) {
    return "Strong visibility";
  }

  if (rank <= 10) {
    return "Visible but needs improvement";
  }

  if (rank <= 20) {
    return "Weak visibility";
  }

  return "Very low visibility";
}

function buildAiReadinessLabel(input: {
  hasBusinessName: boolean;
  hasPrimaryCategory: boolean;
  hasReviewSignals: boolean;
}): string {
  const score =
    (input.hasBusinessName ? 1 : 0) +
    (input.hasPrimaryCategory ? 1 : 0) +
    (input.hasReviewSignals ? 1 : 0);

  if (score === 3) {
    return "Good early AI readiness";
  }

  if (score === 2) {
    return "Moderate AI readiness";
  }

  if (score === 1) {
    return "Weak AI readiness";
  }

  return "Very limited AI readiness";
}

function buildWebsiteReadinessLabel(input: {
  hasSiteUrl: boolean;
  hasTargetDomain: boolean;
  hasBrandName: boolean;
}): string {
  const score =
    (input.hasSiteUrl ? 1 : 0) +
    (input.hasTargetDomain ? 1 : 0) +
    (input.hasBrandName ? 1 : 0);

  if (score === 3) {
    return "Good website identity setup";
  }

  if (score === 2) {
    return "Moderate website identity setup";
  }

  if (score === 1) {
    return "Weak website identity setup";
  }

  return "Very limited website identity setup";
}

function buildOutcomeReadinessLabel(input: {
  hasMonthlyEvents: boolean;
  hasConversionRate: boolean;
}): string {
  const score =
    (input.hasMonthlyEvents ? 1 : 0) +
    (input.hasConversionRate ? 1 : 0);

  if (score === 2) {
    return "Good early outcomes tracking";
  }

  if (score === 1) {
    return "Partial outcomes tracking";
  }

  return "Very limited outcomes tracking";
}

function buildProjectDisplayName(project: ProjectWebsiteRow, gbpProfile: GbpProfileRow | null): string {
  if (project.target_brand_name) return project.target_brand_name;
  if (gbpProfile?.gbp_name) return gbpProfile.gbp_name;
  if (project.target_domain) return project.target_domain;
  if (project.site_url) return project.site_url;
  return "Project";
}

function extractDomainFromSiteUrl(siteUrl: string | null): string | null {
  if (!siteUrl) {
    return null;
  }

  try {
    const parsed = new URL(siteUrl);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return siteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? null;
  }
}

function buildDomainDisplayValue(project: ProjectWebsiteRow): string | null {
  return project.target_domain ?? extractDomainFromSiteUrl(project.site_url);
}

function buildProjectLocationLabel(
  project: ProjectWebsiteRow,
  activeKeyword: RankKeywordRow | null,
): string | null {
  return project.metro ?? activeKeyword?.metro ?? null;
}

function buildPageScopeLabel(locationLabel: string | null): string {
  return locationLabel ? "Location view" : "Project view";
}

function buildMarkerStatusLabel(score: number): string {
  if (score >= 80) {
    return "Strong";
  }

  if (score >= 65) {
    return "Good";
  }

  if (score >= 45) {
    return "Needs work";
  }

  return "Weak";
}

function extractPriorityFlags(priorities: OwnerPriorityLite[]): PriorityFlags {
  const haystack = priorities
    .map((priority) =>
      `${priority.title} ${priority.plain_language_reason} ${priority.why_now} ${priority.expected_benefit}`.toLowerCase(),
    )
    .join(" | ");

  return {
    review: haystack.includes("review"),
    posts: haystack.includes("post"),
    photos: haystack.includes("photo"),
    category: haystack.includes("categor"),
    description: haystack.includes("description"),
  };
}

function buildVisibilityMarker(input: {
  latestRank: number | null;
  activeKeyword: RankKeywordRow | null;
  hasActiveKeyword: boolean;
}): OwnerHealthMarker {
  const { latestRank, activeKeyword, hasActiveKeyword } = input;

  const keywordLabel = activeKeyword?.keyword ?? "your main search";

  if (!activeKeyword) {
    const score = 12;

    return {
      label: "Visibility",
      score,
      statusLabel: buildMarkerStatusLabel(score),
      explanation:
        "Digital Brain does not have one tracked search phrase ready for this business yet.",
      nextActionHint:
        "Finish onboarding or seed one tracked keyword and market first.",
    };
  }

  if (!hasActiveKeyword) {
    const score = 22;

    return {
      label: "Visibility",
      score,
      statusLabel: buildMarkerStatusLabel(score),
      explanation: `Digital Brain knows ${keywordLabel}, but this tracked search is not active yet.`,
      nextActionHint:
        "Finish onboarding or activate rank tracking so visibility updates can start.",
    };
  }

  let score = 34;

  if (latestRank === null) {
    score = 34;
  } else if (latestRank <= 3) {
    score = 88;
  } else if (latestRank <= 5) {
    score = 76;
  } else if (latestRank <= 10) {
    score = 64;
  } else if (latestRank <= 20) {
    score = 42;
  } else {
    score = 20;
  }

  let explanation =
    "Digital Brain knows what search to track, but it does not have a saved visibility snapshot yet.";
  let nextActionHint =
    "Run rank discovery to capture the first visibility snapshot.";

  if (latestRank !== null && latestRank <= 3) {
    explanation = `You are showing strongly for ${keywordLabel}.`;
    nextActionHint = "Protect this visibility with stronger trust and steady activity.";
  } else if (latestRank !== null && latestRank <= 10) {
    explanation = `You are visible for ${keywordLabel}, but there is room to move higher.`;
    nextActionHint = "Strengthen trust and activity to improve this position.";
  } else if (latestRank !== null) {
    explanation = `Google is not showing this business strongly enough for ${keywordLabel}.`;
    nextActionHint = "Improve relevance, trust, and profile strength to move up.";
  }

  return {
    label: "Visibility",
    score,
    statusLabel: buildMarkerStatusLabel(score),
    explanation,
    nextActionHint,
  };
}

function buildTrustMarker(input: {
  gbpProfile: GbpProfileRow | null;
  hasBusinessName: boolean;
  hasPrimaryCategory: boolean;
  flags: PriorityFlags;
}): OwnerHealthMarker {
  const totalReviews = input.gbpProfile?.total_reviews ?? 0;
  const rating = input.gbpProfile?.rating ?? 0;

  let score = 12;

  score += Math.min(totalReviews, 50) / 50 * 40;
  score += Math.min(rating, 5) / 5 * 20;
  score += input.hasBusinessName ? 12 : 0;
  score += input.hasPrimaryCategory ? 12 : 0;
  score += totalReviews > 0 ? 10 : 0;
  score += input.flags.review ? -14 : 8;

  score = Math.round(clamp(score, 8, 96));

  let explanation = "Trust signals are still light for a competitive local business.";
  let nextActionHint = "Build stronger review and profile trust signals.";

  if (input.flags.review || totalReviews < 10) {
    explanation = "Google sees a weaker review profile than a stronger local competitor would have.";
    nextActionHint = "Ask recent customers for more fresh reviews.";
  } else if (rating > 0 && rating < 4) {
    explanation = "You have review signals, but quality and trust still look mixed.";
    nextActionHint = "Improve review quality and increase positive review volume.";
  } else if (totalReviews >= 10) {
    explanation = "Google can already see meaningful trust signals from your business profile.";
    nextActionHint = "Keep earning reviews consistently to stay competitive.";
  }

  return {
    label: "Trust",
    score,
    statusLabel: buildMarkerStatusLabel(score),
    explanation,
    nextActionHint,
  };
}

function buildClarityMarker(input: {
  hasSiteUrl: boolean;
  hasTargetDomain: boolean;
  hasBrandName: boolean;
  hasBusinessName: boolean;
  hasPrimaryCategory: boolean;
  locationLabel: string | null;
}): OwnerHealthMarker {
  let score = 0;

  score += input.hasSiteUrl ? 20 : 0;
  score += input.hasTargetDomain ? 24 : 0;
  score += input.hasBrandName ? 18 : 0;
  score += input.hasBusinessName ? 20 : 0;
  score += input.hasPrimaryCategory ? 18 : 0;

  score = Math.round(clamp(score, 10, 96));

  let explanation = "Google needs a clearer connection between your business, category, and website.";
  let nextActionHint = "Tighten your business identity and website alignment.";

  if (score >= 75) {
    explanation = "Google can clearly connect your business name, category, and website identity.";
    nextActionHint = `Keep service and location language consistent for ${input.locationLabel ?? "this business"}.`;
  } else if (!input.hasTargetDomain || !input.hasBrandName) {
    explanation = "Your website and brand identity are not as clearly connected as they should be.";
    nextActionHint = "Strengthen domain, brand, and business-name consistency.";
  } else if (!input.hasPrimaryCategory) {
    explanation = "Your business identity is partly clear, but the category signal is still weak.";
    nextActionHint = "Make your primary business category more explicit.";
  }

  return {
    label: "Clarity",
    score,
    statusLabel: buildMarkerStatusLabel(score),
    explanation,
    nextActionHint,
  };
}

function buildActivityMarker(input: {
  flags: PriorityFlags;
  totalReviews: number;
}): OwnerHealthMarker {
  let score = 78;

  score -= input.flags.posts ? 22 : 0;
  score -= input.flags.photos ? 18 : 0;
  score -= input.flags.review ? 10 : 0;
  score -= input.totalReviews === 0 ? 10 : 0;

  score = Math.round(clamp(score, 12, 92));

  let explanation = "Google is seeing enough recent activity to support this business.";
  let nextActionHint = "Keep profile updates, reviews, and proof of work moving.";

  if (input.flags.posts && input.flags.photos) {
    explanation = "Google is not seeing enough recent profile activity like posts and photos.";
    nextActionHint = "Add fresh posts and service photos this week.";
  } else if (input.flags.posts) {
    explanation = "Profile activity looks lighter than it should be right now.";
    nextActionHint = "Publish fresh GBP posts on a regular schedule.";
  } else if (input.flags.photos) {
    explanation = "Your profile needs fresher visual proof of real work.";
    nextActionHint = "Add recent, service-relevant photos.";
  } else if (input.flags.review) {
    explanation = "Recent customer trust activity still needs to improve.";
    nextActionHint = "Keep new reviews coming in consistently.";
  }

  return {
    label: "Activity",
    score,
    statusLabel: buildMarkerStatusLabel(score),
    explanation,
    nextActionHint,
  };
}

function buildHelpingNow(input: {
  visibilityMarker: OwnerHealthMarker;
  trustMarker: OwnerHealthMarker;
  clarityMarker: OwnerHealthMarker;
  hasPrimaryCategory: boolean;
  hasReviewSignals: boolean;
  activeKeyword: RankKeywordRow | null;
}): string[] {
  const helpingNow: string[] = [];

  if (input.visibilityMarker.score >= 75) {
    helpingNow.push(
      `You are already showing strongly for ${input.activeKeyword?.keyword ?? "an important search"}.`,
    );
  }

  if (input.clarityMarker.score >= 70) {
    helpingNow.push("Your business identity and website connection are already clear.");
  }

  if (input.hasPrimaryCategory) {
    helpingNow.push("Google can identify your primary business category.");
  }

  if (input.hasReviewSignals) {
    helpingNow.push("Your profile already has real customer trust signals.");
  }

  if (helpingNow.length === 0) {
    helpingNow.push("This dashboard is ready to guide the most important next actions.");
  }

  return helpingNow.slice(0, 4);
}

function buildGoogleStillWants(input: {
  flags: PriorityFlags;
  clarityMarker: OwnerHealthMarker;
  trustMarker: OwnerHealthMarker;
  activityMarker: OwnerHealthMarker;
}): string[] {
  const googleStillWants: string[] = [];

  if (input.trustMarker.score < 65 || input.flags.review) {
    googleStillWants.push("More fresh customer reviews and stronger trust signals.");
  }

  if (input.flags.posts || input.activityMarker.score < 65) {
    googleStillWants.push("More recent business activity through posts and updates.");
  }

  if (input.flags.photos) {
    googleStillWants.push("More real-world service photos and visual proof.");
  }

  if (input.clarityMarker.score < 65) {
    googleStillWants.push("Clearer website, brand, and business identity alignment.");
  }

  if (input.flags.category || input.flags.description) {
    googleStillWants.push("Stronger category and service-description completeness.");
  }

  if (googleStillWants.length === 0) {
    googleStillWants.push("Steady trust, activity, and clarity improvements to stay ahead.");
  }

  return googleStillWants.slice(0, 4);
}

function buildHero(input: {
  visibilityMarker: OwnerHealthMarker;
  trustMarker: OwnerHealthMarker;
  clarityMarker: OwnerHealthMarker;
  activityMarker: OwnerHealthMarker;
  activeKeyword: RankKeywordRow | null;
  hasActiveKeyword: boolean;
  topPriority: OwnerPriorityLite | null;
}): {
  headline: string;
  supportLine: string;
  primaryActionText: string;
} {
  const keywordLabel = input.activeKeyword?.keyword ?? "the searches that matter";

  let headline = "This business has clear momentum, with a few strong opportunities to improve.";
  let supportLine =
    "Google can understand this business, and the next gains will come from focused trust, clarity, and activity improvements.";

  if (!input.activeKeyword) {
    headline =
      "This project still needs one tracked search before visibility can be read clearly.";
    supportLine =
      "Digital Brain cannot explain Google visibility for this business until one keyword and market are set.";
  } else if (!input.hasActiveKeyword) {
    headline =
      "Digital Brain has a tracked search for this business, but rank setup is not finished yet.";
    supportLine = `The tracked search for ${keywordLabel} exists, but it is not active yet, so the visibility story is still in setup mode.`;
  } else if (
    input.visibilityMarker.score >= 75 &&
    (input.trustMarker.score < 65 || input.activityMarker.score < 65)
  ) {
    headline = "You’re visible, but Google still sees weak trust and low activity.";
    supportLine = `You are showing up for ${keywordLabel}, but stronger review signals and fresher profile activity are needed to hold and grow this visibility.`;
  } else if (input.visibilityMarker.score < 55) {
    headline = "Google is not seeing this business often enough in the searches that matter.";
    supportLine = `Your visibility for ${keywordLabel} still needs stronger trust, clarity, and activity support.`;
  } else if (input.clarityMarker.score < 60) {
    headline = "Google can find this business, but the story is still not clear enough.";
    supportLine =
      "The next gains will come from making the website, brand, category, and business identity easier for Google to connect.";
  } else if (input.trustMarker.score < 60) {
    headline = "Google can find this business, but trust signals still need work.";
    supportLine =
      "Review strength and authority signals are not yet strong enough to support the best local performance.";
  } else if (input.activityMarker.score < 60) {
    headline = "Google understands this business, but recent activity is too light.";
    supportLine =
      "More recent posts, photos, and customer proof will help reinforce your current visibility.";
  }

  return {
    headline,
    supportLine,
    primaryActionText: input.topPriority
      ? `Start with: ${input.topPriority.title}.`
      : "Start with the clearest next action on this page.",
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

    const [
      priorities,
      { data: tasks, error: tasksError },
      { data: keywords, error: keywordsError },
      { data: gbpProfile, error: gbpError },
      { data: projectWebsite, error: websiteError },
      { data: projectOutcomes, error: outcomesError },
    ] = await Promise.all([
      generateOwnerPriorityQueue(projectId),
      supabase
        .from("owner_tasks")
        .select("id, status")
        .eq("project_id", projectId)
        .returns<OwnerTaskStatusRow[]>(),
      supabase
        .from("project_rank_keywords")
        .select("keyword, metro, priority, is_active")
        .eq("project_id", projectId)
        .order("is_active", { ascending: false })
        .order("priority", { ascending: true })
        .limit(1)
        .returns<RankKeywordRow[]>(),
      supabase
        .from("gbp_profiles")
        .select("gbp_name, primary_category, total_reviews, rating")
        .eq("project_id", projectId)
        .maybeSingle<GbpProfileRow>(),
      supabase
        .from("projects")
        .select("site_url, target_domain, target_brand_name, category, metro")
        .eq("id", projectId)
        .single<ProjectWebsiteRow>(),
      supabase
        .from("projects")
        .select(
          "monthly_customer_events, review_conversion_rate, event_label_singular, event_label_plural",
        )
        .eq("id", projectId)
        .single<ProjectOutcomesRow>(),
    ]);

    if (tasksError) {
      throw new Error(`Failed to load owner task summary: ${tasksError.message}`);
    }

    if (keywordsError) {
      throw new Error(`Failed to load active rank keyword: ${keywordsError.message}`);
    }

    if (gbpError) {
      throw new Error(`Failed to load GBP profile for owner AI summary: ${gbpError.message}`);
    }

    if (websiteError) {
      throw new Error(`Failed to load project website summary: ${websiteError.message}`);
    }

    if (outcomesError) {
      throw new Error(`Failed to load project outcomes summary: ${outcomesError.message}`);
    }

    const typedPriorities = priorities as OwnerPriorityLite[];
    const flags = extractPriorityFlags(typedPriorities);
    const totalTasks = tasks?.length ?? 0;
    const completedTasks =
      tasks?.filter((task) => task.status === "completed").length ?? 0;
    const openTasks =
      tasks?.filter((task) => task.status === "open").length ?? 0;
    const completedTaskRate = toRate(completedTasks, totalTasks);

    const activeKeyword = keywords?.[0] ?? null;
    const hasActiveKeyword = activeKeyword?.is_active === true;

    let latestRank: number | null = null;
    let bestRank: number | null = null;
    let latestCapturedAt: string | null = null;

    if (activeKeyword) {
      const { data: snapshots, error: snapshotsError } = await supabase
        .from("gbp_rank_snapshots")
        .select("rank_position, captured_at")
        .eq("project_id", projectId)
        .eq("keyword", activeKeyword.keyword)
        .eq("metro", activeKeyword.metro)
        .order("captured_at", { ascending: false })
        .limit(20)
        .returns<RankSnapshotRow[]>();

      if (snapshotsError) {
        throw new Error(`Failed to load rank snapshots: ${snapshotsError.message}`);
      }

      latestRank = snapshots?.[0]?.rank_position ?? null;
      latestCapturedAt = snapshots?.[0]?.captured_at ?? null;
      bestRank =
        snapshots && snapshots.length > 0
          ? Math.min(...snapshots.map((snapshot) => snapshot.rank_position))
          : null;
    }

    const hasBusinessName = Boolean(gbpProfile?.gbp_name);
    const hasPrimaryCategory = Boolean(gbpProfile?.primary_category);
    const hasReviewSignals = Boolean(
      (gbpProfile?.total_reviews ?? 0) > 0 || (gbpProfile?.rating ?? 0) > 0,
    );

    const hasSiteUrl = Boolean(projectWebsite.site_url);
    const hasTargetDomain = Boolean(projectWebsite.target_domain);
    const hasBrandName = Boolean(projectWebsite.target_brand_name);

    const hasMonthlyEvents = projectOutcomes.monthly_customer_events !== null;
    const hasConversionRate = projectOutcomes.review_conversion_rate !== null;

    const projectLocationLabel = buildProjectLocationLabel(projectWebsite, activeKeyword);
    const visibilityMarker = buildVisibilityMarker({
      latestRank,
      activeKeyword,
      hasActiveKeyword,
    });
    const trustMarker = buildTrustMarker({
      gbpProfile,
      hasBusinessName,
      hasPrimaryCategory,
      flags,
    });
    const clarityMarker = buildClarityMarker({
      hasSiteUrl,
      hasTargetDomain,
      hasBrandName,
      hasBusinessName,
      hasPrimaryCategory,
      locationLabel: projectLocationLabel,
    });
    const activityMarker = buildActivityMarker({
      flags,
      totalReviews: gbpProfile?.total_reviews ?? 0,
    });

    const healthMarkers: OwnerHealthMarker[] = [
      visibilityMarker,
      trustMarker,
      clarityMarker,
      activityMarker,
    ];

    const helpingNow = buildHelpingNow({
      visibilityMarker,
      trustMarker,
      clarityMarker,
      hasPrimaryCategory,
      hasReviewSignals,
      activeKeyword,
    });

    const googleStillWants = buildGoogleStillWants({
      flags,
      clarityMarker,
      trustMarker,
      activityMarker,
    });

    const hero = buildHero({
      visibilityMarker,
      trustMarker,
      clarityMarker,
      activityMarker,
      activeKeyword,
      hasActiveKeyword,
      topPriority: typedPriorities[0] ?? null,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      projectDisplayName: buildProjectDisplayName(projectWebsite, gbpProfile),
      projectCategory: projectWebsite.category,
      projectMetro: projectWebsite.metro,
      projectSiteUrl: projectWebsite.site_url ?? null,
      projectTargetDomain: projectWebsite.target_domain ?? null,
      domainDisplayValue: buildDomainDisplayValue(projectWebsite),
      projectLocationLabel,
      pageScopeLabel: buildPageScopeLabel(projectLocationLabel),
      capturedAt: new Date().toISOString().slice(0, 10),
      dashboard: {
        hero,
        healthMarkers,
        guidance: {
          helpingNow,
          googleStillWants,
        },
        progress: {
          nextLikelyImprovement:
            typedPriorities[0]?.expected_benefit ??
            "Focused action should improve the next major signal.",
          lastUpdated: new Date().toISOString().slice(0, 10),
        },
        topPriorities: typedPriorities.slice(0, 3),
        summary: {
          priorityCount: typedPriorities.length,
          hasPriorities: typedPriorities.length > 0,
          totalTasks,
          openTasks,
          completedTasks,
          completedTaskRate,
        },
        visibilitySummary: {
          hasActiveKeyword,
          keyword: activeKeyword?.keyword ?? null,
          metro: activeKeyword?.metro ?? null,
          latestRank,
          bestRank,
          latestCapturedAt,
          visibilityLabel: buildVisibilityLabel(latestRank),
        },
        aiSummary: {
          gbpName: gbpProfile?.gbp_name ?? null,
          primaryCategory: gbpProfile?.primary_category ?? null,
          totalReviews: gbpProfile?.total_reviews ?? null,
          rating: gbpProfile?.rating ?? null,
          hasBusinessName,
          hasPrimaryCategory,
          hasReviewSignals,
          aiReadinessLabel: buildAiReadinessLabel({
            hasBusinessName,
            hasPrimaryCategory,
            hasReviewSignals,
          }),
        },
        websiteSummary: {
          siteUrl: projectWebsite.site_url,
          targetDomain: projectWebsite.target_domain,
          targetBrandName: projectWebsite.target_brand_name,
          hasSiteUrl,
          hasTargetDomain,
          hasBrandName,
          websiteReadinessLabel: buildWebsiteReadinessLabel({
            hasSiteUrl,
            hasTargetDomain,
            hasBrandName,
          }),
        },
        outcomesSummary: {
          monthlyCustomerEvents: projectOutcomes.monthly_customer_events,
          reviewConversionRate: projectOutcomes.review_conversion_rate,
          eventLabelSingular: projectOutcomes.event_label_singular,
          eventLabelPlural: projectOutcomes.event_label_plural,
          hasMonthlyEvents,
          hasConversionRate,
          outcomesReadinessLabel: buildOutcomeReadinessLabel({
            hasMonthlyEvents,
            hasConversionRate,
          }),
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build owner dashboard.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
