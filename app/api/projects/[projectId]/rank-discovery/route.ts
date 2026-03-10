import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discoverRankCandidates } from "@/lib/domain/rank/discoverRankCandidates";
import { storeRankSnapshot } from "@/lib/domain/rank/storeRankSnapshot";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectRow = {
  id: string;
  rank_lat: number | null;
  rank_lng: number | null;
};

type ProjectKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
};

export async function POST(_request: Request, context: RouteContext) {
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

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, rank_lat, rank_lng")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return NextResponse.json(
        { ok: false, error: `Failed to load project: ${projectError.message}` },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const typedProject = project as ProjectRow;

    if (
      typeof typedProject.rank_lat !== "number" ||
      Number.isNaN(typedProject.rank_lat) ||
      typeof typedProject.rank_lng !== "number" ||
      Number.isNaN(typedProject.rank_lng)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project is missing rank_lat or rank_lng.",
        },
        { status: 400 }
      );
    }

    const { data: keywordRows, error: keywordError } = await supabase
      .from("project_rank_keywords")
      .select("id, project_id, keyword, metro, is_active, priority")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);

    if (keywordError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to load project rank keywords: ${keywordError.message}`,
        },
        { status: 500 }
      );
    }

    const activeKeyword = ((keywordRows ?? []) as ProjectKeywordRow[])[0];

    if (!activeKeyword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project has no active rank keywords.",
        },
        { status: 400 }
      );
    }

    const rankDiscovery = await discoverRankCandidates({
      keyword: activeKeyword.keyword,
      metro: activeKeyword.metro,
      latitude: typedProject.rank_lat,
      longitude: typedProject.rank_lng,
    });

    const capturedAt = new Date().toISOString().slice(0, 10);

    for (const candidate of rankDiscovery.candidates) {
      await storeRankSnapshot({
        projectId: typedProject.id,
        competitorId: null,
        keyword: activeKeyword.keyword,
        metro: activeKeyword.metro,
        rankPosition: candidate.rankPosition,
        rawResult: candidate.rawResult,
        capturedAt,
      });
    }

    const { data: storedRows, error: storedRowsError } = await supabase
      .from("gbp_rank_snapshots")
      .select("id, rank_position, captured_at")
      .eq("project_id", typedProject.id)
      .eq("keyword", activeKeyword.keyword)
      .eq("metro", activeKeyword.metro)
      .eq("captured_at", capturedAt)
      .order("rank_position", { ascending: true });

    if (storedRowsError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rank discovery succeeded but verification query failed: ${storedRowsError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      phase: "phase_3_rank_intelligence",
      message: "Live rank discovery completed and snapshots stored.",
      project: {
        id: typedProject.id,
        keywordId: activeKeyword.id,
        rankKeyword: activeKeyword.keyword,
        rankMetro: activeKeyword.metro,
        rankLat: typedProject.rank_lat,
        rankLng: typedProject.rank_lng,
      },
      candidateCount: rankDiscovery.candidates.length,
      storedCount: storedRows.length,
      topResults: rankDiscovery.candidates.slice(0, 5).map((candidate) => ({
        rankPosition: candidate.rankPosition,
        title: candidate.title,
        category: candidate.category,
        address: candidate.address,
        rating: candidate.rating,
        reviewsCount: candidate.reviewsCount,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}