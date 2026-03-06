import { createClient } from "@supabase/supabase-js";

type StoreRankSnapshotInput = {
  projectId: string;
  competitorId?: string | null;
  keyword: string;
  metro: string;
  rankPosition: number;
  rawResult?: any;
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function storeRankSnapshot(input: StoreRankSnapshotInput) {
  const {
    projectId,
    competitorId,
    keyword,
    metro,
    rankPosition,
    rawResult,
  } = input;

  const { error } = await supabase.from("gbp_rank_snapshots").insert({
    project_id: projectId,
    competitor_id: competitorId ?? null,
    keyword,
    metro,
    rank_position: rankPosition,
    raw_result: rawResult ?? null,
  });

  if (error) {
    throw new Error(`Failed to store rank snapshot: ${error.message}`);
  }

  return { ok: true };
}