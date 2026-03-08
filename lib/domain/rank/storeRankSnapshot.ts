import { createClient } from "@supabase/supabase-js";

type StoreRankSnapshotInput = {
  projectId: string;
  competitorId?: string | null;
  keyword: string;
  metro: string;
  rankPosition: number;
  rawResult?: unknown;
  capturedAt?: string;
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

export async function storeRankSnapshot(input: StoreRankSnapshotInput) {
  const supabase = getSupabaseAdminClient();

  const {
    projectId,
    competitorId,
    keyword,
    metro,
    rankPosition,
    rawResult,
    capturedAt,
  } = input;

  const { error } = await supabase.from("gbp_rank_snapshots").insert({
    project_id: projectId,
    competitor_id: competitorId ?? null,
    keyword,
    metro,
    rank_position: rankPosition,
    raw_result: rawResult ?? null,
    captured_at: capturedAt ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    throw new Error(`Failed to store rank snapshot: ${error.message}`);
  }

  return { ok: true };
}