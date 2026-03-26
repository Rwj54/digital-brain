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

type RawCompetitorRow = Omit<
  CompetitorMetric,
  "number_of_keywords_found" | "top_keywords"
>;

type RawRankMarketResultRow = {
  keyword: string | null;
  position: number | null;
  result_domain: string | null;
  result_place_id: string | null;
  captured_at: string;
};

export async function requireDashboardAuth() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

function getFirstRow<T>(rows: T[] | null | undefined): T | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0];
}

function normalizeDomain(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`
    );

    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    const cleaned = trimmed
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();

    return cleaned || null;
  }
}

function addKeywordCoverageToCompetitors(
  competitors: RawCompetitorRow[],
  marketRows: RawRankMarketResultRow[]
): CompetitorMetric[] {
  return competitors.map((competitor) => {
    const competitorDomain = normalizeDomain(competitor.competitor_domain);
    const competitorPlaceId =
      typeof competitor.place_id === "string" && competitor.place_id.trim()
        ? competitor.place_id.trim()
        : null;

    const keywordBestPosition = new Map<string, number>();

    for (const row of marketRows) {
      const keyword =
        typeof row.keyword === "string" ? row.keyword.trim() : "";

      if (!keyword) {
        continue;
      }

      const rowDomain = normalizeDomain(row.result_domain);
      const rowPlaceId =
        typeof row.result_place_id === "string" && row.result_place_id.trim()
          ? row.result_place_id.trim()
          : null;

      const domainMatches =
        competitorDomain !== null &&
        rowDomain !== null &&
        competitorDomain === rowDomain;

      const placeIdMatches =
        competitorPlaceId !== null &&
        rowPlaceId !== null &&
        competitorPlaceId === rowPlaceId;

      if (!domainMatches && !placeIdMatches) {
        continue;
      }

      const position =
        typeof row.position === "number" && Number.isFinite(row.position)
          ? row.position
          : Number.MAX_SAFE_INTEGER;

      const existing = keywordBestPosition.get(keyword);

      if (existing === undefined || position < existing) {
        keywordBestPosition.set(keyword, position);
      }
    }

    const orderedKeywords = Array.from(keywordBestPosition.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) {
          return a[1] - b[1];
        }

        return a[0].localeCompare(b[0]);
      })
      .map(([keyword]) => keyword);

    return {
      ...competitor,
      number_of_keywords_found: orderedKeywords.length,
      top_keywords: orderedKeywords.slice(0, 3),
    };
  });
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

  const client = getFirstRow<RawClientRow>(
    clientRows as RawClientRow[] | null | undefined
  );

  if (!client) {
    return { ok: false, error: "Client not found." };
  }

  const { data: projectRows, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .limit(1);

  if (projectError) {
    return { ok: false, error: projectError.message };
  }

  const project = getFirstRow<RawProjectRow>(
    projectRows as RawProjectRow[] | null | undefined
  );

  if (!project) {
    return { ok: false, error: "Project not found for this client." };
  }

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

  const gbp = getFirstRow<RawGbpRow>(
    gbpRows as RawGbpRow[] | null | undefined
  );

  const { data: competitorData, error: competitorError } = await supabase
    .from("gbp_competitor_metrics")
    .select("*")
    .eq("project_id", projectId)
    .order("total_reviews", { ascending: false });

  if (competitorError) {
    return { ok: false, error: competitorError.message };
  }

  const rawCompetitors = (competitorData ?? []) as RawCompetitorRow[];

  let competitors: CompetitorMetric[] = rawCompetitors.map((competitor) => ({
    ...competitor,
    number_of_keywords_found: 0,
    top_keywords: [],
  }));

  const { data: latestMarketRows, error: latestMarketError } = await supabase
    .from("gbp_rank_market_results")
    .select("captured_at")
    .eq("project_id", projectId)
    .order("captured_at", { ascending: false })
    .limit(1);

  if (latestMarketError) {
    return { ok: false, error: latestMarketError.message };
  }

  const latestCapturedAt =
    latestMarketRows &&
    latestMarketRows[0] &&
    typeof latestMarketRows[0].captured_at === "string"
      ? latestMarketRows[0].captured_at
      : null;

  if (latestCapturedAt) {
    const { data: marketRows, error: marketError } = await supabase
      .from("gbp_rank_market_results")
      .select("keyword, position, result_domain, result_place_id, captured_at")
      .eq("project_id", projectId)
      .eq("captured_at", latestCapturedAt);

    if (marketError) {
      return { ok: false, error: marketError.message };
    }

    competitors = addKeywordCoverageToCompetitors(
      rawCompetitors,
      (marketRows ?? []) as RawRankMarketResultRow[]
    );
  }

  return {
    ok: true,
    client,
    project,
    gbp,
    competitors,
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
      compDomain: "",
      compName: "",
      compSource: "manual",
      compRating: "",
      compReviews: "",
    },
  };
}