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

type ProjectRelationRow = {
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
  project: ProjectRelationRow | ProjectRelationRow[] | null;
};

type RankCandidate = {
  rankPosition: number;
  rawResult: Record<string, unknown> | null;
};

type MarketResultInsertRow = {
  project_id: string;
  keyword: string;
  metro: string;
  position: number;
  result_name: string;
  result_domain: string | null;
  result_place_id: string | null;
  rating: number | null;
  review_count: number | null;
  photo_count: number | null;
  is_target: boolean;
  matched_competitor_id: string | null;
  provider: string;
  source: string;
  raw_result: Record<string, unknown> | null;
  captured_at: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asInteger(value: unknown): number | null {
  const numeric = asNumber(value);

  if (numeric === null) {
    return null;
  }

  return Math.round(numeric);
}

function getProjectRelation(
  value: ProjectRelationRow | ProjectRelationRow[] | null
): ProjectRelationRow | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function extractResultName(rawResult: Record<string, unknown> | null): string {
  if (!rawResult) {
    return "Unknown result";
  }

  return (
    asString(rawResult.title) ??
    asString(rawResult.name) ??
    asString(rawResult.business_name) ??
    asString(rawResult.place_name) ??
    asString(rawResult.company_name) ??
    "Unknown result"
  );
}

function extractDomain(
  rawResult: Record<string, unknown> | null
): string | null {
  if (!rawResult) {
    return null;
  }

  const directDomain =
    asString(rawResult.domain) ??
    asString(rawResult.website_domain) ??
    asString(rawResult.url_domain);

  if (directDomain) {
    return directDomain.toLowerCase();
  }

  const candidateUrl =
    asString(rawResult.url) ??
    asString(rawResult.website) ??
    asString(rawResult.domain_url) ??
    asString(rawResult.site);

  if (!candidateUrl) {
    return null;
  }

  try {
    const normalizedUrl = candidateUrl.startsWith("http")
      ? candidateUrl
      : `https://${candidateUrl}`;

    return new URL(normalizedUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return (
      candidateUrl
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0] || null
    );
  }
}

function extractPlaceId(rawResult: Record<string, unknown> | null): string | null {
  if (!rawResult) {
    return null;
  }

  return (
    asString(rawResult.place_id) ??
    asString(rawResult.placeId) ??
    asString(rawResult.cid) ??
    asString(rawResult.data_id) ??
    null
  );
}

function extractRating(rawResult: Record<string, unknown> | null): number | null {
  if (!rawResult) {
    return null;
  }

  return (
    asNumber(rawResult.rating) ??
    asNumber(rawResult.stars) ??
    asNumber(rawResult.score) ??
    null
  );
}

function extractReviewCount(
  rawResult: Record<string, unknown> | null
): number | null {
  if (!rawResult) {
    return null;
  }

  return (
    asInteger(rawResult.review_count) ??
    asInteger(rawResult.reviews_count) ??
    asInteger(rawResult.reviews) ??
    asInteger(rawResult.rating_count) ??
    null
  );
}

function extractPhotoCount(
  rawResult: Record<string, unknown> | null
): number | null {
  if (!rawResult) {
    return null;
  }

  return (
    asInteger(rawResult.photo_count) ??
    asInteger(rawResult.photos_count) ??
    asInteger(rawResult.photos) ??
    asInteger(rawResult.image_count) ??
    null
  );
}

async function findMatchedCompetitorId(params: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  projectId: string;
  resultPlaceId: string | null;
  resultDomain: string | null;
  resultName: string;
}) {
  const { supabase, projectId, resultPlaceId, resultDomain, resultName } = params;

  if (resultPlaceId) {
    const { data, error } = await supabase
      .from("gbp_competitors")
      .select("id")
      .eq("project_id", projectId)
      .eq("place_id", resultPlaceId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to match competitor by place_id: ${error.message}`);
    }

    if (data?.id) {
      return data.id as string;
    }
  }

  if (resultDomain) {
    const { data, error } = await supabase
      .from("gbp_competitors")
      .select("id")
      .eq("project_id", projectId)
      .eq("domain", resultDomain)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to match competitor by domain: ${error.message}`);
    }

    if (data?.id) {
      return data.id as string;
    }
  }

  const { data, error } = await supabase
    .from("gbp_competitors")
    .select("id")
    .eq("project_id", projectId)
    .ilike("name", resultName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to match competitor by name: ${error.message}`);
  }

  return (data?.id as string | undefined) ?? null;
}

async function replaceMarketResultsForKeyword(params: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  projectId: string;
  keyword: string;
  metro: string;
  capturedAt: string;
  candidates: RankCandidate[];
}) {
  const { supabase, projectId, keyword, metro, capturedAt, candidates } = params;

  const { error: deleteError } = await supabase
    .from("gbp_rank_market_results")
    .delete()
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .eq("captured_at", capturedAt);

  if (deleteError) {
    throw new Error(
      `Failed to clear previous market results for ${keyword}: ${deleteError.message}`
    );
  }

  if (candidates.length === 0) {
    return 0;
  }

  const rows: MarketResultInsertRow[] = [];

  for (const candidate of candidates) {
    const rawResult = asRecord(candidate.rawResult);
    const resultName = extractResultName(rawResult);
    const resultDomain = extractDomain(rawResult);
    const resultPlaceId = extractPlaceId(rawResult);
    const rating = extractRating(rawResult);
    const reviewCount = extractReviewCount(rawResult);
    const photoCount = extractPhotoCount(rawResult);

    const matchedCompetitorId = await findMatchedCompetitorId({
      supabase,
      projectId,
      resultPlaceId,
      resultDomain,
      resultName,
    });

    rows.push({
      project_id: projectId,
      keyword,
      metro,
      position: candidate.rankPosition,
      result_name: resultName,
      result_domain: resultDomain,
      result_place_id: resultPlaceId,
      rating,
      review_count: reviewCount,
      photo_count: photoCount,
      is_target: false,
      matched_competitor_id: matchedCompetitorId,
      provider: "dataforseo",
      source: "nightly-rank-discovery",
      raw_result: rawResult,
      captured_at: capturedAt,
    });
  }

  const { error: insertError } = await supabase
    .from("gbp_rank_market_results")
    .insert(rows);

  if (insertError) {
    throw new Error(
      `Failed to store market results for ${keyword}: ${insertError.message}`
    );
  }

  return rows.length;
}

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
      .select(
        `
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
      `
      )
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to load project rank keywords: ${error.message}`,
        },
        { status: 500 }
      );
    }

    const projectKeywords = ((data ?? []) as unknown) as ProjectKeywordRow[];
    const capturedAt = new Date().toISOString().slice(0, 10);

    const results: Array<{
      projectId: string;
      keyword: string;
      metro: string;
      candidateCount: number;
      storedCount: number;
      marketStoredCount: number;
      ok: boolean;
      error?: string;
    }> = [];

    for (const item of projectKeywords) {
      try {
        const project = getProjectRelation(item.project);

        if (
          !project ||
          typeof project.rank_lat !== "number" ||
          Number.isNaN(project.rank_lat) ||
          typeof project.rank_lng !== "number" ||
          Number.isNaN(project.rank_lng)
        ) {
          results.push({
            projectId: item.project_id,
            keyword: item.keyword,
            metro: item.metro,
            candidateCount: 0,
            storedCount: 0,
            marketStoredCount: 0,
            ok: false,
            error: "Project rank origin is incomplete.",
          });
          continue;
        }

        const rankDiscovery = await discoverRankCandidates({
          keyword: item.keyword,
          metro: item.metro,
          latitude: project.rank_lat,
          longitude: project.rank_lng,
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

        const marketStoredCount = await replaceMarketResultsForKeyword({
          supabase,
          projectId: item.project_id,
          keyword: item.keyword,
          metro: item.metro,
          capturedAt,
          candidates: rankDiscovery.candidates as RankCandidate[],
        });

        results.push({
          projectId: item.project_id,
          keyword: item.keyword,
          metro: item.metro,
          candidateCount: rankDiscovery.candidates.length,
          storedCount: rankDiscovery.candidates.length,
          marketStoredCount,
          ok: true,
        });
      } catch (error) {
        results.push({
          projectId: item.project_id,
          keyword: item.keyword,
          metro: item.metro,
          candidateCount: 0,
          storedCount: 0,
          marketStoredCount: 0,
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