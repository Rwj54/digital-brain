import type {
  Client,
  CompetitorMetric,
  GbpProfile,
  Project,
  VolumePresetOption,
} from "@/components/projects/dashboard/types";
import type { DashboardFormStateValues } from "@/components/projects/dashboard/formState";
import { supabase } from "@/lib/supabaseClient";

type DashboardLoadArgs = {
  clientId: string;
  projectId: string;
  presetOptions: VolumePresetOption[];
};

type DashboardLoadSuccess = {
  ok: true;
  client: Client;
  project: Project;
  gbp: GbpProfile | null;
  competitors: CompetitorMetric[];
  formState: DashboardFormStateValues;
};

type DashboardLoadFailure = {
  ok: false;
  error: string;
};

export type DashboardLoadResult = DashboardLoadSuccess | DashboardLoadFailure;

type RawProjectRow = Project;
type RawClientRow = Client;
type RawGbpRow = GbpProfile;
type RawCompetitorRow = CompetitorMetric;

export async function requireDashboardAuth() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

function getSingleRowFromArray<T>(
  rows: T[] | null | undefined,
  missingMessage: string
): T | DashboardLoadFailure {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      error: missingMessage,
    };
  }

  return rows[0];
}

export async function loadProjectDashboardData({
  clientId,
  projectId,
  presetOptions,
}: DashboardLoadArgs): Promise<DashboardLoadResult> {
  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .limit(1);

  if (clientError) {
    return { ok: false, error: clientError.message };
  }

  const clientResult = getSingleRowFromArray<RawClientRow>(
    clientRows as RawClientRow[] | null | undefined,
    "Client not found."
  );

  if ("ok" in clientResult && clientResult.ok === false) {
    return clientResult;
  }

  const client = clientResult;

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .limit(1);

  if (projectError) {
    return { ok: false, error: projectError.message };
  }

  const projectResult = getSingleRowFromArray<RawProjectRow>(
    projectRows as RawProjectRow[] | null | undefined,
    "Project not found for this client."
  );

  if ("ok" in projectResult && projectResult.ok === false) {
    return projectResult;
  }

  const project = projectResult;

  const savedSingular = project.event_label_singular || "";
  const savedPlural = project.event_label_plural || "";

  const matchingPreset =
    presetOptions.find(
      (preset) =>
        preset.key !== "custom" &&
        preset.singular.toLowerCase() === savedSingular.toLowerCase() &&
        preset.plural.toLowerCase() === savedPlural.toLowerCase()
    ) ?? null;

  let volumePreset = "jobs";
  let eventLabelSingular = "Job";
  let eventLabelPlural = "Jobs";
  let showAdvancedLabels = false;

  if (matchingPreset) {
    volumePreset = matchingPreset.key;
    eventLabelSingular = matchingPreset.singular;
    eventLabelPlural = matchingPreset.plural;
    showAdvancedLabels = false;
  } else if (savedSingular || savedPlural) {
    volumePreset = "custom";
    eventLabelSingular = savedSingular || "Event";
    eventLabelPlural = savedPlural || "Events";
    showAdvancedLabels = true;
  }

  const monthlyEvents =
    project.monthly_customer_events === null ||
    project.monthly_customer_events === undefined
      ? ""
      : String(project.monthly_customer_events);

  const reviewConvRate =
    project.review_conversion_rate === null ||
    project.review_conversion_rate === undefined
      ? ""
      : String(project.review_conversion_rate);

  const { data: gbpRows, error: gbpError } = await supabase
    .from("gbp_profiles")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (gbpError) {
    return { ok: false, error: gbpError.message };
  }

  const gbp = Array.isArray(gbpRows) && gbpRows.length > 0
    ? (gbpRows[0] as RawGbpRow)
    : null;

  const { data: competitorData, error: competitorError } = await supabase
    .from("gbp_competitor_metrics")
    .select("*")
    .eq("project_id", projectId)
    .order("total_reviews", { ascending: false });

  if (competitorError) {
    return { ok: false, error: competitorError.message };
  }

  return {
    ok: true,
    client,
    project,
    gbp,
    competitors: (competitorData ?? []) as RawCompetitorRow[],
    formState: {
      volumePreset,
      showAdvancedLabels,
      eventLabelSingular,
      eventLabelPlural,
      monthlyEvents,
      reviewConvRate,
      gbpName: gbp?.gbp_name ?? "",
      placeId: gbp?.place_id ?? "",
      gbpUrl: gbp?.gbp_url ?? "",
      primaryCategory: gbp?.primary_category ?? "",
      rating:
        gbp?.rating !== null && gbp?.rating !== undefined
          ? String(gbp.rating)
          : "",
      totalReviews:
        gbp?.total_reviews !== null && gbp?.total_reviews !== undefined
          ? String(gbp.total_reviews)
          : "",
      photosCount:
        gbp?.photos_count !== null && gbp?.photos_count !== undefined
          ? String(gbp.photos_count)
          : "",
    },
  };
}