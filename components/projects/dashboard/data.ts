import type {
  Client,
  CompetitorMetric,
  GbpProfile,
  Project,
  VolumePresetOption,
} from "@/components/projects/dashboard/types";
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
  formState: {
    volumePreset: string;
    showAdvancedLabels: boolean;
    eventLabelSingular: string;
    eventLabelPlural: string;
    monthlyEvents: string;
    reviewConvRate: string;
    gbpName: string;
    placeId: string;
    gbpUrl: string;
    primaryCategory: string;
    rating: string;
    totalReviews: string;
    photosCount: string;
  };
};

type DashboardLoadFailure = {
  ok: false;
  error: string;
};

export type DashboardLoadResult = DashboardLoadSuccess | DashboardLoadFailure;

function safeNum(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const value = Number(n);
  return Number.isFinite(value) ? value : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

export async function saveProjectReviewCapacityData(args: {
  clientId: string;
  projectId: string;
  monthlyEvents: string;
  reviewConvRate: string;
  volumePreset: string;
  eventLabelSingular: string;
  eventLabelPlural: string;
  preset: VolumePresetOption;
}) {
  const monthly =
    args.monthlyEvents.trim() === "" ? null : safeNum(args.monthlyEvents);
  const conversion =
    args.reviewConvRate.trim() === "" ? null : safeNum(args.reviewConvRate);
  const clampedConversion =
    conversion === null ? null : clamp(conversion, 0, 100);

  const finalSingular =
    args.volumePreset === "custom"
      ? args.eventLabelSingular.trim() || "Event"
      : args.preset.singular;

  const finalPlural =
    args.volumePreset === "custom"
      ? args.eventLabelPlural.trim() || "Events"
      : args.preset.plural;

  return supabase
    .from("projects")
    .update({
      event_label_singular: finalSingular,
      event_label_plural: finalPlural,
      monthly_customer_events:
        monthly === null ? null : Math.max(0, Math.floor(monthly)),
      review_conversion_rate: clampedConversion,
    })
    .eq("id", args.projectId)
    .eq("client_id", args.clientId);
}

export async function saveGbpProfileData(args: {
  projectId: string;
  gbpName: string;
  placeId: string;
  gbpUrl: string;
  primaryCategory: string;
  rating: string;
  totalReviews: string;
  photosCount: string;
}) {
  const ratingNum = args.rating.trim() === "" ? null : safeNum(args.rating);
  const reviewsNum =
    args.totalReviews.trim() === "" ? null : safeNum(args.totalReviews);
  const photosNum =
    args.photosCount.trim() === "" ? null : safeNum(args.photosCount);

  return supabase.from("gbp_profiles").upsert(
    {
      project_id: args.projectId,
      gbp_name: args.gbpName.trim() || null,
      place_id: args.placeId.trim() || null,
      gbp_url: args.gbpUrl.trim() || null,
      primary_category: args.primaryCategory.trim() || null,
      rating: ratingNum,
      total_reviews: reviewsNum,
      photos_count: photosNum,
      last_fetched_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
}

export async function saveCompetitorData(args: {
  projectId: string;
  compDomain: string;
  compName: string;
  compSource: string;
  compRating: string;
  compReviews: string;
}) {
  const raw = args.compDomain.trim().toLowerCase();
  let normalizedDomain = raw;

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      normalizedDomain = new URL(raw).hostname;
    }
  } catch {
    // ignore malformed URLs
  }

  normalizedDomain = normalizedDomain.replace(/^www\./, "").replace(/\/+$/, "");

  if (!normalizedDomain) {
    return {
      error: { message: "Competitor domain is required." },
    };
  }

  const ratingValue =
    args.compRating.trim() === "" ? null : safeNum(args.compRating);
  const reviewsValue =
    args.compReviews.trim() === "" ? null : safeNum(args.compReviews);

  return supabase.from("gbp_competitor_metrics").upsert(
    {
      project_id: args.projectId,
      competitor_domain: normalizedDomain,
      competitor_name: args.compName.trim() || null,
      source: args.compSource,
      rating: ratingValue,
      total_reviews: reviewsValue,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "project_id,competitor_domain" }
  );
}

export async function deleteCompetitorData(id: string) {
  return supabase.from("gbp_competitor_metrics").delete().eq("id", id);
}