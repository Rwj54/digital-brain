import { createClient } from "@supabase/supabase-js";

type GetRankSeriesInput = {
  projectId: string;
  keyword: string;
  metro: string;
};

type RankSnapshotRow = {
  captured_at: string;
  rank_position: number;
};

type RankSeriesPoint = {
  capturedAt: string;
  bestRank: number;
  worstRank: number;
  resultCount: number;
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

export async function getRankSeries(input: GetRankSeriesInput) {
  const supabase = getSupabaseAdminClient();

  const { projectId, keyword, metro } = input;

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("captured_at, rank_position")
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .order("captured_at", { ascending: true })
    .order("rank_position", { ascending: true });

  if (error) {
    throw new Error(`Failed to load rank series: ${error.message}`);
  }

  const rows = (data ?? []) as RankSnapshotRow[];

  const byDay = new Map<string, RankSeriesPoint>();

  for (const row of rows) {
    const existing = byDay.get(row.captured_at);

    if (!existing) {
      byDay.set(row.captured_at, {
        capturedAt: row.captured_at,
        bestRank: row.rank_position,
        worstRank: row.rank_position,
        resultCount: 1,
      });
      continue;
    }

    existing.bestRank = Math.min(existing.bestRank, row.rank_position);
    existing.worstRank = Math.max(existing.worstRank, row.rank_position);
    existing.resultCount += 1;
  }

  return Array.from(byDay.values());
}