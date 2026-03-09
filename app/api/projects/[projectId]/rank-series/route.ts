import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type RankSnapshotRow = {
  captured_at: string;
  rank_position: number;
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
      .select("captured_at, rank_position")
      .eq("project_id", projectId)
      .eq("keyword", keyword)
      .eq("metro", metro)
      .order("captured_at", { ascending: true })
      .order("rank_position", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load rank series: ${error.message}` },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as RankSnapshotRow[];

    const byDay = new Map<
      string,
      {
        bestRank: number;
        worstRank: number;
        resultCount: number;
      }
    >();

    for (const row of rows) {
      const existing = byDay.get(row.captured_at);

      if (!existing) {
        byDay.set(row.captured_at, {
          bestRank: row.rank_position,
          worstRank: row.rank_position,
          resultCount: 1,
        });
        continue;
      }

      existing.bestRank = Math.min(existing.bestRank, row.rank_position);
      existing.worstRank = Math.max(existing.worstRank, row.rank_position);
      existing.resultCount += 1;
    }

    const series = Array.from(byDay.entries()).map(([capturedAt, value]) => ({
      capturedAt,
      bestRank: value.bestRank,
      worstRank: value.worstRank,
      resultCount: value.resultCount,
    }));

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      pointCount: series.length,
      series,
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