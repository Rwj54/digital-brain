// lib/authority/nightlyAuthorityScorer.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeAuthority } from "@/lib/authority/authorityEngine";

type AnyRow = Record<string, any>;

function num(row: AnyRow | null | undefined, keys: string[], fallback = 0): number {
  if (!row) return fallback;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return fallback;
}

function bool(row: AnyRow | null | undefined, keys: string[], fallback = false): boolean {
  if (!row) return fallback;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.toLowerCase().trim();
      if (s === "true" || s === "yes" || s === "1") return true;
      if (s === "false" || s === "no" || s === "0") return false;
    }
    if (typeof v === "number") return v !== 0;
  }
  return fallback;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentileRank(values: number[], yourValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  let countBelowOrEqual = 0;
  for (const v of sorted) {
    if (v <= yourValue) countBelowOrEqual++;
  }
  return countBelowOrEqual / sorted.length;
}

function normalize01(x: number, softCap: number): number {
  // stable 0..1 mapping without hard cliffs
  const v = Math.max(0, x);
  return v / (v + Math.max(1, softCap));
}

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface NightlyAuthorityRunResult {
  captured_at: string;
  version: string;
  projects_total: number;
  projects_scored: number;
  projects_skipped: number;
  errors: Array<{ project_id?: string; message: string }>;
}

export async function runNightlyAuthorityScorer(): Promise<NightlyAuthorityRunResult> {
  const supabase = supabaseAdmin();
  const captured_at = todayDateUTC();
  const version = "v1.0";

  const result: NightlyAuthorityRunResult = {
    captured_at,
    version,
    projects_total: 0,
    projects_scored: 0,
    projects_skipped: 0,
    errors: [],
  };

  // 1) Load projects (minimal columns)
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, client_id, name")
    .order("created_at", { ascending: false });

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`);
  }

  result.projects_total = projects?.length ?? 0;
  if (!projects || projects.length === 0) return result;

  // 2) Score each project
  for (const project of projects as AnyRow[]) {
    const projectId = project.id as string;

    try {
      // --- Load GBP profile (your business) ---
      const { data: profile, error: profileError } = await supabase
        .from("gbp_profiles")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (profileError) {
        result.errors.push({ project_id: projectId, message: `gbp_profiles error: ${profileError.message}` });
        result.projects_skipped++;
        continue;
      }

      // If no profile, skip (no "you" to score)
      if (!profile) {
        result.projects_skipped++;
        continue;
      }

      const yourReviews = num(profile, ["review_count", "reviews", "reviews_count", "total_reviews"], 0);

      // --- Load competitor metrics ---
      const { data: metrics, error: metricsError } = await supabase
        .from("gbp_competitor_metrics")
        .select("*")
        .eq("project_id", projectId);

      if (metricsError) {
        result.errors.push({ project_id: projectId, message: `gbp_competitor_metrics error: ${metricsError.message}` });
        result.projects_skipped++;
        continue;
      }

      const metricsRows = (metrics ?? []) as AnyRow[];

      // If no competitors, still compute (market is empty-ish) but normalize safely
      const competitorReviews = metricsRows.map((r) =>
        num(r, ["review_count", "reviews", "reviews_count", "total_reviews"], 0)
      );

      // Determine top 3 by "rank" if present; otherwise use highest reviews
      const sortedForTop3 = [...metricsRows].sort((a, b) => {
        const ar = num(a, ["rank", "rank_position", "position", "place_position"], Number.POSITIVE_INFINITY);
        const br = num(b, ["rank", "rank_position", "position", "place_position"], Number.POSITIVE_INFINITY);
        if (ar !== br) return ar - br;

        const av = num(a, ["review_count", "reviews", "reviews_count", "total_reviews"], 0);
        const bv = num(b, ["review_count", "reviews", "reviews_count", "total_reviews"], 0);
        return bv - av;
      });

      const top3 = sortedForTop3.slice(0, 3);

      const top3MedianReviews = median(
        top3.map((r) => num(r, ["review_count", "reviews", "reviews_count", "total_reviews"], 0))
      );

      const yourVelocity90_est = 0; // we may not have your own history yet
      const top3MedianVelocity90 = median(
        top3.map((r) =>
          num(r, ["velocity_90", "v90", "reviews_90", "reviews_90d", "reviews_delta_90", "delta_90"], 0)
        )
      );

      // Market distribution includes you + competitors
      const dist = [...competitorReviews, yourReviews];
      const pRank = percentileRank(dist, yourReviews); // 0..1

      // Market competitiveness normalized (heuristic, stable)
      const competitorCount = metricsRows.length;
      const densityScore = Math.min(1, competitorCount / 50);

      const reviewSorted = [...competitorReviews].sort((a, b) => a - b);
      const p90Index = Math.max(0, Math.floor(0.9 * Math.max(0, reviewSorted.length - 1)));
      const reviewCeiling = reviewSorted.length ? reviewSorted[p90Index] : 0;

      const velocities = metricsRows.map((r) =>
        num(r, ["velocity_90", "v90", "reviews_90", "reviews_90d", "reviews_delta_90", "delta_90"], 0)
      );
      const velSorted = [...velocities].sort((a, b) => a - b);
      const velP90Index = Math.max(0, Math.floor(0.9 * Math.max(0, velSorted.length - 1)));
      const velocityCeiling = velSorted.length ? velSorted[velP90Index] : 0;

      const marketReviewCeilingScore = normalize01(reviewCeiling, 200); // softcap 200 reviews
      const marketVelocityCeilingScore = normalize01(velocityCeiling, 20); // softcap 20 reviews / 90d
      const marketDensityScore = normalize01(densityScore, 0.7); // keep it smooth

      // Structural fields (best-effort now; expands later)
      const hasPrimaryCategory = bool(profile, ["has_primary_category"], true) || !!profile["primary_category"];
      const additionalCategoryCount = num(profile, ["additional_category_count", "additional_categories_count"], 0);

      const hasDescription = !!profile["description"] || bool(profile, ["has_description"], false);
      const hasHours = !!profile["hours"] || bool(profile, ["has_hours"], false);
      const hasPhone = !!profile["phone"] || bool(profile, ["has_phone"], false);
      const hasWebsite = !!profile["website"] || bool(profile, ["has_website"], false);

      const reviewResponseRate = num(profile, ["review_response_rate", "response_rate"], NaN);
      const reviewResponseRateFinal =
        Number.isFinite(reviewResponseRate) ? Math.max(0, Math.min(1, reviewResponseRate)) : undefined;

      // Momentum v1: we don’t yet have your own review time-series; keep stable defaults
      // We will upgrade this once we store your review deltas.
      const yourVelocity90 = num(profile, ["velocity_90", "v90", "reviews_90d", "reviews_delta_90"], yourVelocity90_est);
      const yourVelocity30 = num(profile, ["velocity_30", "v30", "reviews_30d", "reviews_delta_30"], Math.round(yourVelocity90 / 3));
      const yourVelocity14 = num(profile, ["velocity_14", "v14", "reviews_14d", "reviews_delta_14"], Math.round(yourVelocity90 / 6));

      const gapChange90 = 0; // placeholder until we store yesterday’s authority inputs (next step)
      const marketAcceleration = 0; // placeholder until we compute 14/30/90 accel across market

      const computed = computeAuthority({
        yourReviews,
        top3MedianReviews,

        yourVelocity90,
        top3MedianVelocity90,

        percentileRank: pRank,

        marketDensityScore,
        marketReviewCeilingScore,
        marketVelocityCeilingScore,

        hasPrimaryCategory,
        additionalCategoryCount,
        hasDescription,
        hasHours,
        hasPhone,
        hasWebsite,

        reviewResponseRate: reviewResponseRateFinal,

        yourVelocity14,
        yourVelocity30,
        gapChange90,
        marketAcceleration,
      });

      // Store explainability inputs (small + stable)
      const inputs = {
        your_reviews: yourReviews,
        top3_median_reviews: top3MedianReviews,
        gap: Math.max(0, top3MedianReviews - yourReviews),

        your_v14: yourVelocity14,
        your_v30: yourVelocity30,
        your_v90: yourVelocity90,
        top3_median_v90: top3MedianVelocity90,

        percentile_rank: pRank,

        competitor_count: competitorCount,
        review_ceiling_p90: reviewCeiling,
        velocity_ceiling_p90: velocityCeiling,

        market_density_score: marketDensityScore,
        market_review_ceiling_score: marketReviewCeilingScore,
        market_velocity_ceiling_score: marketVelocityCeilingScore,

        structural: {
          hasPrimaryCategory,
          additionalCategoryCount,
          hasDescription,
          hasHours,
          hasPhone,
          hasWebsite,
          reviewResponseRate: reviewResponseRateFinal ?? null,
        },

        notes: {
          momentum_placeholders: true,
          reason: "Your own review time-series + market acceleration inputs not yet stored; will be upgraded in Step 2B.",
        },
      };

      // Upsert into project_authority_scores
      const { error: upsertError } = await supabase
        .from("project_authority_scores")
        .upsert(
          [
            {
              project_id: projectId,
              captured_at,
              version,

              authority_score: computed.authorityScore,
              authority_tier: computed.authorityTier,

              competitive_strength: computed.competitiveStrength,
              structural_optimization: computed.structuralOptimization,

              momentum_score: computed.momentumScore,
              momentum_label: computed.momentumLabel,

              inputs,
            },
          ],
          { onConflict: "project_id,captured_at,version" }
        );

      if (upsertError) {
        result.errors.push({ project_id: projectId, message: `upsert error: ${upsertError.message}` });
        result.projects_skipped++;
        continue;
      }

      result.projects_scored++;
    } catch (e: any) {
      result.errors.push({
        project_id: projectId,
        message: e?.message ? String(e.message) : "Unknown scorer error",
      });
      result.projects_skipped++;
      continue;
    }
  }

  return result;
}