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
};

type RankSummary = {
  latestCapturedAt: string;
  latestRank: number | null;
  bestRank: number;
  worstRank: number;
  snapshotCount: number;
  latestDayCount: number;
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

export async function getRankSummary(
  input: GetRankSummaryInput
): Promise<RankSummary | null> {
  const supabase = getSupabaseAdminClient();
  const { projectId, keyword, metro } = input;

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("id, keyword, metro, rank_position, captured_at")
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
  const latestRank =
    latestDayRows.length > 0 ? latestDayRows[0].rank_position : null;

  const allRanks = snapshots.map((row) => row.rank_position);
  const bestRank = Math.min(...allRanks);
  const worstRank = Math.max(...allRanks);

  return {
    latestCapturedAt,
    latestRank,
    bestRank,
    worstRank,
    snapshotCount: snapshots.length,
    latestDayCount: latestDayRows.length,
  };
}