import type { VolumePresetOption } from "@/components/projects/dashboard/types";
import { supabase } from "@/lib/supabaseClient";

function safeNum(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const value = Number(n);
  return Number.isFinite(value) ? value : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function saveProjectReviewCapacityData(args: {
  clientId: string;
  projectId: string;
  monthlyEvents: string;
  reviewConvRate: string;
  volumePreset: string;
  eventLabelSingular: string;
  eventLabelPlural: string;
  preset: VolumePresetOption;
}) {
  const monthly =
    args.monthlyEvents.trim() === "" ? null : safeNum(args.monthlyEvents);
  const conversion =
    args.reviewConvRate.trim() === "" ? null : safeNum(args.reviewConvRate);
  const clampedConversion =
    conversion === null ? null : clamp(conversion, 0, 100);

  const finalSingular =
    args.volumePreset === "custom"
      ? args.eventLabelSingular.trim() || "Event"
      : args.preset.singular;

  const finalPlural =
    args.volumePreset === "custom"
      ? args.eventLabelPlural.trim() || "Events"
      : args.preset.plural;

  return supabase
    .from("projects")
    .update({
      event_label_singular: finalSingular,
      event_label_plural: finalPlural,
      monthly_customer_events:
        monthly === null ? null : Math.max(0, Math.floor(monthly)),
      review_conversion_rate: clampedConversion,
    })
    .eq("id", args.projectId)
    .eq("client_id", args.clientId);
}

export async function saveGbpProfileData(args: {
  projectId: string;
  gbpName: string;
  placeId: string;
  gbpUrl: string;
  primaryCategory: string;
  rating: string;
  totalReviews: string;
  photosCount: string;
}) {
  const ratingNum = args.rating.trim() === "" ? null : safeNum(args.rating);
  const reviewsNum =
    args.totalReviews.trim() === "" ? null : safeNum(args.totalReviews);
  const photosNum =
    args.photosCount.trim() === "" ? null : safeNum(args.photosCount);

  return supabase.from("gbp_profiles").upsert(
    {
      project_id: args.projectId,
      gbp_name: args.gbpName.trim() || null,
      place_id: args.placeId.trim() || null,
      gbp_url: args.gbpUrl.trim() || null,
      primary_category: args.primaryCategory.trim() || null,
      rating: ratingNum,
      total_reviews: reviewsNum,
      photos_count: photosNum,
      last_fetched_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
}

export async function saveCompetitorData(args: {
  projectId: string;
  compDomain: string;
  compName: string;
  compSource: string;
  compRating: string;
  compReviews: string;
}) {
  const raw = args.compDomain.trim().toLowerCase();
  let normalizedDomain = raw;

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      normalizedDomain = new URL(raw).hostname;
    }
  } catch {
    // ignore malformed URLs
  }

  normalizedDomain = normalizedDomain.replace(/^www\./, "").replace(/\/+$/, "");

  if (!normalizedDomain) {
    return {
      error: { message: "Competitor domain is required." },
    };
  }

  const ratingValue =
    args.compRating.trim() === "" ? null : safeNum(args.compRating);
  const reviewsValue =
    args.compReviews.trim() === "" ? null : safeNum(args.compReviews);

  return supabase.from("gbp_competitor_metrics").upsert(
    {
      project_id: args.projectId,
      competitor_domain: normalizedDomain,
      competitor_name: args.compName.trim() || null,
      source: args.compSource,
      rating: ratingValue,
      total_reviews: reviewsValue,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "project_id,competitor_domain" }
  );
}

export async function deleteCompetitorData(id: string) {
  return supabase.from("gbp_competitor_metrics").delete().eq("id", id);
}