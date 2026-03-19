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
  site_url: string;
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
        .eq("is_active", true)
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

    const totalTasks = tasks?.length ?? 0;
    const completedTasks =
      tasks?.filter((task) => task.status === "completed").length ?? 0;
    const openTasks =
      tasks?.filter((task) => task.status === "open").length ?? 0;
    const completedTaskRate = toRate(completedTasks, totalTasks);

    const activeKeyword = keywords?.[0] ?? null;

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

    return NextResponse.json({
      ok: true,
      projectId,
      projectDisplayName: buildProjectDisplayName(projectWebsite, gbpProfile),
      projectCategory: projectWebsite.category,
      projectMetro: projectWebsite.metro,
      capturedAt: new Date().toISOString().slice(0, 10),
      dashboard: {
        topPriorities: priorities.slice(0, 3),
        summary: {
          priorityCount: priorities.length,
          hasPriorities: priorities.length > 0,
          totalTasks,
          openTasks,
          completedTasks,
          completedTaskRate,
        },
        visibilitySummary: {
          hasActiveKeyword: Boolean(activeKeyword),
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
