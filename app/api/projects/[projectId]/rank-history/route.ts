import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
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
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;

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

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid limit query param." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("gbp_rank_snapshots")
      .select("id, keyword, metro, rank_position, captured_at, raw_result")
      .eq("project_id", projectId)
      .eq("keyword", keyword)
      .eq("metro", metro)
      .order("captured_at", { ascending: false })
      .order("rank_position", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load rank history: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      count: data.length,
      snapshots: data,
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