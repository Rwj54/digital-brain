import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveBusinessProfileFromDataForSeo } from "@/lib/providers/dataforseo/maps";

type RankCandidate = {
  rankPosition: number;
  title: string | null;
  dataId: string | null;
  category: string | null;
  address: string | null;
  rating: number | null;
  reviewsCount: number | null;
  latitude: number | null;
  longitude: number | null;
  rawResult: unknown;
};

type RawRankResult = {
  place_id?: string | null;
  cid?: string | null;
  data_id?: string | null;
  url?: string | null;
  domain?: string | null;
  title?: string | null;
  name?: string | null;
  category?: string | null;
  phone?: string | null;
  work_hours?: unknown;
  description?: string | null;
  additional_categories?: unknown;
  category_ids?: unknown;
  rating?:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

function normalizeFiniteCoordinate(
  value: number | null | undefined
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizePositiveInteger(
  value: number | null | undefined
): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function normalizeString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDomain(value: string | null | undefined): string {
  const trimmed = normalizeString(value).toLowerCase();

  if (!trimmed) {
    return "";
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const firstSegment = withoutProtocol.split("/")[0] ?? "";
  return firstSegment.replace(/^www\./, "");
}

function normalizeBusinessName(value: string | null | undefined): string {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (isJsonPrimitive(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const out: JsonValue[] = [];

    for (const item of value) {
      const converted = toJsonValue(item);

      if (converted !== undefined) {
        out.push(converted);
      }
    }

    return out;
  }

  if (value && typeof value === "object") {
    const out: JsonObject = {};

    for (const [key, item] of Object.entries(value)) {
      const converted = toJsonValue(item);

      if (converted !== undefined) {
        out[key] = converted;
      }
    }

    return out;
  }

  return undefined;
}

function asJsonObject(value: unknown): JsonObject | null {
  const converted = toJsonValue(value);

  if (converted && typeof converted === "object" && !Array.isArray(converted)) {
    return converted as JsonObject;
  }

  return null;
}

function getRawRankResult(candidate: RankCandidate): RawRankResult {
  if (!candidate.rawResult || typeof candidate.rawResult !== "object") {
    return {};
  }

  return candidate.rawResult as RawRankResult;
}

function getCandidateDomain(candidate: RankCandidate): string {
  const raw = getRawRankResult(candidate);

  return normalizeDomain(
    typeof raw.domain === "string" && raw.domain.trim()
      ? raw.domain
      : typeof raw.url === "string"
        ? raw.url
        : null
  );
}

function getCandidatePlaceId(candidate: RankCandidate): string | null {
  const raw = getRawRankResult(candidate);

  return (
    normalizeString(raw.place_id) ||
    normalizeString(raw.cid) ||
    normalizeString(raw.data_id) ||
    null
  );
}

function getCandidateTitle(candidate: RankCandidate): string | null {
  const raw = getRawRankResult(candidate);

  return (
    normalizeString(raw.title) ||
    normalizeString(raw.name) ||
    normalizeString(candidate.title) ||
    null
  );
}

function getCandidateUrl(candidate: RankCandidate): string | null {
  const raw = getRawRankResult(candidate);
  const url = normalizeString(raw.url);

  return url || null;
}

function getCandidateCategory(candidate: RankCandidate): string | null {
  const raw = getRawRankResult(candidate);

  return (
    normalizeString(raw.category) ||
    normalizeString(candidate.category) ||
    null
  );
}

function getCandidateRating(candidate: RankCandidate): number | null {
  const raw = getRawRankResult(candidate);
  const rating = raw.rating;

  if (typeof rating === "number" && Number.isFinite(rating)) {
    return rating;
  }

  if (
    rating &&
    typeof rating === "object" &&
    typeof rating.value === "number" &&
    Number.isFinite(rating.value)
  ) {
    return rating.value;
  }

  return candidate.rating;
}

function getCandidateReviewsCount(candidate: RankCandidate): number | null {
  const raw = getRawRankResult(candidate);
  const rating = raw.rating;

  if (
    rating &&
    typeof rating === "object" &&
    typeof rating.votes_count === "number" &&
    Number.isFinite(rating.votes_count)
  ) {
    return Math.round(rating.votes_count);
  }

  return typeof candidate.reviewsCount === "number" &&
    Number.isFinite(candidate.reviewsCount)
    ? Math.round(candidate.reviewsCount)
    : null;
}

function getCandidateAdditionalCategories(candidate: RankCandidate): string[] | null {
  const raw = getRawRankResult(candidate);
  const value = raw.additional_categories;

  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object" &&
        "title" in item &&
        typeof (item as { title?: unknown }).title === "string"
      ) {
        return ((item as { title?: string }).title ?? "").trim();
      }

      return "";
    })
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : [];
}

function buildRawProvider(candidate: RankCandidate): JsonObject | null {
  const raw = getRawRankResult(candidate);
  const rawObject = asJsonObject(raw) ?? {};

  const url = getCandidateUrl(candidate);
  const domain = getCandidateDomain(candidate) || null;
  const title = getCandidateTitle(candidate);
  const category = getCandidateCategory(candidate);
  const phone = normalizeString(raw.phone) || null;
  const description = normalizeString(raw.description) || null;
  const workHours = toJsonValue(raw.work_hours);
  const additionalCategories = getCandidateAdditionalCategories(candidate);

  const enriched: JsonObject = {
    ...rawObject,
    url,
    domain,
    title,
    category,
    phone,
    description,
    website: url,
    work_hours: workHours ?? null,
    additional_categories: additionalCategories,
  };

  return enriched;
}

function mergeRawProviders(
  baseProvider: JsonObject | null,
  detailedProvider: JsonObject | null
): JsonObject | null {
  if (!baseProvider && !detailedProvider) {
    return null;
  }

  return {
    ...(baseProvider ?? {}),
    ...(detailedProvider ?? {}),
  };
}

export function findTargetCandidate(args: {
  candidates: RankCandidate[];
  targetDomain: string | null;
  targetBrandName: string | null;
  rankLat: number;
  rankLng: number;
}): {
  candidate: RankCandidate | null;
  matchedBy: "domain" | "coordinate" | null;
} {
  const normalizedTargetDomain = normalizeDomain(args.targetDomain);
  const normalizedTargetBrandName = normalizeBusinessName(args.targetBrandName);

  if (normalizedTargetDomain) {
    const domainMatch =
      args.candidates.find(
        (candidate) => getCandidateDomain(candidate) === normalizedTargetDomain
      ) ?? null;

    if (domainMatch) {
      return {
        candidate: domainMatch,
        matchedBy: "domain",
      };
    }
  }

  let bestCoordinateMatch: RankCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of args.candidates) {
    const lat = normalizeFiniteCoordinate(candidate.latitude);
    const lng = normalizeFiniteCoordinate(candidate.longitude);

    if (lat === null || lng === null) {
      continue;
    }

    const distance = Math.hypot(lat - args.rankLat, lng - args.rankLng);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCoordinateMatch = candidate;
    }
  }

  if (bestCoordinateMatch && bestDistance <= 0.0015) {
    return {
      candidate: bestCoordinateMatch,
      matchedBy: "coordinate",
    };
  }

  if (normalizedTargetBrandName) {
    const titleMatch =
      args.candidates.find(
        (candidate) =>
          normalizeBusinessName(getCandidateTitle(candidate)) ===
          normalizedTargetBrandName
      ) ?? null;

    if (titleMatch) {
      return {
        candidate: titleMatch,
        matchedBy: "coordinate",
      };
    }
  }

  return {
    candidate: null,
    matchedBy: null,
  };
}

export async function hydrateTargetBusinessProfile(args: {
  projectId: string;
  candidate: RankCandidate;
  businessName: string | null;
  locationCode: number | null;
  targetDomain: string | null;
}): Promise<{
  hydrated: boolean;
  placeId: string | null;
  name: string | null;
}> {
  const supabase = supabaseAdmin();

  const candidatePlaceId = getCandidatePlaceId(args.candidate);
  const candidateName = getCandidateTitle(args.candidate);
  const candidateUrl = getCandidateUrl(args.candidate);
  const candidateCategory = getCandidateCategory(args.candidate);
  const candidateAdditionalCategories = getCandidateAdditionalCategories(args.candidate);
  const candidateRating = getCandidateRating(args.candidate);
  const candidateTotalReviews = getCandidateReviewsCount(args.candidate);
  const candidateRawProvider = buildRawProvider(args.candidate);

  let finalPlaceId = candidatePlaceId;
  let finalName = candidateName;
  let finalUrl = candidateUrl;
  let finalPrimaryCategory = candidateCategory;
  let finalAdditionalCategories = candidateAdditionalCategories;
  let finalRating = candidateRating;
  let finalTotalReviews = candidateTotalReviews;
  let finalRawProvider = candidateRawProvider;

  const effectiveBusinessName = normalizeString(args.businessName) || candidateName;
  const effectiveLocationCode = normalizePositiveInteger(args.locationCode);

  if (effectiveBusinessName && effectiveLocationCode !== null) {
    try {
      const resolved = await resolveBusinessProfileFromDataForSeo({
        businessName: effectiveBusinessName,
        locationCode: effectiveLocationCode,
        targetPlaceId: candidatePlaceId,
        targetDomain: args.targetDomain,
      });

      const detailed = resolved.item;
      const detailedRawProvider = asJsonObject(detailed);

      finalPlaceId =
        normalizeString(detailed.place_id) ||
        normalizeString(detailed.cid) ||
        normalizeString(detailed.data_id) ||
        finalPlaceId;

      finalName = normalizeString(detailed.title) || finalName;
      finalUrl =
        normalizeString(detailed.url) ||
        normalizeString(detailed.domain) ||
        finalUrl;
      finalPrimaryCategory =
        normalizeString(detailed.category) || finalPrimaryCategory;

      if (Array.isArray(detailed.additional_categories)) {
        const normalized = detailed.additional_categories
          .map((item) => {
            if (typeof item === "string") {
              return item.trim();
            }

            if (
              item &&
              typeof item === "object" &&
              "title" in item &&
              typeof (item as { title?: unknown }).title === "string"
            ) {
              return ((item as { title?: string }).title ?? "").trim();
            }

            return "";
          })
          .filter((item) => item.length > 0);

        finalAdditionalCategories = normalized.length > 0 ? normalized : [];
      }

      if (typeof detailed.rating === "number" && Number.isFinite(detailed.rating)) {
        finalRating = detailed.rating;
      } else if (
        detailed.rating &&
        typeof detailed.rating === "object" &&
        typeof detailed.rating.value === "number" &&
        Number.isFinite(detailed.rating.value)
      ) {
        finalRating = detailed.rating.value;
      }

      if (
        detailed.rating &&
        typeof detailed.rating === "object" &&
        typeof detailed.rating.votes_count === "number" &&
        Number.isFinite(detailed.rating.votes_count)
      ) {
        finalTotalReviews = Math.round(detailed.rating.votes_count);
      }

      finalRawProvider = mergeRawProviders(candidateRawProvider, detailedRawProvider);
    } catch {
      finalRawProvider = candidateRawProvider;
    }
  }

  const { error } = await supabase.from("gbp_profiles").upsert(
    {
      project_id: args.projectId,
      place_id: finalPlaceId,
      gbp_name: finalName,
      gbp_url: finalUrl,
      primary_category: finalPrimaryCategory,
      additional_categories: finalAdditionalCategories,
      rating: finalRating,
      total_reviews: finalTotalReviews,
      photos_count: null,
      posts_30d: null,
      qa_count: null,
      raw_provider: finalRawProvider,
      last_fetched_at: new Date().toISOString(),
    },
    {
      onConflict: "project_id",
    }
  );

  if (error) {
    throw new Error(`Failed to upsert gbp_profiles from rank baseline: ${error.message}`);
  }

  return {
    hydrated: true,
    placeId: finalPlaceId,
    name: finalName,
  };
}