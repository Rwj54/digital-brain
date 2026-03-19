import { createClient } from "@supabase/supabase-js";

type ActiveRankContext = {
  projectId: string;
  keywordId: string | null;
  keyword: string | null;
  metro: string | null;
  rankLat: number | null;
  rankLng: number | null;
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

export async function getActiveRankContext(
  projectId: string
): Promise<ActiveRankContext | null> {
  const normalizedProjectId =
    typeof projectId === "string" ? projectId.trim() : "";

  if (!normalizedProjectId) {
    throw new Error("Missing projectId.");
  }

  const supabase = getSupabaseAdminClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, rank_lat, rank_lng")
    .eq("id", normalizedProjectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(`Failed to load project: ${projectError.message}`);
  }

  if (!project) {
    return null;
  }

  const { data: keywordRows, error: keywordError } = await supabase
    .from("project_rank_keywords")
    .select("id, keyword, metro, is_active, priority")
    .eq("project_id", normalizedProjectId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (keywordError) {
    throw new Error(
      `Failed to load project rank keywords: ${keywordError.message}`
    );
  }

  const activeKeyword = (keywordRows ?? [])[0] ?? null;

  return {
    projectId: project.id,
    keywordId: activeKeyword?.id ?? null,
    keyword: activeKeyword?.keyword ?? null,
    metro: activeKeyword?.metro ?? null,
    rankLat: project.rank_lat,
    rankLng: project.rank_lng,
  };
}
