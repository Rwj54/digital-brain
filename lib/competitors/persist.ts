import { supabaseServer } from "../supabase/server";
import type { CompetitorCandidate } from "./types";

function normalizeDomain(input: string | null): string {
  if (!input) return "";
  const s = input.trim().toLowerCase();
  return s;
}

/**
 * Your existing schema has a UNIQUE constraint on (project_id, competitor_domain).
 * DataForSEO often returns no domain, so empty string would collide.
 *
 * Strategy:
 * - If domain exists: competitor_domain = domain (normalized)
 * - Else: competitor_domain = "place_id:<placeId>" (unique + stable)
 *
 * Then upsert on (project_id, competitor_domain) so we respect your existing unique index.
 */
export async function upsertCompetitorsIntoGbpCompetitorMetrics(
  candidates: CompetitorCandidate[]
) {
  if (candidates.length === 0) return 0;

  const supabase = supabaseServer();

  const rows = candidates.map((c) => {
    const domain = normalizeDomain(c.domain);
    const competitorDomain = domain ? domain : `place_id:${c.placeId}`;

    return {
      project_id: c.projectId,

      // existing NOT NULL + UNIQUE (with project_id)
      competitor_domain: competitorDomain,

      // discovery identity (we added this column)
      place_id: c.placeId,

      // keep name for UI
      name: c.name,

      // added/ensured columns
      rating: c.rating,
      total_reviews: c.totalReviews,
      source: c.source,
      last_seen_at: c.lastSeenAt,
      raw_provider: c.rawProvider ?? null,
    };
  });

  const { error, data } = await supabase
    .from("gbp_competitor_metrics")
    .upsert(rows, {
      onConflict: "project_id,competitor_domain",
      ignoreDuplicates: false,
    })
    .select("project_id,competitor_domain");

  if (error) {
    throw new Error(`Supabase upsert gbp_competitor_metrics failed: ${error.message}`);
  }

  return data?.length ?? 0;
}