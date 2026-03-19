import { createClient } from "@supabase/supabase-js";

type GetRankSummaryInput = {
  projectId: string;
  keyword: string;
  metro: string;
};

type RankSnapshotRow = {
  id: string;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
  raw_result: {
    title?: string | null;
    name?: string | null;
    place_id?: string | null;
    placeId?: string | null;
    cid?: string | null;
    data_id?: string | null;
    domain?: string | null;
    url?: string | null;
  } | null;
};

type ProjectTargetRow = {
  target_business_name: string | null;
  target_place_id: string | null;
  target_brand_name: string | null;
  target_domain: string | null;
};

type RankSummary = {
  latestCapturedAt: string;
  latestRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  snapshotCount: number;
  latestDayCount: number;
  targetFoundInLatestSnapshot: boolean;
  top3PresenceCount: number;
  top10PresenceCount: number;
  top20PresenceCount: number;
  top3PresenceRate: number;
  top10PresenceRate: number;
  top20PresenceRate: number;
  localMarketVisibilityScore: number;
};

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

function normalizeBusinessName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDomain(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const firstSegment = withoutProtocol.split("/")[0] ?? "";
  return firstSegment.replace(/^www\./, "");
}

function getSnapshotPlaceId(row: RankSnapshotRow) {
  return (
    row.raw_result?.place_id ??
    row.raw_result?.placeId ??
    row.raw_result?.cid ??
    row.raw_result?.data_id ??
    null
  );
}

function getSnapshotTitle(row: RankSnapshotRow) {
  return row.raw_result?.title ?? row.raw_result?.name ?? null;
}

function getSnapshotDomain(row: RankSnapshotRow) {
  return normalizeDomain(row.raw_result?.domain ?? row.raw_result?.url ?? null);
}

function isTargetSnapshotMatch(
  row: RankSnapshotRow,
  targetBusinessName: string | null,
  targetPlaceId: string | null,
  targetDomain: string | null
) {
  const rowPlaceId = getSnapshotPlaceId(row);
  const rowTitle = getSnapshotTitle(row);
  const rowDomain = getSnapshotDomain(row);
  const normalizedTargetDomain = normalizeDomain(targetDomain);

  if (targetPlaceId && rowPlaceId && targetPlaceId === rowPlaceId) {
    return true;
  }

  if (normalizedTargetDomain && rowDomain && normalizedTargetDomain === rowDomain) {
    return true;
  }

  if (!targetBusinessName || !rowTitle) {
    return false;
  }

  return normalizeBusinessName(targetBusinessName) === normalizeBusinessName(rowTitle);
}

function roundRate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export async function getRankSummary(
  input: GetRankSummaryInput
): Promise<RankSummary | null> {
  const supabase = getSupabaseAdminClient();
  const { projectId, keyword, metro } = input;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("target_business_name, target_place_id, target_brand_name, target_domain")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to load project target identity: ${projectError.message}`);
  }

  const projectTarget = (project ?? null) as ProjectTargetRow | null;
  const effectiveTargetBusinessName =
    projectTarget?.target_brand_name ?? projectTarget?.target_business_name ?? null;
  const effectiveTargetPlaceId = projectTarget?.target_place_id ?? null;
  const effectiveTargetDomain = projectTarget?.target_domain ?? null;

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("id, keyword, metro, rank_position, captured_at, raw_result")
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .order("captured_at", { ascending: false })
    .order("rank_position", { ascending: true });

  if (error) {
    throw new Error(`Failed to load rank summary: ${error.message}`);
  }

  const snapshots = (data ?? []) as RankSnapshotRow[];

  if (snapshots.length === 0) {
    return null;
  }

  const latestCapturedAt = snapshots[0].captured_at;
  const latestDayRows = snapshots.filter((row) => row.captured_at === latestCapturedAt);

  const latestTargetRow = latestDayRows.find((row) =>
    isTargetSnapshotMatch(
      row,
      effectiveTargetBusinessName,
      effectiveTargetPlaceId,
      effectiveTargetDomain
    )
  );

  const rowsByDay = new Map<string, RankSnapshotRow[]>();

  for (const row of snapshots) {
    const existing = rowsByDay.get(row.captured_at);

    if (existing) {
      existing.push(row);
    } else {
      rowsByDay.set(row.captured_at, [row]);
    }
  }

  const targetRanksByDay: number[] = [];
  let top3PresenceCount = 0;
  let top10PresenceCount = 0;
  let top20PresenceCount = 0;

  for (const rows of rowsByDay.values()) {
    const matchedRow = rows.find((row) =>
      isTargetSnapshotMatch(
        row,
        effectiveTargetBusinessName,
        effectiveTargetPlaceId,
        effectiveTargetDomain
      )
    );

    const rankForDay = matchedRow?.rank_position ?? 21;

    if (matchedRow) {
      targetRanksByDay.push(matchedRow.rank_position);
    }

    if (rankForDay <= 3) {
      top3PresenceCount += 1;
    }

    if (rankForDay <= 10) {
      top10PresenceCount += 1;
    }

    if (rankForDay <= 20) {
      top20PresenceCount += 1;
    }
  }

  const dayCount = rowsByDay.size || 1;
  const top3PresenceRate = roundRate(top3PresenceCount / dayCount);
  const top10PresenceRate = roundRate(top10PresenceCount / dayCount);
  const top20PresenceRate = roundRate(top20PresenceCount / dayCount);

  const localMarketVisibilityScore = roundScore(
    top3PresenceRate * 100 * 1.0 +
      top10PresenceRate * 100 * 0.6 +
      top20PresenceRate * 100 * 0.25
  );

  return {
    latestCapturedAt,
    latestRank: latestTargetRow ? latestTargetRow.rank_position : 21,
    bestRank: targetRanksByDay.length > 0 ? Math.min(...targetRanksByDay) : 21,
    worstRank: targetRanksByDay.length > 0 ? Math.max(...targetRanksByDay) : 21,
    snapshotCount: snapshots.length,
    latestDayCount: latestDayRows.length,
    targetFoundInLatestSnapshot: Boolean(latestTargetRow),
    top3PresenceCount,
    top10PresenceCount,
    top20PresenceCount,
    top3PresenceRate,
    top10PresenceRate,
    top20PresenceRate,
    localMarketVisibilityScore,
  };
}
