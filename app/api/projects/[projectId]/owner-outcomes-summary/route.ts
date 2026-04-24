import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectRow = {
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
  event_label_singular: string | null;
  event_label_plural: string | null;
};

type GbpProfileRow = {
  total_reviews: number | null;
};

type CompetitorMetricRow = {
  competitor_name: string | null;
  total_reviews: number | null;
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
      .select(
        "monthly_customer_events, review_conversion_rate, event_label_singular, event_label_plural",
      )
      .eq("id", projectId)
      .single<ProjectRow>();

    if (error) {
      throw new Error(`Failed to load project outcomes summary: ${error.message}`);
    }

    const hasMonthlyEvents = data.monthly_customer_events !== null;
    const hasConversionRate = data.review_conversion_rate !== null;

    const { data: gbpProfile, error: gbpError } = await supabase
      .from("gbp_profiles")
      .select("total_reviews")
      .eq("project_id", projectId)
      .maybeSingle<GbpProfileRow>();

    if (gbpError) {
      throw new Error(`Failed to load GBP profile outcomes data: ${gbpError.message}`);
    }

    const { data: topCompetitor, error: competitorError } = await supabase
      .from("gbp_competitor_metrics")
      .select("competitor_name, total_reviews")
      .eq("project_id", projectId)
      .order("total_reviews", { ascending: false })
      .limit(1)
      .maybeSingle<CompetitorMetricRow>();

    if (competitorError) {
      throw new Error(`Failed to load competitor outcomes data: ${competitorError.message}`);
    }

    const currentReviews = gbpProfile?.total_reviews ?? null;
    const topCompetitorName = topCompetitor?.competitor_name ?? null;
    const topCompetitorReviews = topCompetitor?.total_reviews ?? null;

    const gapReviews =
      currentReviews === null || topCompetitorReviews === null
        ? null
        : Math.max(0, Number(topCompetitorReviews) - Number(currentReviews));

    const desiredTarget90d =
      gapReviews === null
        ? null
        : gapReviews > 100
          ? Math.ceil(gapReviews * 0.25)
          : Math.ceil(gapReviews * 0.5);

    const maxReviews90d =
      data.monthly_customer_events === null || data.review_conversion_rate === null
        ? null
        : Math.floor(
            data.monthly_customer_events * (data.review_conversion_rate / 100) * 3
          );

    const realisticTarget90d =
      desiredTarget90d === null
        ? null
        : maxReviews90d === null
          ? desiredTarget90d
          : Math.min(desiredTarget90d, maxReviews90d);

    const perWeek =
      realisticTarget90d === null
        ? null
        : Math.max(0, Math.ceil(realisticTarget90d / 13));

    const monthsToCloseGap =
      gapReviews === null ||
      data.monthly_customer_events === null ||
      data.review_conversion_rate === null
        ? null
        : data.monthly_customer_events * (data.review_conversion_rate / 100) <= 0
          ? null
          : Math.ceil(
              gapReviews /
                (data.monthly_customer_events * (data.review_conversion_rate / 100))
            );

    return NextResponse.json({
      ok: true,
      projectId,
      summary: {
        monthlyCustomerEvents: data.monthly_customer_events,
        reviewConversionRate: data.review_conversion_rate,
        eventLabelSingular: data.event_label_singular,
        eventLabelPlural: data.event_label_plural,
        hasMonthlyEvents,
        hasConversionRate,
        outcomesReadinessLabel: buildOutcomeReadinessLabel({
          hasMonthlyEvents,
          hasConversionRate,
        }),
        currentReviews,
        topCompetitorName,
        topCompetitorReviews,
        gapReviews,
        desiredTarget90d,
        maxReviews90d,
        realisticTarget90d,
        perWeek,
        monthsToCloseGap,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner outcomes summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
