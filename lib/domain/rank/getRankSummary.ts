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
    place_id?: string | null;
    cid?: string | null;
  } | null;
};

type ProjectTargetRow = {
  target_business_name: string | null;
  target_place_id: string | null;
};

type RankSummary = {
  latestCapturedAt: string;
  latestRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  snapshotCount: number;
  latestDayCount: number;
  targetFoundInLatestSnapshot: boolean;
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

function isTargetMatch(
  row: RankSnapshotRow,
  targetBusinessName: string | null,
  targetPlaceId: string | null
) {
  const rowPlaceId = row.raw_result?.place_id ?? null;
  const rowTitle = row.raw_result?.title ?? null;

  if (targetPlaceId && rowPlaceId && targetPlaceId === rowPlaceId) {
    return true;
  }

  if (!targetBusinessName || !rowTitle) {
    return false;
  }

  return normalizeBusinessName(targetBusinessName) === normalizeBusinessName(rowTitle);
}

export async function getRankSummary(
  input: GetRankSummaryInput
): Promise<RankSummary | null> {
  const supabase = getSupabaseAdminClient();
  const { projectId, keyword, metro } = input;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("target_business_name, target_place_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to load project target identity: ${projectError.message}`);
  }

  const projectTarget = (project ?? null) as ProjectTargetRow | null;

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
  const latestDayRows = snapshots.filter(
    (row) => row.captured_at === latestCapturedAt
  );

  const latestTargetRow = latestDayRows.find((row) =>
    isTargetMatch(
      row,
      projectTarget?.target_business_name ?? null,
      projectTarget?.target_place_id ?? null
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

  for (const rows of rowsByDay.values()) {
    const matchedRow = rows.find((row) =>
      isTargetMatch(
        row,
        projectTarget?.target_business_name ?? null,
        projectTarget?.target_place_id ?? null
      )
    );

    if (matchedRow) {
      targetRanksByDay.push(matchedRow.rank_position);
    }
  }

  return {
    latestCapturedAt,
    latestRank: latestTargetRow ? latestTargetRow.rank_position : 21,
    bestRank:
      targetRanksByDay.length > 0 ? Math.min(...targetRanksByDay) : 21,
    worstRank:
      targetRanksByDay.length > 0 ? Math.max(...targetRanksByDay) : 21,
    snapshotCount: snapshots.length,
    latestDayCount: latestDayRows.length,
    targetFoundInLatestSnapshot: Boolean(latestTargetRow),
  };
}