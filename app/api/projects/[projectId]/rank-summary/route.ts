import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type RankSnapshotRow = {
  id: string;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL." },
        { status: 500 }
      );
    }

    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword");
    const metro = url.searchParams.get("metro");

    if (!keyword) {
      return NextResponse.json(
        { ok: false, error: "Missing keyword query param." },
        { status: 400 }
      );
    }

    if (!metro) {
      return NextResponse.json(
        { ok: false, error: "Missing metro query param." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("gbp_rank_snapshots")
      .select("id, keyword, metro, rank_position, captured_at")
      .eq("project_id", projectId)
      .eq("keyword", keyword)
      .eq("metro", metro)
      .order("captured_at", { ascending: false })
      .order("rank_position", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load rank summary: ${error.message}` },
        { status: 500 }
      );
    }

    const snapshots = (data ?? []) as RankSnapshotRow[];

    if (snapshots.length === 0) {
      return NextResponse.json({
        ok: true,
        projectId,
        keyword,
        metro,
        summary: null,
      });
    }

    const latestCapturedAt = snapshots[0].captured_at;
    const latestDayRows = snapshots.filter(
      (row) => row.captured_at === latestCapturedAt
    );
    const latestRank = latestDayRows.length > 0 ? latestDayRows[0].rank_position : null;

    const allRanks = snapshots.map((row) => row.rank_position);
    const bestRank = Math.min(...allRanks);
    const worstRank = Math.max(...allRanks);

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      summary: {
        latestCapturedAt,
        latestRank,
        bestRank,
        worstRank,
        snapshotCount: snapshots.length,
        latestDayCount: latestDayRows.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}