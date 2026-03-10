import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discoverRankCandidates } from "@/lib/domain/rank/discoverRankCandidates";
import { storeRankSnapshot } from "@/lib/domain/rank/storeRankSnapshot";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

type ProjectKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
  project: {
    id: string;
    rank_lat: number | null;
    rank_lng: number | null;
  } | null;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { ok: false, error: "Missing CRON_SECRET." },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("project_rank_keywords")
      .select(`
        id,
        project_id,
        keyword,
        metro,
        is_active,
        priority,
        project:projects (
          id,
          rank_lat,
          rank_lng
        )
      `)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load project rank keywords: ${error.message}` },
        { status: 500 }
      );
    }

    const projectKeywords = (data ?? []) as ProjectKeywordRow[];
    const capturedAt = new Date().toISOString().slice(0, 10);

    const results: Array<{
      projectId: string;
      keyword: string;
      metro: string;
      candidateCount: number;
      storedCount: number;
      ok: boolean;
      error?: string;
    }> = [];

    for (const item of projectKeywords) {
      try {
        if (
          !item.project ||
          typeof item.project.rank_lat !== "number" ||
          Number.isNaN(item.project.rank_lat) ||
          typeof item.project.rank_lng !== "number" ||
          Number.isNaN(item.project.rank_lng)
        ) {
          results.push({
            projectId: item.project_id,
            keyword: item.keyword,
            metro: item.metro,
            candidateCount: 0,
            storedCount: 0,
            ok: false,
            error: "Project rank origin is incomplete.",
          });
          continue;
        }

        const rankDiscovery = await discoverRankCandidates({
          keyword: item.keyword,
          metro: item.metro,
          latitude: item.project.rank_lat,
          longitude: item.project.rank_lng,
        });

        for (const candidate of rankDiscovery.candidates) {
          await storeRankSnapshot({
            projectId: item.project_id,
            competitorId: null,
            keyword: item.keyword,
            metro: item.metro,
            rankPosition: candidate.rankPosition,
            rawResult: candidate.rawResult,
            capturedAt,
          });
        }

        results.push({
          projectId: item.project_id,
          keyword: item.keyword,
          metro: item.metro,
          candidateCount: rankDiscovery.candidates.length,
          storedCount: rankDiscovery.candidates.length,
          ok: true,
        });
      } catch (error) {
        results.push({
          projectId: item.project_id,
          keyword: item.keyword,
          metro: item.metro,
          candidateCount: 0,
          storedCount: 0,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error.",
        });
      }
    }

    const successCount = results.filter((result) => result.ok).length;
    const failureCount = results.filter((result) => !result.ok).length;

    return NextResponse.json({
      ok: true,
      capturedAt,
      keywordRunCount: projectKeywords.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}