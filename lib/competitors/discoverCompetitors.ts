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

  // Load full project row (keeps this resilient to schema changes)
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", args.projectId)
    .single();

  if (error) throw new Error(`Failed to load project settings: ${error.message}`);

  const category = String(project?.primary_category ?? "").trim();
  const metro = String(project?.target_metro ?? "").trim();

  if (!category) throw new Error("Project is missing primary_category (example: 'landscaper')");
  if (!metro) throw new Error('Project is missing target_metro (example: "Council Bluffs, IA")');

  const keyword = `${category} ${metro}`.trim();

  const nowIso = new Date().toISOString();

  // IMPORTANT: If maps_location_code exists, use it and avoid the Locations API call.
  // If missing, the provider will resolve and cache internally, and we’ll persist it below.
  const existingLocationCode =
    typeof project?.maps_location_code === "number" ? project.maps_location_code : null;

  const live = await dataForSeoMapsLiveAdvanced({
    keyword,
    locationName: metro,
    depth: 20,
    device: "desktop",
    // new optional param supported by provider (we’ll add next step if missing)
    locationCode: existingLocationCode ?? undefined,
  } as any);

  // Persist resolved location code once (if we didn’t have it before)
  if (!existingLocationCode && typeof (live as any)?.locationCode === "number") {
    const resolved = (live as any).locationCode as number;

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ maps_location_code: resolved })
      .eq("id", args.projectId);

    if (updateErr) {
      // Non-fatal: discovery succeeded; we just couldn’t save the code
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