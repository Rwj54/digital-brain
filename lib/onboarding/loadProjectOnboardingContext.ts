import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ProjectOnboardingRow = {
  id: string;
  rank_lat: number | null;
  rank_lng: number | null;
};

export type ProjectOnboardingKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
  created_at: string;
};

export type ProjectOnboardingContext = {
  project: ProjectOnboardingRow;
  activeKeywords: ProjectOnboardingKeywordRow[];
};

async function loadProject(projectId: string): Promise<ProjectOnboardingRow> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("projects")
    .select("id, rank_lat, rank_lng")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  if (!data) {
    throw new Error("Project not found.");
  }

  return data as ProjectOnboardingRow;
}

async function loadActiveKeywords(
  projectId: string
): Promise<ProjectOnboardingKeywordRow[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("project_rank_keywords")
    .select("id, project_id, keyword, metro, is_active, priority, created_at")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load project rank keywords: ${error.message}`);
  }

  return (data ?? []) as ProjectOnboardingKeywordRow[];
}

export async function loadProjectOnboardingContext(
  projectId: string
): Promise<ProjectOnboardingContext> {
  const normalizedProjectId =
    typeof projectId === "string" ? projectId.trim() : "";

  if (!normalizedProjectId) {
    throw new Error("Missing projectId.");
  }

  const project = await loadProject(normalizedProjectId);
  const activeKeywords = await loadActiveKeywords(normalizedProjectId);

  return {
    project,
    activeKeywords,
  };
}