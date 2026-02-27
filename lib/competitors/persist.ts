import { supabaseServer } from "../supabase/server";
import type { CompetitorCandidate } from "./types";

function normalizeDomain(input: string | null | undefined): string {
  if (!input) return "";
  return input.trim().toLowerCase();
}

/**
 * Writes:
 * 1) Latest state -> gbp_competitor_metrics (upsert)
 * 2) Time-series -> gbp_competitor_snapshots (insert)
 *
 * IMPORTANT: Your existing UNIQUE key is (project_id, competitor_domain),
 * so competitor_domain must never collide when domain is missing.
 * We use:
 * - domain if present
 * - else "place_id:<placeId>"
 */
export async function upsertCompetitorsIntoGbpCompetitorMetrics(
  candidates: CompetitorCandidate[]
): Promise<number> {
  if (!candidates.length) return 0;

  const supabase = supabaseServer();
  const capturedAt = new Date().toISOString();

  const metricsRows = candidates.map((c) => {
    const domain = normalizeDomain(c.domain);
    const competitorDomain = domain ? domain : `place_id:${c.placeId}`;

    return {
      project_id: c.projectId,
      competitor_domain: competitorDomain, // NOT NULL + UNIQUE w/ project_id
      place_id: c.placeId,

      // Your table has BOTH of these columns
      name: c.name,
      competitor_name: c.name,

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
    throw new Error(`Supabase upsert gbp_competitor_metrics failed: ${upsertError.message}`);
  }

  // Snapshots (time-series)
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
    throw new Error(`Supabase insert gbp_competitor_snapshots failed: ${snapError.message}`);
  }

  return metricsRows.length;
}