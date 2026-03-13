import { supabaseServer } from "../supabase/server";
import { dataForSeoMapsLiveAdvanced } from "../providers/dataforseo/maps";
import { normalizeDataForSeoMapsItems } from "./normalize";
import { upsertCompetitorsIntoGbpCompetitorMetrics } from "./persist";
import type { DiscoverCompetitorsResult } from "./types";

type ProjectSettingsRow = {
  primary_category: string | null;
  target_metro: string | null;
  maps_location_code: number | null;
};

type MapsLiveAdvancedResult = {
  items: Array<{
    title?: string;
    domain?: string | null;
    place_id?: string;
    rating?: { value?: number; votes_count?: number } | null;
  }>;
  cost: number;
  checkUrl: string | null;
  raw?: Record<string, unknown>;
  locationCode?: number;
};

export async function discoverMapsCompetitorsForProject(args: {
  projectId: string;
  includeRawProvider?: boolean;
}): Promise<DiscoverCompetitorsResult> {
  const supabase = supabaseServer();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
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

  const candidates = normalizeDataForSeoMapsItems({
    projectId: args.projectId,
    items: live.items,
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