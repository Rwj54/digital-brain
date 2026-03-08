import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discoverRankCandidates } from "@/lib/domain/rank/discoverRankCandidates";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
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
      .select("id, rank_keyword, rank_metro, rank_lat, rank_lng")
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

    if (!project.rank_keyword || !project.rank_metro) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project is missing rank_keyword or rank_metro.",
        },
        { status: 400 }
      );
    }

    if (
      typeof project.rank_lat !== "number" ||
      Number.isNaN(project.rank_lat) ||
      typeof project.rank_lng !== "number" ||
      Number.isNaN(project.rank_lng)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project is missing rank_lat or rank_lng.",
        },
        { status: 400 }
      );
    }

    const rankDiscovery = await discoverRankCandidates({
      keyword: project.rank_keyword,
      metro: project.rank_metro,
      latitude: project.rank_lat,
      longitude: project.rank_lng,
    });

    const tasks = Array.isArray(rankDiscovery.rawResponse?.tasks)
      ? rankDiscovery.rawResponse.tasks
      : [];

    const taskSummaries = tasks.map((task: any) => {
      const results = Array.isArray(task?.result) ? task.result : [];

      return {
        id: task?.id ?? null,
        statusCode: task?.status_code ?? null,
        statusMessage: task?.status_message ?? null,
        cost: task?.cost ?? null,
        resultCount: results.length,
        itemCounts: results.map((result: any) =>
          Array.isArray(result?.items) ? result.items.length : 0
        ),
        resultTypes: results.map((result: any) => result?.type ?? null),
      };
    });

    return NextResponse.json({
      ok: true,
      phase: "phase_3_rank_intelligence",
      message: "Live rank discovery completed.",
      project: {
        id: project.id,
        rankKeyword: project.rank_keyword,
        rankMetro: project.rank_metro,
        rankLat: project.rank_lat,
        rankLng: project.rank_lng,
      },
      candidateCount: rankDiscovery.candidates.length,
      candidates: rankDiscovery.candidates,
      debug: {
        taskCount: tasks.length,
        taskSummaries,
        rawResponsePreview: rankDiscovery.rawResponse,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}