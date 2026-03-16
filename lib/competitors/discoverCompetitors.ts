import { supabaseServer } from "../supabase/server";
import { dataForSeoMapsLiveAdvanced } from "../providers/dataforseo/maps";
import { normalizeDataForSeoMapsItems } from "./normalize";
import { upsertCompetitorsIntoGbpCompetitorMetrics } from "./persist";
import type { DiscoverCompetitorsResult } from "./types";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

type ProjectSettingsRow = {
  id: string;
  site_url: string | null;
  primary_category: string | null;
  target_metro: string | null;
  maps_location_code: number | null;
  target_domain: string | null;
};

type GbpProfileRow = {
  place_id: string | null;
};

type MapsLiveAdvancedItem = {
  title?: string;
  domain?: string | null;
  place_id?: string;
  rating?: { value?: number; votes_count?: number } | null;
};

type MapsLiveAdvancedResult = {
  items: MapsLiveAdvancedItem[];
  cost: number;
  checkUrl: string | null;
  raw?: JsonObject;
  locationCode?: number;
};

function normalizeDomain(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0]?.trim() ?? "";
  const withoutWww = withoutPath.replace(/^www\./, "");

  return withoutWww || null;
}

function extractDomainFromSiteUrl(siteUrl: string | null | undefined): string | null {
  if (typeof siteUrl !== "string") {
    return null;
  }

  const trimmed = siteUrl.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    return normalizeDomain(new URL(withProtocol).hostname);
  } catch {
    return normalizeDomain(trimmed);
  }
}

export async function discoverMapsCompetitorsForProject(args: {
  projectId: string;
  includeRawProvider?: boolean;
}): Promise<DiscoverCompetitorsResult> {
  const supabase = supabaseServer();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, site_url, primary_category, target_metro, maps_location_code, target_domain"
    )
    .eq("id", args.projectId)
    .single();

  if (error) {
    throw new Error(`Failed to load project settings: ${error.message}`);
  }

  const typedProject = project as ProjectSettingsRow;
  const category = String(typedProject.primary_category ?? "").trim();
  const metro = String(typedProject.target_metro ?? "").trim();

  if (!category) {
    throw new Error(
      "Project is missing primary_category (example: 'landscaper')"
    );
  }

  if (!metro) {
    throw new Error(
      'Project is missing target_metro (example: "Council Bluffs, IA")'
    );
  }

  const { data: gbpProfileData, error: gbpProfileError } = await supabase
    .from("gbp_profiles")
    .select("place_id")
    .eq("project_id", args.projectId)
    .order("last_fetched_at", { ascending: false })
    .limit(1);

  if (gbpProfileError) {
    throw new Error(`Failed to load project GBP profile: ${gbpProfileError.message}`);
  }

  const gbpProfile = ((gbpProfileData ?? [])[0] ?? null) as GbpProfileRow | null;

  const targetPlaceId =
    typeof gbpProfile?.place_id === "string" && gbpProfile.place_id.trim()
      ? gbpProfile.place_id.trim()
      : null;

  const targetDomain =
    normalizeDomain(typedProject.target_domain) ??
    extractDomainFromSiteUrl(typedProject.site_url);

  const keyword = `${category} ${metro}`.trim();
  const nowIso = new Date().toISOString();

  const existingLocationCode =
    typeof typedProject.maps_location_code === "number"
      ? typedProject.maps_location_code
      : null;

  const live = (await dataForSeoMapsLiveAdvanced({
    keyword,
    locationName: metro,
    depth: 20,
    device: "desktop",
    locationCode: existingLocationCode ?? undefined,
  })) as MapsLiveAdvancedResult;

  if (!existingLocationCode && typeof live.locationCode === "number") {
    const resolved = live.locationCode;

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ maps_location_code: resolved })
      .eq("id", args.projectId);

    if (updateErr) {
      console.warn(
        "[discoverMapsCompetitorsForProject] Could not save maps_location_code:",
        updateErr.message
      );
    }
  }

  const filteredItems = live.items.filter((item) => {
    const itemPlaceId =
      typeof item.place_id === "string" ? item.place_id.trim() : "";
    const itemDomain = normalizeDomain(item.domain);

    if (targetPlaceId && itemPlaceId && itemPlaceId === targetPlaceId) {
      return false;
    }

    if (targetDomain && itemDomain && itemDomain === targetDomain) {
      return false;
    }

    return true;
  });

  const candidates = normalizeDataForSeoMapsItems({
    projectId: args.projectId,
    items: filteredItems,
    nowIso,
    includeRaw: args.includeRawProvider ?? false,
    raw: args.includeRawProvider ? live.raw : undefined,
  });

  const upserted = await upsertCompetitorsIntoGbpCompetitorMetrics(candidates);

  return {
    found: candidates.length,
    upserted,
    costUsd: live.cost,
    providerCheckUrl: live.checkUrl,
  };
}
