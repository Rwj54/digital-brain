import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, name, rank_keyword, rank_metro")
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

    return NextResponse.json({
      ok: true,
      phase: "phase_3_rank_intelligence",
      message: "Rank discovery endpoint scaffold is live.",
      project: {
        id: project.id,
        name: project.name,
        rankKeyword: project.rank_keyword,
        rankMetro: project.rank_metro,
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