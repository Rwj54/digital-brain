import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

    const { data: keywordRows, error: keywordError } = await supabase
      .from("project_rank_keywords")
      .select("id, keyword, metro, is_active, priority")
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

    const activeKeyword = (keywordRows ?? [])[0] ?? null;

    return NextResponse.json({
      ok: true,
      project: {
        id: project.id,
        rank_keyword: activeKeyword?.keyword ?? null,
        rank_metro: activeKeyword?.metro ?? null,
        rank_lat: project.rank_lat,
        rank_lng: project.rank_lng,
        keyword_id: activeKeyword?.id ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}