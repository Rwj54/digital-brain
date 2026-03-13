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

export async function requireDashboardAuth() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function loadProjectDashboardData({
  clientId,
  projectId,
  presetOptions,
}: DashboardLoadArgs): Promise<DashboardLoadResult> {
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (clientError) {
    return { ok: false, error: clientError.message };
  }

  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();

  if (projectError) {
    return { ok: false, error: projectError.message };
  }

  const savedSingular = projectData.event_label_singular || "";
  const savedPlural = projectData.event_label_plural || "";

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
    projectData.monthly_customer_events === null ||
    projectData.monthly_customer_events === undefined
      ? ""
      : String(projectData.monthly_customer_events);

  const reviewConvRate =
    projectData.review_conversion_rate === null ||
    projectData.review_conversion_rate === undefined
      ? ""
      : String(projectData.review_conversion_rate);

  const { data: gbpData, error: gbpError } = await supabase
    .from("gbp_profiles")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (gbpError) {
    return { ok: false, error: gbpError.message };
  }

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
    client: clientData,
    project: projectData,
    gbp: gbpData ?? null,
    competitors: competitorData ?? [],
    formState: {
      volumePreset,
      showAdvancedLabels,
      eventLabelSingular,
      eventLabelPlural,
      monthlyEvents,
      reviewConvRate,
      gbpName: gbpData?.gbp_name ?? "",
      placeId: gbpData?.place_id ?? "",
      gbpUrl: gbpData?.gbp_url ?? "",
      primaryCategory: gbpData?.primary_category ?? "",
      rating:
        gbpData?.rating !== null && gbpData?.rating !== undefined
          ? String(gbpData.rating)
          : "",
      totalReviews:
        gbpData?.total_reviews !== null && gbpData?.total_reviews !== undefined
          ? String(gbpData.total_reviews)
          : "",
      photosCount:
        gbpData?.photos_count !== null && gbpData?.photos_count !== undefined
          ? String(gbpData.photos_count)
          : "",
    },
  };
}