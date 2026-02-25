export type CompetitorCandidate = {
  projectId: string;

  name: string;
  domain: string | null;

  rating: number | null;
  totalReviews: number | null;

  placeId: string;

  source: "maps";
  lastSeenAt: string; // ISO timestamp

  rawProvider?: any;
};

export type DiscoverCompetitorsResult = {
  found: number;
  upserted: number;
  costUsd: number;
  providerCheckUrl: string | null;
};