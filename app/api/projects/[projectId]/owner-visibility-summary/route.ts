import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
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

    const { data: keywords, error: keywordsError } = await supabase
      .from("project_rank_keywords")
      .select("keyword, metro, priority, is_active")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .returns<RankKeywordRow[]>();

    if (keywordsError) {
      throw new Error(`Failed to load active rank keyword: ${keywordsError.message}`);
    }

    const activeKeyword = keywords?.[0] ?? null;

    if (!activeKeyword) {
      return NextResponse.json({
        ok: true,
        projectId,
        summary: {
          hasActiveKeyword: false,
          visibilityLabel: "No active keyword configured",
          latestRank: null,
          bestRank: null,
          latestCapturedAt: null,
          keyword: null,
          metro: null,
        },
      });
    }

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

    const latestRank = snapshots?.[0]?.rank_position ?? null;
    const latestCapturedAt = snapshots?.[0]?.captured_at ?? null;
    const bestRank =
      snapshots && snapshots.length > 0
        ? Math.min(...snapshots.map((snapshot) => snapshot.rank_position))
        : null;

    return NextResponse.json({
      ok: true,
      projectId,
      summary: {
        hasActiveKeyword: true,
        keyword: activeKeyword.keyword,
        metro: activeKeyword.metro,
        latestRank,
        bestRank,
        latestCapturedAt,
        visibilityLabel: buildVisibilityLabel(latestRank),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner visibility summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
