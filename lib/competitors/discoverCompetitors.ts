import { supabaseServer } from "../supabase/server";
import {
  dataForSeoMapsLiveAdvanced,
  type DataForSeoMapsLiveAdvancedResult,
} from "../providers/dataforseo/maps";
import { normalizeDataForSeoMapsItems } from "./normalize";
import { upsertCompetitorsIntoGbpCompetitorMetrics } from "./persist";
import type { DiscoverCompetitorsResult } from "./types";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

type ProjectSettingsRow = {
  primary_category: string | null;
  category?: string | null;
  target_metro: string | null;
  metro?: string | null;
  maps_location_code: number | null;
};

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function toJsonObject(value: unknown): JsonObject | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (!Object.values(record).every(isJsonValue)) {
    return undefined;
  }

  return record as JsonObject;
}

export async function discoverMapsCompetitorsForProject(args: {
  projectId: string;
  includeRawProvider?: boolean;
}): Promise<DiscoverCompetitorsResult> {
  const supabase = supabaseServer();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "primary_category, category, target_metro, metro, maps_location_code"
    )
    .eq("id", args.projectId)
    .single();

  if (error) {
    throw new Error(`Failed to load project settings: ${error.message}`);
  }

  const typedProject = project as ProjectSettingsRow;

  const category = String(
    typedProject.primary_category ?? typedProject.category ?? ""
  ).trim();

  const metro = String(
    typedProject.target_metro ?? typedProject.metro ?? ""
  ).trim();

  if (!category) {
    throw new Error(
      "Project is missing primary_category/category (example: 'landscaper')"
    );
  }

  if (!metro) {
    throw new Error(
      'Project is missing target_metro/metro (example: "Council Bluffs, IA")'
    );
  }

  const keyword = `${category} ${metro}`.trim();
  const nowIso = new Date().toISOString();

  const existingLocationCode =
    typeof typedProject.maps_location_code === "number" &&
    Number.isFinite(typedProject.maps_location_code)
      ? typedProject.maps_location_code
      : null;

  const live: DataForSeoMapsLiveAdvancedResult =
    await dataForSeoMapsLiveAdvanced({
      keyword,
      locationName: metro,
      depth: 20,
      device: "desktop",
      locationCode: existingLocationCode ?? undefined,
    });

  if (!existingLocationCode && typeof live.locationCode === "number") {
    const resolvedLocationCode = live.locationCode;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ maps_location_code: resolvedLocationCode })
      .eq("id", args.projectId);

    if (updateError) {
      console.warn(
        "[discoverMapsCompetitorsForProject] Could not save maps_location_code:",
        updateError.message
      );
    }
  }

  const candidates = normalizeDataForSeoMapsItems({
    projectId: args.projectId,
    items: live.items,
    nowIso,
    includeRaw: args.includeRawProvider ?? false,
    raw: args.includeRawProvider ? toJsonObject(live.raw) : undefined,
  });

  const upserted = await upsertCompetitorsIntoGbpCompetitorMetrics(candidates);

  return {
    found: candidates.length,
    upserted,
    costUsd: live.cost,
    providerCheckUrl: live.checkUrl,
  };
}