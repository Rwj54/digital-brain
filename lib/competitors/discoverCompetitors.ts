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
  url?: string | null;
  category?: string | null;
  additional_categories?: unknown;
  rating?: { value?: number; votes_count?: number } | null;
  photos_count?: number | null;
  posts_30d?: number | null;
  qa_count?: number | null;
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

function extractDomainFromSiteUrl(
  siteUrl: string | null | undefined
): string | null {
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

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

function normalizeNumeric(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function extractAdditionalCategories(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const out = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const title =
          typeof record.title === "string"
            ? record.title.trim()
            : typeof record.name === "string"
              ? record.name.trim()
              : "";

        return title;
      }

      return "";
    })
    .filter((item) => item.length > 0);

  return out.length > 0 ? out : null;
}

function matchesTargetBusiness(args: {
  item: MapsLiveAdvancedItem;
  targetPlaceId: string | null;
  targetDomain: string | null;
}): boolean {
  const itemPlaceId =
    typeof args.item.place_id === "string" ? args.item.place_id.trim() : "";
  const itemDomain =
    normalizeDomain(args.item.domain) ?? normalizeDomain(args.item.url);

  if (args.targetPlaceId && itemPlaceId && args.targetPlaceId === itemPlaceId) {
    return true;
  }

  if (args.targetDomain && itemDomain && args.targetDomain === itemDomain) {
    return true;
  }

  return false;
}

async function upsertTargetBusinessProfile(args: {
  projectId: string;
  item: MapsLiveAdvancedItem;
  fetchedAtIso: string;
}): Promise<void> {
  const supabase = supabaseServer();

  const placeId =
    typeof args.item.place_id === "string" ? args.item.place_id.trim() : null;
  const gbpName =
    typeof args.item.title === "string" ? args.item.title.trim() : null;
  const gbpUrl =
    typeof args.item.url === "string" && args.item.url.trim()
      ? args.item.url.trim()
      : null;
  const primaryCategory =
    typeof args.item.category === "string" && args.item.category.trim()
      ? args.item.category.trim()
      : null;

  const additionalCategories = extractAdditionalCategories(
    args.item.additional_categories
  );

  const rating = normalizeNumeric(args.item.rating?.value);
  const totalReviews = normalizePositiveInteger(args.item.rating?.votes_count);
  const photosCount = normalizePositiveInteger(args.item.photos_count);
  const posts30d = normalizePositiveInteger(args.item.posts_30d);
  const qaCount = normalizePositiveInteger(args.item.qa_count);

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("gbp_profiles")
    .select("photos_count, posts_30d, qa_count")
    .eq("project_id", args.projectId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(
      `Failed to load existing gbp_profiles row: ${existingProfileError.message}`
    );
  }

  const preservedPhotosCount =
    photosCount ?? normalizePositiveInteger(existingProfile?.photos_count ?? null);
  const preservedPosts30d =
    posts30d ?? normalizePositiveInteger(existingProfile?.posts_30d ?? null);
  const preservedQaCount =
    qaCount ?? normalizePositiveInteger(existingProfile?.qa_count ?? null);

  const { error } = await supabase.from("gbp_profiles").upsert(
    [
      {
        project_id: args.projectId,
        place_id: placeId,
        gbp_name: gbpName,
        gbp_url: gbpUrl,
        primary_category: primaryCategory,
        additional_categories: additionalCategories,
        rating,
        total_reviews: totalReviews,
        photos_count: preservedPhotosCount,
        posts_30d: preservedPosts30d,
        qa_count: preservedQaCount,
        last_fetched_at: args.fetchedAtIso,
      },
    ],
    { onConflict: "project_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert gbp_profiles row: ${error.message}`);
  }
}

async function cleanupSelfCompetitorRows(args: {
  projectId: string;
  targetDomain: string | null;
  targetPlaceId: string | null;
}): Promise<void> {
  const supabase = supabaseServer();

  if (!args.targetDomain && !args.targetPlaceId) {
    return;
  }

  if (args.targetDomain) {
    const { error: metricsDomainError } = await supabase
      .from("gbp_competitor_metrics")
      .delete()
      .eq("project_id", args.projectId)
      .or(
        `competitor_domain.eq.${args.targetDomain},domain.eq.${args.targetDomain}`
      );

    if (metricsDomainError) {
      throw new Error(
        `Failed to remove self competitor metric rows by domain: ${metricsDomainError.message}`
      );
    }

    const { error: snapshotDomainError } = await supabase
      .from("gbp_competitor_snapshots")
      .delete()
      .eq("project_id", args.projectId)
      .eq("competitor_domain", args.targetDomain);

    if (snapshotDomainError) {
      throw new Error(
        `Failed to remove self competitor snapshot rows by domain: ${snapshotDomainError.message}`
      );
    }
  }

  if (args.targetPlaceId) {
    const { error: metricsPlaceError } = await supabase
      .from("gbp_competitor_metrics")
      .delete()
      .eq("project_id", args.projectId)
      .eq("place_id", args.targetPlaceId);

    if (metricsPlaceError) {
      throw new Error(
        `Failed to remove self competitor metric rows by place_id: ${metricsPlaceError.message}`
      );
    }

    const { error: snapshotPlaceError } = await supabase
      .from("gbp_competitor_snapshots")
      .delete()
      .eq("project_id", args.projectId)
      .eq("place_id", args.targetPlaceId);

    if (snapshotPlaceError) {
      throw new Error(
        `Failed to remove self competitor snapshot rows by place_id: ${snapshotPlaceError.message}`
      );
    }
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
    throw new Error(
      `Failed to load project GBP profile: ${gbpProfileError.message}`
    );
  }

  const gbpProfile = ((gbpProfileData ?? [])[0] ?? null) as
    | GbpProfileRow
    | null;

  const existingTargetPlaceId =
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

  const targetItem =
    live.items.find((item) =>
      matchesTargetBusiness({
        item,
        targetPlaceId: existingTargetPlaceId,
        targetDomain,
      })
    ) ?? null;

  if (targetItem) {
    await upsertTargetBusinessProfile({
      projectId: args.projectId,
      item: targetItem,
      fetchedAtIso: nowIso,
    });
  }

  const effectiveTargetPlaceId =
    typeof targetItem?.place_id === "string" && targetItem.place_id.trim()
      ? targetItem.place_id.trim()
      : existingTargetPlaceId;

  await cleanupSelfCompetitorRows({
    projectId: args.projectId,
    targetDomain,
    targetPlaceId: effectiveTargetPlaceId,
  });

  const filteredItems = live.items.filter((item) => {
    const itemPlaceId =
      typeof item.place_id === "string" ? item.place_id.trim() : "";
    const itemDomain = normalizeDomain(item.domain) ?? normalizeDomain(item.url);

    if (
      effectiveTargetPlaceId &&
      itemPlaceId &&
      itemPlaceId === effectiveTargetPlaceId
    ) {
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
