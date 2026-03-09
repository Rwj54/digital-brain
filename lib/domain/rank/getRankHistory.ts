import { createClient } from "@supabase/supabase-js";

type GetRankHistoryInput = {
  projectId: string;
  keyword: string;
  metro: string;
  limit?: number;
};

type RankHistoryRow = {
  id: string;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
  raw_result: unknown;
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

export async function getRankHistory(input: GetRankHistoryInput) {
  const supabase = getSupabaseAdminClient();
  const { projectId, keyword, metro, limit = 100 } = input;

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("id, keyword, metro, rank_position, captured_at, raw_result")
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .order("captured_at", { ascending: false })
    .order("rank_position", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load rank history: ${error.message}`);
  }

  return (data ?? []) as RankHistoryRow[];
}