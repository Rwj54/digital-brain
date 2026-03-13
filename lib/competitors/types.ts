type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

export type CompetitorCandidate = {
  projectId: string;

  name: string;
  domain: string | null;

  rating: number | null;
  totalReviews: number | null;

  placeId: string;

  source: "maps";
  lastSeenAt: string; // ISO timestamp

  rawProvider?: JsonObject;
};

export type DiscoverCompetitorsResult = {
  found: number;
  upserted: number;
  costUsd: number;
  providerCheckUrl: string | null;
};