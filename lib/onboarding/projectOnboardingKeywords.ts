import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SeedRankKeywordInput } from "@/lib/onboarding/runProjectOnboarding";

type ProjectRankKeywordRow = {
  id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
};

function normalizeString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKeywordValue(value: string | null | undefined): string {
  return normalizeString(value).toLowerCase();
}

export async function upsertProjectOnboardingSeedKeywords(params: {
  projectId: string;
  seedKeywords: SeedRankKeywordInput[];
  canonicalMetro?: string | null;
}): Promise<number> {
  const supabase = supabaseAdmin();
  const canonicalMetro = normalizeString(params.canonicalMetro);

  const rows = params.seedKeywords
    .map((row, index) => {
      const keyword = normalizeKeywordValue(row.keyword);
      const providedMetro = typeof row.metro === "string" ? row.metro.trim() : "";
      const metro = canonicalMetro || providedMetro;

      if (!keyword || !metro) {
        return null;
      }

      return {
        project_id: params.projectId,
        keyword,
        metro,
        is_active: row.isActive ?? true,
        priority:
          typeof row.priority === "number" && Number.isFinite(row.priority)
            ? Math.round(row.priority)
            : index + 1,
      };
    })
    .filter(
      (
        row
      ): row is {
        project_id: string;
        keyword: string;
        metro: string;
        is_active: boolean;
        priority: number;
      } => row !== null
    );

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("project_rank_keywords")
    .upsert(rows, { onConflict: "project_id,keyword,metro" });

  if (error) {
    throw new Error(`Failed to upsert project_rank_keywords: ${error.message}`);
  }

  return rows.length;
}

export async function normalizeProjectOnboardingRankKeywords(params: {
  projectId: string;
  canonicalMetro: string | null;
}): Promise<{
  normalizedKeywordCount: number;
}> {
  const canonicalMetro = normalizeString(params.canonicalMetro);

  if (!canonicalMetro) {
    return {
      normalizedKeywordCount: 0,
    };
  }

  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("project_rank_keywords")
    .select("id, keyword, metro, is_active, priority")
    .eq("project_id", params.projectId);

  if (error) {
    throw new Error(
      `Failed to load project rank keywords for normalization: ${error.message}`
    );
  }

  const rows = ((data ?? []) as ProjectRankKeywordRow[]).filter(
    (row) => normalizeString(row.keyword) && normalizeString(row.metro)
  );

  const rowsNeedingNormalization = rows.filter((row) => {
    const normalizedKeyword = normalizeKeywordValue(row.keyword);
    const normalizedMetro = normalizeString(row.metro);

    return normalizedKeyword !== row.keyword || normalizedMetro !== canonicalMetro;
  });

  if (rowsNeedingNormalization.length === 0) {
    return {
      normalizedKeywordCount: 0,
    };
  }

  const rowsToUpsert = rowsNeedingNormalization.map((row) => ({
    project_id: params.projectId,
    keyword: normalizeKeywordValue(row.keyword),
    metro: canonicalMetro,
    is_active: row.is_active,
    priority:
      typeof row.priority === "number" && Number.isFinite(row.priority)
        ? Math.round(row.priority)
        : 1,
  }));

  const { error: upsertError } = await supabase
    .from("project_rank_keywords")
    .upsert(rowsToUpsert, { onConflict: "project_id,keyword,metro" });

  if (upsertError) {
    throw new Error(
      `Failed to normalize project rank keywords: ${upsertError.message}`
    );
  }

  const idsToDelete = rowsNeedingNormalization
    .map((row) => row.id)
    .filter((id) => typeof id === "string" && id.trim().length > 0);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("project_rank_keywords")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      throw new Error(
        `Failed to remove non-canonical project rank keywords: ${deleteError.message}`
      );
    }
  }

  return {
    normalizedKeywordCount: rowsNeedingNormalization.length,
  };
}