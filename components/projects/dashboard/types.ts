export type Client = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  client_id: string;
  site_url: string;
  category: string;
  metro: string;
  radius_miles: number;
  created_at: string;
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
  event_label_singular: string | null;
  event_label_plural: string | null;
};

export type GbpProfile = {
  id: string;
  project_id: string;
  place_id: string | null;
  gbp_name: string | null;
  gbp_url: string | null;
  primary_category: string | null;
  additional_categories: string[] | null;
  rating: number | null;
  total_reviews: number | null;
  photos_count: number | null;
  posts_30d: number | null;
  qa_count: number | null;
  last_fetched_at: string;
};

export type CompetitorMetric = {
  id: string;
  project_id: string;
  competitor_domain: string;
  source: string;
  competitor_name: string | null;
  place_id: string | null;
  rating: number | null;
  total_reviews: number | null;
  last_seen_at: string;
  created_at: string;
};

export type TabKey = "overview" | "data" | "actions" | "settings";

export type VolumePresetOption = {
  key: string;
  label: string;
  helper: string;
  singular: string;
  plural: string;
  example: string;
};