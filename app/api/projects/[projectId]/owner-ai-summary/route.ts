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
      .from("gbp_profiles")
      .select("gbp_name, primary_category, total_reviews, rating")
      .eq("project_id", projectId)
      .maybeSingle<GbpProfileRow>();

    if (error) {
      throw new Error(`Failed to load GBP profile for owner AI summary: ${error.message}`);
    }

    const hasBusinessName = Boolean(data?.gbp_name);
    const hasPrimaryCategory = Boolean(data?.primary_category);
    const hasReviewSignals = Boolean((data?.total_reviews ?? 0) > 0 || (data?.rating ?? 0) > 0);

    return NextResponse.json({
      ok: true,
      projectId,
      summary: {
        gbpName: data?.gbp_name ?? null,
        primaryCategory: data?.primary_category ?? null,
        totalReviews: data?.total_reviews ?? null,
        rating: data?.rating ?? null,
        hasBusinessName,
        hasPrimaryCategory,
        hasReviewSignals,
        aiReadinessLabel: buildAiReadinessLabel({
          hasBusinessName,
          hasPrimaryCategory,
          hasReviewSignals,
        }),
      },
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
