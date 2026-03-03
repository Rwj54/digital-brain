// lib/authority/nightlyAuthorityScorer.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeAuthority } from "@/lib/authority/authorityEngine";

type AnyRow = Record<string, any>;

function num(row: AnyRow | null | undefined, key: string, fallback = 0): number {
  if (!row) return fallback;
  const v = row[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
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
  for (const v of sorted) if (v <= yourValue) countBelowOrEqual++;
  return countBelowOrEqual / sorted.length;
}

function normalize01(x: number, softCap: number): number {
  const v = Math.max(0, x);
  return v / (v + Math.max(1, softCap));
}

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayDateUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type MomentumOut = { score: number; label: string; components: Record<string, number> };

function computeMomentum(args: {
  authorityToday: number;
  authorityYesterday: number | null;

  gapToday: number;
  gapYesterday: number | null;

  posts30d: number;
  photosCount: number;
  qaCount: number;

  marketMedianReviews: number;
}): MomentumOut {
  // 0..100, centered at 50, then we map to -100..+100-ish feel, but store 0..100 for simplicity.
  // We output as 0..100, where 50 = Flat. UI can still label it.

  const authorityDelta = args.authorityYesterday == null ? 0 : args.authorityToday - args.authorityYesterday;

  const gapShrink =
    args.gapYesterday == null ? 0 : clamp((args.gapYesterday - args.gapToday) / Math.max(10, args.gapYesterday), -1, 1);

  // Execution proxy (structural activity)
  const execPosts = clamp(args.posts30d / 12, 0, 1); // 12 posts / 30d ~= 3/wk is strong
  const execPhotos = clamp(args.photosCount / 200, 0, 1); // soft cap
  const execQA = clamp(args.qaCount / 50, 0, 1); // soft cap
  const execution = clamp(0.5 * execPosts + 0.35 * execPhotos + 0.15 * execQA, 0, 1);

  // Market pressure proxy: higher median reviews means harder market to move in.
  const marketPressure = clamp(normalize01(args.marketMedianReviews, 300), 0, 1);

  // Compose:
  // - authorityDelta is a lagging signal, small weight
  // - gapShrink is a leading signal, stronger weight
  // - execution is leading, medium weight
  // - marketPressure subtracts a bit (harder markets are tougher to gain momentum)
  const raw =
    0.20 * clamp(authorityDelta / 5, -1, 1) +
    0.45 * gapShrink +
    0.35 * (execution - 0.5) -
    0.15 * (marketPressure - 0.5);

  // Map raw (-~1..+1) to 0..100 with 50 baseline
  const score = clamp(50 + raw * 50, 0, 100);

  let label = "Flat";
  if (score >= 65) label = "Rising";
  if (score >= 80) label = "Surging";
  if (score <= 35) label = "Falling";
  if (score <= 20) label = "Dropping";

  return {
    score: Math.round(score * 10) / 10,
    label,
    components: {
      authorityDelta: Math.round(authorityDelta * 10) / 10,
      gapShrinkRatio: Math.round(gapShrink * 1000) / 1000,
      execution: Math.round(execution * 1000) / 1000,
      marketPressure: Math.round(marketPressure * 1000) / 1000,
    },
  };
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
  const version = "v1.1";

  const result: NightlyAuthorityRunResult = {
    captured_at,
    version,
    projects_total: 0,
    projects_scored: 0,
    projects_skipped: 0,
    errors: [],
  };

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, client_id")
    .order("id", { ascending: true });

  if (projectsError) throw new Error(`Failed to load projects: ${projectsError.message}`);

  result.projects_total = projects?.length ?? 0;
  if (!projects || projects.length === 0) return result;

  const yesterday = yesterdayDateUTC();

  for (const project of projects as AnyRow[]) {
    const projectId = project.id as string;

    try {
      // Your GBP profile
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
      if (!profile) {
        result.projects_skipped++;
        continue;
      }

      const yourReviews = num(profile, "total_reviews", 0);

      const posts30d = num(profile, "posts_30d", 0);
      const photosCount = num(profile, "photos_count", 0);
      const qaCount = num(profile, "qa_count", 0);

      // Competitor metrics
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
      const competitorReviews = metricsRows.map((r) => num(r, "total_reviews", 0));

      const sortedByReviewsDesc = [...metricsRows].sort((a, b) => num(b, "total_reviews", 0) - num(a, "total_reviews", 0));
      const top3 = sortedByReviewsDesc.slice(0, 3);

      const top3MedianReviews = median(top3.map((r) => num(r, "total_reviews", 0)));
      const marketMedianReviews = median(competitorReviews);

      const dist = [...competitorReviews, yourReviews];
      const pRank = percentileRank(dist, yourReviews);

      // Market competitiveness heuristics
      const competitorCount = metricsRows.length;
      const densityScore = Math.min(1, competitorCount / 50);

      const reviewSorted = [...competitorReviews].sort((a, b) => a - b);
      const p90Index = Math.max(0, Math.floor(0.9 * Math.max(0, reviewSorted.length - 1)));
      const reviewCeiling = reviewSorted.length ? reviewSorted[p90Index] : 0;

      const marketReviewCeilingScore = normalize01(reviewCeiling, 200);
      const marketVelocityCeilingScore = 0; // not available yet
      const marketDensityScore = normalize01(densityScore, 0.7);

      // Structural flags (best-effort)
      const hasPrimaryCategory = !!profile["primary_category"];
      const additionalCategoryCount = Array.isArray(profile["additional_categories"])
        ? (profile["additional_categories"] as any[]).length
        : 0;

      const hasDescription = typeof profile["raw_provider"] === "object" && !!profile["raw_provider"]?.description;
      const hasHours = typeof profile["raw_provider"] === "object" && !!profile["raw_provider"]?.hours;
      const hasPhone = typeof profile["raw_provider"] === "object" && !!profile["raw_provider"]?.phone;
      const hasWebsite = typeof profile["raw_provider"] === "object" && !!profile["raw_provider"]?.website;

      // Compute authority (v1.1 still using same core authority engine)
      const computed = computeAuthority({
        yourReviews,
        top3MedianReviews,

        yourVelocity90: 0,
        top3MedianVelocity90: 0,

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

        reviewResponseRate: undefined,

        yourVelocity14: 0,
        yourVelocity30: 0,
        gapChange90: 0,
        marketAcceleration: 0,
      });

      // Load yesterday's authority row (for momentum)
      const { data: yRow, error: yErr } = await supabase
        .from("project_authority_scores")
        .select("authority_score, inputs, captured_at")
        .eq("project_id", projectId)
        .eq("captured_at", yesterday)
        .eq("version", version)
        .maybeSingle();

      if (yErr) {
        // Not fatal
      }

      const authorityYesterday = yRow ? Number(yRow.authority_score) : null;
      const gapToday = Math.max(0, top3MedianReviews - yourReviews);
      const gapYesterday = yRow?.inputs?.gap != null ? Number(yRow.inputs.gap) : null;

      const m = computeMomentum({
        authorityToday: computed.authorityScore,
        authorityYesterday,
        gapToday,
        gapYesterday,
        posts30d,
        photosCount,
        qaCount,
        marketMedianReviews,
      });

      const inputs = {
        your_reviews: yourReviews,
        top3_median_reviews: top3MedianReviews,
        gap: gapToday,
        percentile_rank: pRank,

        competitor_count: competitorCount,
        market_median_reviews: marketMedianReviews,
        review_ceiling_p90: reviewCeiling,

        market_density_score: marketDensityScore,
        market_review_ceiling_score: marketReviewCeilingScore,

        gbp_activity: {
          posts_30d: posts30d,
          photos_count: photosCount,
          qa_count: qaCount,
        },

        momentum: {
          components: m.components,
          note: "v1.1 momentum uses authority delta (if available), gap shrink proxy, and GBP activity signals.",
        },
      };

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

              momentum_score: m.score,
              momentum_label: m.label,

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
      result.errors.push({ project_id: projectId, message: e?.message ? String(e.message) : "Unknown scorer error" });
      result.projects_skipped++;
    }
  }

  return result;
}