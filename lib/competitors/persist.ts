import { supabaseServer } from "../supabase/server";
import type { CompetitorCandidate } from "./types";

function normalizeDomain(input: string | null | undefined): string {
  if (!input) return "";
  return input.trim().toLowerCase();
}

function buildPreferredCompetitorDomain(candidate: CompetitorCandidate): string {
  const domain = normalizeDomain(candidate.domain);
  if (domain) return domain;

  const placeId = candidate.placeId?.trim();
  if (placeId) return `place_id:${placeId}`;

  return `unknown:${candidate.projectId}:${Date.now()}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

type ExistingCompetitorRow = {
  project_id: string;
  competitor_domain: string;
  place_id: string | null;
  name: string | null;
  competitor_name: string | null;
  domain: string | null;
  total_reviews: number | null;
};

export async function upsertCompetitorsIntoGbpCompetitorMetrics(
  candidates: CompetitorCandidate[]
): Promise<number> {
  if (!candidates.length) return 0;

  const supabase = supabaseServer();
  const capturedAt = new Date().toISOString();
  const projectId = candidates[0].projectId;

  const placeIds = Array.from(
    new Set(
      candidates
        .map((c) => c.placeId?.trim())
        .filter((v): v is string => Boolean(v))
    )
  );

  const existingByPlaceId = new Map<string, ExistingCompetitorRow>();

  if (placeIds.length > 0) {
    const { data: existingRows, error: existingError } = await supabase
      .from("gbp_competitor_metrics")
      .select(
        "project_id, competitor_domain, place_id, name, competitor_name, domain, total_reviews"
      )
      .eq("project_id", projectId)
      .in("place_id", placeIds);

    if (existingError) {
      throw new Error(
        `Supabase read gbp_competitor_metrics failed: ${existingError.message}`
      );
    }

    for (const row of (existingRows ?? []) as ExistingCompetitorRow[]) {
      if (row.place_id) {
        existingByPlaceId.set(row.place_id, row);
      }
    }
  }

  const dedupedByCompetitorDomain = new Map<string, CompetitorCandidate>();

  for (const candidate of candidates) {
    const trimmedPlaceId = candidate.placeId?.trim() ?? "";
    const existing = trimmedPlaceId ? existingByPlaceId.get(trimmedPlaceId) : null;

    const competitorDomain = existing?.competitor_domain
      ? existing.competitor_domain
      : buildPreferredCompetitorDomain(candidate);

    const current = dedupedByCompetitorDomain.get(competitorDomain);

    if (!current) {
      dedupedByCompetitorDomain.set(competitorDomain, candidate);
      continue;
    }

    const currentReviews =
      typeof current.totalReviews === "number" ? current.totalReviews : -1;
    const nextReviews =
      typeof candidate.totalReviews === "number" ? candidate.totalReviews : -1;

    if (nextReviews > currentReviews) {
      dedupedByCompetitorDomain.set(competitorDomain, candidate);
      continue;
    }

    if (!current.name && candidate.name) {
      dedupedByCompetitorDomain.set(competitorDomain, candidate);
      continue;
    }

    if (!current.domain && candidate.domain) {
      dedupedByCompetitorDomain.set(competitorDomain, candidate);
    }
  }

  const metricsRows = Array.from(dedupedByCompetitorDomain.entries()).map(
    ([competitorDomain, c]) => {
      const domain = normalizeDomain(c.domain);

      return {
        project_id: c.projectId,
        competitor_domain: competitorDomain,
        place_id: c.placeId?.trim() || null,

        name: c.name,
        competitor_name: c.name,

        domain: domain || null,

        rating: c.rating,
        total_reviews: c.totalReviews,

        source: c.source ?? "maps",
        last_seen_at: c.lastSeenAt ?? capturedAt,
        captured_at: capturedAt,

        raw_provider: c.rawProvider ?? null,
      };
    }
  );

  const { error: upsertError } = await supabase
    .from("gbp_competitor_metrics")
    .upsert(metricsRows, {
      onConflict: "project_id,competitor_domain",
      ignoreDuplicates: false,
    });

  if (upsertError) {
    throw new Error(
      `Supabase upsert gbp_competitor_metrics failed: ${upsertError.message}`
    );
  }

  const snapshotRows = metricsRows.map((r) => ({
    project_id: r.project_id,
    competitor_domain: r.competitor_domain,
    place_id: r.place_id,
    name: r.name,
    rating: r.rating,
    total_reviews: r.total_reviews,
    source: r.source,
    captured_at: capturedAt,
    raw_provider: r.raw_provider,
  }));

  const { error: snapError } = await supabase
    .from("gbp_competitor_snapshots")
    .insert(snapshotRows);

  if (snapError) {
    throw new Error(
      `Supabase insert gbp_competitor_snapshots failed: ${snapError.message}`
    );
  }

  return metricsRows.length;
}