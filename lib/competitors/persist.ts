import { supabaseServer } from "../supabase/server";
import type { CompetitorCandidate } from "./types";

function normalizeDomain(input: string | null | undefined): string {
  if (!input) return "";
  return input.trim().toLowerCase();
}

function buildCompetitorIdentityKey(candidate: CompetitorCandidate): string {
  const placeId = candidate.placeId?.trim();

  if (placeId) {
    return `place_id:${placeId}`;
  }

  const domain = normalizeDomain(candidate.domain);
  if (domain) {
    return domain;
  }

  return `unknown:${candidate.projectId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Writes:
 * 1) Latest state -> gbp_competitor_metrics (upsert)
 * 2) Time-series -> gbp_competitor_snapshots (insert)
 *
 * Identity rule:
 * - place_id first
 * - domain fallback only if place_id is missing
 *
 * This prevents the same business from appearing once as a domain row
 * and again as a place_id row on later runs.
 */
export async function upsertCompetitorsIntoGbpCompetitorMetrics(
  candidates: CompetitorCandidate[]
): Promise<number> {
  if (!candidates.length) return 0;

  const supabase = supabaseServer();
  const capturedAt = new Date().toISOString();

  const dedupedByIdentity = new Map<string, CompetitorCandidate>();

  for (const candidate of candidates) {
    const identityKey = buildCompetitorIdentityKey(candidate);
    const existing = dedupedByIdentity.get(identityKey);

    if (!existing) {
      dedupedByIdentity.set(identityKey, candidate);
      continue;
    }

    const existingReviews = typeof existing.totalReviews === "number" ? existing.totalReviews : -1;
    const nextReviews = typeof candidate.totalReviews === "number" ? candidate.totalReviews : -1;

    if (nextReviews > existingReviews) {
      dedupedByIdentity.set(identityKey, candidate);
      continue;
    }

    if (!existing.name && candidate.name) {
      dedupedByIdentity.set(identityKey, candidate);
      continue;
    }

    if (!existing.domain && candidate.domain) {
      dedupedByIdentity.set(identityKey, candidate);
    }
  }

  const metricsRows = Array.from(dedupedByIdentity.values()).map((c) => {
    const domain = normalizeDomain(c.domain);
    const competitorDomain = buildCompetitorIdentityKey(c);

    return {
      project_id: c.projectId,
      competitor_domain: competitorDomain,
      place_id: c.placeId,

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
  });

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
    source: r.source ?? "maps",
    captured_at: capturedAt,
    raw_provider: r.raw_provider ?? null,
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