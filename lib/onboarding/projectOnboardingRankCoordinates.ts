import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveBusinessCoordinatesFromDataForSeo } from "@/lib/providers/dataforseo/maps";

function normalizeString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function normalizeFiniteCoordinate(
  value: number | null | undefined
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function persistProjectOnboardingRankCoordinates(params: {
  projectId: string;
  currentRankLat: number | null;
  currentRankLng: number | null;
  resolvedBusinessName: string | null;
  canonicalDomain: string | null;
  mapsLocationCode: number | null;
}): Promise<{
  rankCoordinatesPersisted: boolean;
  rankLatPersisted: boolean;
  rankLngPersisted: boolean;
  resolvedRankLat: number | null;
  resolvedRankLng: number | null;
  matchedBy: "domain" | "title" | "first_item" | null;
  matchedTitle: string | null;
  matchedDomain: string | null;
  skippedReason: string | null;
}> {
  const currentRankLat = normalizeFiniteCoordinate(params.currentRankLat);
  const currentRankLng = normalizeFiniteCoordinate(params.currentRankLng);
  const resolvedBusinessName = normalizeString(params.resolvedBusinessName);
  const canonicalDomain = normalizeString(params.canonicalDomain).toLowerCase();
  const mapsLocationCode = normalizePositiveInteger(params.mapsLocationCode);

  if (currentRankLat !== null && currentRankLng !== null) {
    return {
      rankCoordinatesPersisted: false,
      rankLatPersisted: false,
      rankLngPersisted: false,
      resolvedRankLat: currentRankLat,
      resolvedRankLng: currentRankLng,
      matchedBy: null,
      matchedTitle: null,
      matchedDomain: null,
      skippedReason: "Rank coordinates already exist on the project.",
    };
  }

  if (!resolvedBusinessName) {
    return {
      rankCoordinatesPersisted: false,
      rankLatPersisted: false,
      rankLngPersisted: false,
      resolvedRankLat: currentRankLat,
      resolvedRankLng: currentRankLng,
      matchedBy: null,
      matchedTitle: null,
      matchedDomain: null,
      skippedReason:
        "Resolved business name is missing, so rank coordinate automation was skipped.",
    };
  }

  if (mapsLocationCode === null) {
    return {
      rankCoordinatesPersisted: false,
      rankLatPersisted: false,
      rankLngPersisted: false,
      resolvedRankLat: currentRankLat,
      resolvedRankLng: currentRankLng,
      matchedBy: null,
      matchedTitle: null,
      matchedDomain: null,
      skippedReason:
        "maps_location_code is missing, so rank coordinate automation was skipped.",
    };
  }

  const resolved = await resolveBusinessCoordinatesFromDataForSeo({
    businessName: resolvedBusinessName,
    locationCode: mapsLocationCode,
    targetDomain: canonicalDomain || null,
  });

  const resolvedRankLat = normalizeFiniteCoordinate(resolved.latitude);
  const resolvedRankLng = normalizeFiniteCoordinate(resolved.longitude);

  if (resolvedRankLat === null || resolvedRankLng === null) {
    throw new Error(
      "Resolved business coordinates were invalid after DataForSEO coordinate lookup."
    );
  }

  const updates: {
    rank_lat?: number;
    rank_lng?: number;
  } = {};

  if (currentRankLat !== resolvedRankLat) {
    updates.rank_lat = resolvedRankLat;
  }

  if (currentRankLng !== resolvedRankLng) {
    updates.rank_lng = resolvedRankLng;
  }

  if (
    typeof updates.rank_lat !== "number" &&
    typeof updates.rank_lng !== "number"
  ) {
    return {
      rankCoordinatesPersisted: false,
      rankLatPersisted: false,
      rankLngPersisted: false,
      resolvedRankLat,
      resolvedRankLng,
      matchedBy: resolved.matchedBy,
      matchedTitle: resolved.matchedTitle,
      matchedDomain: resolved.matchedDomain,
      skippedReason: null,
    };
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", params.projectId);

  if (error) {
    throw new Error(`Failed to persist rank coordinates: ${error.message}`);
  }

  return {
    rankCoordinatesPersisted: true,
    rankLatPersisted: typeof updates.rank_lat === "number",
    rankLngPersisted: typeof updates.rank_lng === "number",
    resolvedRankLat,
    resolvedRankLng,
    matchedBy: resolved.matchedBy,
    matchedTitle: resolved.matchedTitle,
    matchedDomain: resolved.matchedDomain,
    skippedReason: null,
  };
}