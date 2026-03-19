import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { storeRankSnapshot } from "@/lib/domain/rank/storeRankSnapshot";

type RankSnapshotNormalizationRow = {
  id: string;
  competitor_id: string | null;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
  raw_result: unknown;
};

function normalizeString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKeywordValue(value: string | null | undefined): string {
  return normalizeString(value).toLowerCase();
}

export async function normalizeProjectOnboardingLegacyRankSnapshots(params: {
  projectId: string;
  canonicalKeyword: string | null;
  canonicalMetro: string | null;
}): Promise<{
  normalizedSnapshotCount: number;
}> {
  const canonicalKeyword = normalizeKeywordValue(params.canonicalKeyword);
  const canonicalMetro = normalizeString(params.canonicalMetro);

  if (!canonicalKeyword || !canonicalMetro) {
    return {
      normalizedSnapshotCount: 0,
    };
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select(
      "id, competitor_id, keyword, metro, rank_position, captured_at, raw_result"
    )
    .eq("project_id", params.projectId);

  if (error) {
    throw new Error(
      `Failed to load rank snapshots for normalization: ${error.message}`
    );
  }

  const rows = ((data ?? []) as RankSnapshotNormalizationRow[]).filter(
    (row) =>
      typeof row.id === "string" &&
      normalizeString(row.keyword) &&
      normalizeString(row.metro) &&
      typeof row.rank_position === "number" &&
      Number.isFinite(row.rank_position) &&
      normalizeString(row.captured_at)
  );

  const rowsNeedingNormalization = rows.filter((row) => {
    const normalizedKeyword = normalizeKeywordValue(row.keyword);
    const normalizedMetro = normalizeString(row.metro);

    return (
      normalizedKeyword !== canonicalKeyword || normalizedMetro !== canonicalMetro
    );
  });

  if (rowsNeedingNormalization.length === 0) {
    return {
      normalizedSnapshotCount: 0,
    };
  }

  for (const row of rowsNeedingNormalization) {
    await storeRankSnapshot({
      projectId: params.projectId,
      competitorId: row.competitor_id,
      keyword: canonicalKeyword,
      metro: canonicalMetro,
      rankPosition: Math.round(row.rank_position),
      rawResult: row.raw_result ?? null,
      capturedAt: row.captured_at,
    });
  }

  const idsToDelete = rowsNeedingNormalization
    .map((row) => row.id)
    .filter((id) => typeof id === "string" && id.trim().length > 0);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("gbp_rank_snapshots")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      throw new Error(
        `Failed to remove non-canonical rank snapshots: ${deleteError.message}`
      );
    }
  }

  return {
    normalizedSnapshotCount: rowsNeedingNormalization.length,
  };
}