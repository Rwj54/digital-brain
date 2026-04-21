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

function buildKeywordRowKey(params: {
  keyword: string;
  metro: string;
}): string {
  return `${normalizeKeywordValue(params.keyword)}||${normalizeString(params.metro)}`;
}

function normalizeSeedKeywordRows(params: {
  projectId: string;
  seedKeywords: SeedRankKeywordInput[];
  canonicalMetro?: string | null;
}): Array<{
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
}> {
  const canonicalMetro = normalizeString(params.canonicalMetro);

  return params.seedKeywords
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
        row,
      ): row is {
        project_id: string;
        keyword: string;
        metro: string;
        is_active: boolean;
        priority: number;
      } => row !== null,
    );
}

export function buildProjectOnboardingKeywordCandidates(params: {
  inputSeedKeywords: SeedRankKeywordInput[] | undefined;
  inferredKeywordCandidates: string[] | undefined;
  canonicalCategory: string | null;
}): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  function pushCandidate(value: string | null | undefined) {
    const normalized = normalizeKeywordValue(value);

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    candidates.push(normalized);
  }

  const providedSeedKeywords = Array.isArray(params.inputSeedKeywords)
    ? params.inputSeedKeywords
    : [];

  if (providedSeedKeywords.length > 0) {
    for (const row of providedSeedKeywords) {
      pushCandidate(row.keyword);
    }

    return candidates;
  }

  const inferredKeywordCandidates = Array.isArray(params.inferredKeywordCandidates)
    ? params.inferredKeywordCandidates
    : [];

  for (const keyword of inferredKeywordCandidates) {
    pushCandidate(keyword);
  }

  pushCandidate(params.canonicalCategory);

  return candidates;
}

export function buildProjectOnboardingSeedKeywords(params: {
  inputSeedKeywords: SeedRankKeywordInput[] | undefined;
  discoveredKeywordCandidates: string[];
  canonicalMetro: string | null;
}): SeedRankKeywordInput[] {
  const canonicalMetro = normalizeString(params.canonicalMetro);
  const providedSeedKeywords = Array.isArray(params.inputSeedKeywords)
    ? params.inputSeedKeywords
    : [];

  if (providedSeedKeywords.length > 0) {
    const normalizedRows: SeedRankKeywordInput[] = [];

    for (const [index, row] of providedSeedKeywords.entries()) {
      const keyword = normalizeKeywordValue(row.keyword);
      const metro = normalizeString(row.metro) || canonicalMetro;

      if (!keyword || !metro) {
        continue;
      }

      normalizedRows.push({
        keyword,
        metro,
        priority:
          typeof row.priority === "number" && Number.isFinite(row.priority)
            ? Math.round(row.priority)
            : index + 1,
        isActive:
          typeof row.isActive === "boolean" ? row.isActive : index === 0,
      });
    }

    return normalizedRows;
  }

  if (!canonicalMetro) {
    return [];
  }

  return params.discoveredKeywordCandidates.map((keyword, index) => ({
    keyword,
    metro: canonicalMetro,
    priority: index + 1,
    isActive: index === 0,
  }));
}

export async function upsertProjectOnboardingSeedKeywords(params: {
  projectId: string;
  seedKeywords: SeedRankKeywordInput[];
  canonicalMetro?: string | null;
}): Promise<number> {
  const supabase = supabaseAdmin();

  const desiredRows = normalizeSeedKeywordRows({
    projectId: params.projectId,
    seedKeywords: params.seedKeywords,
    canonicalMetro: params.canonicalMetro,
  });

  if (desiredRows.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from("project_rank_keywords")
    .select("id, keyword, metro, is_active, priority")
    .eq("project_id", params.projectId);

  if (error) {
    throw new Error(
      `Failed to load existing project rank keywords for reconciliation: ${error.message}`,
    );
  }

  const existingRows = ((data ?? []) as ProjectRankKeywordRow[]).filter(
    (row) => normalizeString(row.keyword) && normalizeString(row.metro),
  );

  const desiredByKey = new Map(
    desiredRows.map((row) => [
      buildKeywordRowKey({ keyword: row.keyword, metro: row.metro }),
      row,
    ]),
  );

  const existingByKey = new Map(
    existingRows.map((row) => [
      buildKeywordRowKey({ keyword: row.keyword, metro: row.metro }),
      row,
    ]),
  );

  const sameRowCount = existingRows.length === desiredRows.length;

  const sameShape =
    sameRowCount &&
    desiredRows.every((row) => {
      const key = buildKeywordRowKey({ keyword: row.keyword, metro: row.metro });
      const existing = existingByKey.get(key);

      return (
        Boolean(existing) &&
        existing?.is_active === row.is_active &&
        existing?.priority === row.priority
      );
    });

  if (!sameShape) {
    const { error: deleteError } = await supabase
      .from("project_rank_keywords")
      .delete()
      .eq("project_id", params.projectId);

    if (deleteError) {
      throw new Error(
        `Failed to clear stale onboarding keyword frame: ${deleteError.message}`,
      );
    }

    const { error: insertError } = await supabase
      .from("project_rank_keywords")
      .insert(desiredRows);

    if (insertError) {
      throw new Error(
        `Failed to insert reconciled onboarding keyword frame: ${insertError.message}`,
      );
    }

    return desiredRows.length;
  }

  return desiredByKey.size;
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
      `Failed to load project rank keywords for normalization: ${error.message}`,
    );
  }

  const rows = ((data ?? []) as ProjectRankKeywordRow[]).filter(
    (row) => normalizeString(row.keyword) && normalizeString(row.metro),
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
      `Failed to normalize project rank keywords: ${upsertError.message}`,
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
        `Failed to remove non-canonical project rank keywords: ${deleteError.message}`,
      );
    }
  }

  return {
    normalizedKeywordCount: rowsNeedingNormalization.length,
  };
}
