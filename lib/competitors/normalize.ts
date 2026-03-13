import type { CompetitorCandidate } from "./types";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

type DataForSeoMapsItem = {
  title?: string;
  domain?: string | null;
  place_id?: string;
  rating?: { value?: number; votes_count?: number } | null;
};

export function normalizeDataForSeoMapsItems(args: {
  projectId: string;
  items: DataForSeoMapsItem[];
  nowIso: string;
  includeRaw?: boolean;
  raw?: JsonObject;
}): CompetitorCandidate[] {
  const { projectId, items, nowIso, includeRaw, raw } = args;

  const out: CompetitorCandidate[] = [];

  for (const item of items) {
    const placeId = item.place_id?.trim();
    const name = item.title?.trim();

    if (!placeId || !name) continue;

    out.push({
      projectId,
      placeId,
      name,
      domain: item.domain ?? null,
      rating:
        typeof item.rating?.value === "number"
          ? item.rating.value
          : null,
      totalReviews:
        typeof item.rating?.votes_count === "number"
          ? item.rating.votes_count
          : null,
      source: "maps",
      lastSeenAt: nowIso,
      rawProvider: includeRaw ? raw : undefined,
    });
  }

  return out;
}