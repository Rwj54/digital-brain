import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveDataForSeoUsLocationCode } from "@/lib/providers/dataforseo/maps";

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

export async function persistProjectOnboardingIdentityFields(params: {
  projectId: string;
  currentTargetDomain: string | null;
  currentTargetBrandName: string | null;
  canonicalDomain: string | null;
  resolvedBusinessName: string | null;
}): Promise<{
  targetDomainPersisted: boolean;
  targetBrandNamePersisted: boolean;
}> {
  const currentTargetDomain = normalizeString(params.currentTargetDomain).toLowerCase();
  const currentTargetBrandName = normalizeString(params.currentTargetBrandName);
  const canonicalDomain = normalizeString(params.canonicalDomain).toLowerCase();
  const resolvedBusinessName = normalizeString(params.resolvedBusinessName);

  const updates: {
    target_domain?: string;
    target_brand_name?: string;
  } = {};

  if (!currentTargetDomain && canonicalDomain) {
    updates.target_domain = canonicalDomain;
  }

  if (!currentTargetBrandName && resolvedBusinessName) {
    updates.target_brand_name = resolvedBusinessName;
  }

  if (!updates.target_domain && !updates.target_brand_name) {
    return {
      targetDomainPersisted: false,
      targetBrandNamePersisted: false,
    };
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", params.projectId);

  if (error) {
    throw new Error(`Failed to persist identity fields: ${error.message}`);
  }

  return {
    targetDomainPersisted: Boolean(updates.target_domain),
    targetBrandNamePersisted: Boolean(updates.target_brand_name),
  };
}

export async function persistProjectOnboardingAutomationFields(params: {
  projectId: string;
  currentPrimaryCategory: string | null;
  currentTargetMetro: string | null;
  currentTargetRadiusMiles: number | null;
  currentMapsLocationCode: number | null;
  canonicalCategory: string | null;
  canonicalMetro: string | null;
  canonicalRadiusMiles: number | null;
}): Promise<{
  primaryCategoryPersisted: boolean;
  targetMetroPersisted: boolean;
  targetRadiusMilesPersisted: boolean;
  mapsLocationCodePersisted: boolean;
  resolvedMapsLocationCode: number | null;
}> {
  const currentPrimaryCategory = normalizeString(params.currentPrimaryCategory);
  const currentTargetMetro = normalizeString(params.currentTargetMetro);
  const currentTargetRadiusMiles = normalizePositiveInteger(
    params.currentTargetRadiusMiles
  );
  const currentMapsLocationCode = normalizePositiveInteger(params.currentMapsLocationCode);

  const canonicalCategory = normalizeString(params.canonicalCategory);
  const canonicalMetro = normalizeString(params.canonicalMetro);
  const canonicalRadiusMiles = normalizePositiveInteger(params.canonicalRadiusMiles);

  let resolvedMapsLocationCode: number | null = currentMapsLocationCode;

  if (!resolvedMapsLocationCode && canonicalMetro) {
    resolvedMapsLocationCode = await resolveDataForSeoUsLocationCode({
      metroCityState: canonicalMetro,
    });
  }

  const updates: {
    primary_category?: string;
    target_metro?: string;
    target_radius_miles?: number;
    maps_location_code?: number;
  } = {};

  if (!currentPrimaryCategory && canonicalCategory) {
    updates.primary_category = canonicalCategory;
  }

  if (canonicalMetro && currentTargetMetro !== canonicalMetro) {
    updates.target_metro = canonicalMetro;
  }

  if (
    canonicalRadiusMiles !== null &&
    currentTargetRadiusMiles !== canonicalRadiusMiles
  ) {
    updates.target_radius_miles = canonicalRadiusMiles;
  }

  if (
    resolvedMapsLocationCode !== null &&
    currentMapsLocationCode !== resolvedMapsLocationCode
  ) {
    updates.maps_location_code = resolvedMapsLocationCode;
  }

  if (
    !updates.primary_category &&
    !updates.target_metro &&
    typeof updates.target_radius_miles !== "number" &&
    typeof updates.maps_location_code !== "number"
  ) {
    return {
      primaryCategoryPersisted: false,
      targetMetroPersisted: false,
      targetRadiusMilesPersisted: false,
      mapsLocationCodePersisted: false,
      resolvedMapsLocationCode,
    };
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", params.projectId);

  if (error) {
    throw new Error(
      `Failed to persist canonical automation fields: ${error.message}`
    );
  }

  return {
    primaryCategoryPersisted: Boolean(updates.primary_category),
    targetMetroPersisted: Boolean(updates.target_metro),
    targetRadiusMilesPersisted:
      typeof updates.target_radius_miles === "number",
    mapsLocationCodePersisted:
      typeof updates.maps_location_code === "number",
    resolvedMapsLocationCode,
  };
}