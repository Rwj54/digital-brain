import { supabaseServer } from "../supabase/server";
import { dataForSeoMapsLiveAdvanced } from "../providers/dataforseo/maps";
import { normalizeDataForSeoMapsItems } from "./normalize";
import { upsertCompetitorsIntoGbpCompetitorMetrics } from "./persist";
import type { DiscoverCompetitorsResult } from "./types";

export async function discoverMapsCompetitorsForProject(args: {
  projectId: string;
  includeRawProvider?: boolean;
}): Promise<DiscoverCompetitorsResult> {
  const supabase = supabaseServer();

  // Use select("*") to avoid any weirdness with partial selects / column changes
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", args.projectId)
    .single();

  if (error) throw new Error(`Failed to load project settings: ${error.message}`);

  // DIAGNOSTIC: log what we actually loaded (server console)
  console.log("[discoverMapsCompetitorsForProject] loaded project settings:", {
    id: project?.id,
    primary_category: project?.primary_category,
    target_metro: project?.target_metro,
    target_radius_miles: project?.target_radius_miles,
  });

  const category = String(project?.primary_category ?? "").trim();
  const metro = String(project?.target_metro ?? "").trim();

  if (!category) {
    throw new Error(
      `Project is missing primary_category. Loaded primary_category=${JSON.stringify(
        project?.primary_category
      )} for projectId=${args.projectId}`
    );
  }

  if (!metro) {
    throw new Error(
      `Project is missing target_metro. Loaded target_metro=${JSON.stringify(
        project?.target_metro
      )} for projectId=${args.projectId}`
    );
  }

  const keyword = `${category} ${metro}`.trim();
  const locationName = metro;

  const nowIso = new Date().toISOString();

  const live = await dataForSeoMapsLiveAdvanced({
    keyword,
    locationName,
    depth: 20,
    device: "desktop",
  });

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