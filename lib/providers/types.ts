// lib/providers/types.ts
export type PlaceResult = {
  name: string;
  placeId: string;
  rating?: number | null;
  totalReviews?: number | null;
  websiteUrl?: string | null;
  domain?: string | null;
  raw?: unknown;
};

export type MapsSearchParams = {
  query: string;          // e.g. "plumber Omaha NE"
  location?: string;      // optional: city/state if provider supports
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;         // e.g. 20
  languageCode?: string;  // e.g. "en"
};

export interface MapsProvider {
  searchPlaces(params: MapsSearchParams): Promise<PlaceResult[]>;
}