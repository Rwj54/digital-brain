import { supabaseServer } from "../supabase/server";

type PersistCandidate = {
  project_id: string;
  competitor_domain: string;
  place_id: string | null;
  name: string | null;
  rating: number | null;
  total_reviews: number | null;
  source: string;
  last_seen_at: string;
  raw_provider?: any;
};

export async function upsertCompetitorsIntoGbpCompetitorMetrics(
  candidates: PersistCandidate[]
): Promise<number> {
  if (!candidates.length) return 0;

  const supabase = supabaseServer();

  const nowIso = new Date().toISOString();

  // 1️⃣ Upsert latest state table (existing behavior)
  const { error: upsertError } = await supabase
    .from("gbp_competitor_metrics")
    .upsert(
      candidates.map((c) => ({
        project_id: c.project_id,
        competitor_domain: c.competitor_domain,
        place_id: c.place_id,
        name: c.name,
        rating: c.rating,
        total_reviews: c.total_reviews,
        source: c.source,
        last_seen_at: nowIso,
        captured_at: nowIso,
        raw_provider: c.raw_provider ?? null,
      })),
      {
        onConflict: "project_id,competitor_domain",
      }
    );

  if (upsertError) {
    throw new Error(
      `Supabase upsert gbp_competitor_metrics failed: ${upsertError.message}`
    );
  }

  // 2️⃣ Insert time-series snapshot rows (NEW)
  const snapshotRows = candidates.map((c) => ({
    project_id: c.project_id,
    competitor_domain: c.competitor_domain,
    place_id: c.place_id,
    name: c.name,
    rating: c.rating,
    total_reviews: c.total_reviews,
    source: c.source,
    captured_at: nowIso,
    raw_provider: c.raw_provider ?? null,
  }));

  const { error: snapshotError } = await supabase
    .from("gbp_competitor_snapshots")
    .insert(snapshotRows);

  if (snapshotError) {
    throw new Error(
      `Supabase insert gbp_competitor_snapshots failed: ${snapshotError.message}`
    );
  }

  return candidates.length;
}