import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ProjectOnboardingRow = {
  id: string;
  site_url: string | null;
  category: string | null;
  metro: string | null;
  radius_miles: number | null;
  primary_category: string | null;
  target_metro: string | null;
  target_radius_miles: number | null;
  target_domain: string | null;
  target_brand_name: string | null;
  rank_lat: number | null;
  rank_lng: number | null;
  maps_location_code: number | null;
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

export type ProjectOnboardingLatestGbpProfileRow = {
  place_id: string | null;
  gbp_name: string | null;
  primary_category: string | null;
  last_fetched_at: string | null;
};

export type ProjectOnboardingContext = {
  project: ProjectOnboardingRow;
  activeKeywords: ProjectOnboardingKeywordRow[];
  latestGbpProfile: ProjectOnboardingLatestGbpProfileRow | null;
};

function isProjectOnboardingRow(value: unknown): value is ProjectOnboardingRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    "site_url" in row &&
    "category" in row &&
    "metro" in row &&
    "radius_miles" in row &&
    "primary_category" in row &&
    "target_metro" in row &&
    "target_radius_miles" in row &&
    "target_domain" in row &&
    "target_brand_name" in row &&
    "rank_lat" in row &&
    "rank_lng" in row &&
    "maps_location_code" in row
  );
}

function isProjectOnboardingKeywordRow(
  value: unknown,
): value is ProjectOnboardingKeywordRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.project_id === "string" &&
    typeof row.keyword === "string" &&
    typeof row.metro === "string" &&
    typeof row.is_active === "boolean" &&
    typeof row.priority === "number" &&
    typeof row.created_at === "string"
  );
}

function isProjectOnboardingLatestGbpProfileRow(
  value: unknown,
): value is ProjectOnboardingLatestGbpProfileRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    "place_id" in row &&
    "gbp_name" in row &&
    "primary_category" in row &&
    "last_fetched_at" in row
  );
}

async function loadProject(projectId: string): Promise<ProjectOnboardingRow> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("projects")
    .select(
      [
        "id",
        "site_url",
        "category",
        "metro",
        "radius_miles",
        "primary_category",
        "target_metro",
        "target_radius_miles",
        "target_domain",
        "target_brand_name",
        "rank_lat",
        "rank_lng",
        "maps_location_code",
      ].join(", "),
    )
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  if (!data) {
    throw new Error("Project not found.");
  }

  if (!isProjectOnboardingRow(data)) {
    throw new Error("Project row shape is invalid for onboarding context.");
  }

  return data;
}

async function loadActiveKeywords(
  projectId: string,
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

  const rows = data ?? [];

  if (!Array.isArray(rows)) {
    throw new Error("Project rank keyword rows returned in an invalid format.");
  }

  const validRows = rows.filter(isProjectOnboardingKeywordRow);

  if (validRows.length !== rows.length) {
    throw new Error(
      "One or more project rank keyword rows had an invalid shape.",
    );
  }

  return validRows;
}

async function loadLatestGbpProfile(
  projectId: string,
): Promise<ProjectOnboardingLatestGbpProfileRow | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("gbp_profiles")
    .select("place_id, gbp_name, primary_category, last_fetched_at")
    .eq("project_id", projectId)
    .order("last_fetched_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to load latest GBP profile: ${error.message}`);
  }

  const row = Array.isArray(data) ? (data[0] ?? null) : null;

  if (!row) {
    return null;
  }

  if (!isProjectOnboardingLatestGbpProfileRow(row)) {
    throw new Error("Latest GBP profile row shape is invalid.");
  }

  return row;
}

export async function loadProjectOnboardingContext(
  projectId: string,
): Promise<ProjectOnboardingContext> {
  const normalizedProjectId =
    typeof projectId === "string" ? projectId.trim() : "";

  if (!normalizedProjectId) {
    throw new Error("Missing projectId.");
  }

  const project = await loadProject(normalizedProjectId);
  const activeKeywords = await loadActiveKeywords(normalizedProjectId);
  const latestGbpProfile = await loadLatestGbpProfile(normalizedProjectId);

  return {
    project,
    activeKeywords,
    latestGbpProfile,
  };
}
