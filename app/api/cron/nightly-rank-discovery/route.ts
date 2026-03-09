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

type ProjectRow = {
  id: string;
  rank_keyword: string | null;
  rank_metro: string | null;
  rank_lat: number | null;
  rank_lng: number | null;
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
      .from("projects")
      .select("id, rank_keyword, rank_metro, rank_lat, rank_lng")
      .not("rank_keyword", "is", null)
      .not("rank_metro", "is", null)
      .not("rank_lat", "is", null)
      .not("rank_lng", "is", null);

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load projects: ${error.message}` },
        { status: 500 }
      );
    }

    const projects = (data ?? []) as ProjectRow[];
    const capturedAt = new Date().toISOString().slice(0, 10);

    const results: Array<{
      projectId: string;
      keyword: string | null;
      metro: string | null;
      candidateCount: number;
      storedCount: number;
      ok: boolean;
      error?: string;
    }> = [];

    for (const project of projects) {
      try {
        if (
          !project.rank_keyword ||
          !project.rank_metro ||
          typeof project.rank_lat !== "number" ||
          Number.isNaN(project.rank_lat) ||
          typeof project.rank_lng !== "number" ||
          Number.isNaN(project.rank_lng)
        ) {
          results.push({
            projectId: project.id,
            keyword: project.rank_keyword,
            metro: project.rank_metro,
            candidateCount: 0,
            storedCount: 0,
            ok: false,
            error: "Project rank configuration is incomplete.",
          });
          continue;
        }

        const rankDiscovery = await discoverRankCandidates({
          keyword: project.rank_keyword,
          metro: project.rank_metro,
          latitude: project.rank_lat,
          longitude: project.rank_lng,
        });

        for (const candidate of rankDiscovery.candidates) {
          await storeRankSnapshot({
            projectId: project.id,
            competitorId: null,
            keyword: project.rank_keyword,
            metro: project.rank_metro,
            rankPosition: candidate.rankPosition,
            rawResult: candidate.rawResult,
            capturedAt,
          });
        }

        results.push({
          projectId: project.id,
          keyword: project.rank_keyword,
          metro: project.rank_metro,
          candidateCount: rankDiscovery.candidates.length,
          storedCount: rankDiscovery.candidates.length,
          ok: true,
        });
      } catch (error) {
        results.push({
          projectId: project.id,
          keyword: project.rank_keyword,
          metro: project.rank_metro,
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
      projectCount: projects.length,
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