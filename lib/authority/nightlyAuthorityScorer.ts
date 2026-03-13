// lib/authority/nightlyAuthorityScorer.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeAuthority } from "@/lib/authority/authorityEngine";
import { detectCompetitorPressure } from "@/lib/domain/rank/detectCompetitorPressure";
import { buildPressureActions } from "@/lib/domain/rank/buildPressureActions";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

type AnyRow = Record<string, unknown>;

type AuthorityScoreRow = {
  authority_score?: number | string | null;
  inputs?: {
    gap?: number | string | null;
  } | null;
  captured_at?: string | null;
};

type RankKeywordRow = {
  keyword?: string | null;
  metro?: string | null;
};

function num(row: AnyRow | null | undefined, key: string, fallback = 0): number {
  if (!row) return fallback;
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
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
  for (const value of sorted) {
    if (value <= yourValue) countBelowOrEqual++;
  }
  return countBelowOrEqual / sorted.length;
}

function normalize01(x: number, softCap: number): number {
  const value = Math.max(0, x);
  return value / (value + Math.max(1, softCap));
}

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateUTC(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

type MomentumOut = {
  score: number;
  label: string;
  components: Record<string, number>;
};

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
  const authorityDelta =
    args.authorityYesterday == null ? 0 : args.authorityToday - args.authorityYesterday;

  const gapShrink =
    args.gapYesterday == null
      ? 0
      : clamp((args.gapYesterday - args.gapToday) / Math.max(10, args.gapYesterday), -1, 1);

  const execPosts = clamp(args.posts30d / 12, 0, 1);
  const execPhotos = clamp(args.photosCount / 200, 0, 1);
  const execQA = clamp(args.qaCount / 50, 0, 1);
  const execution = clamp(0.5 * execPosts + 0.35 * execPhotos + 0.15 * execQA, 0, 1);

  const marketPressure = clamp(normalize01(args.marketMedianReviews, 300), 0, 1);

  const raw =
    0.2 * clamp(authorityDelta / 5, -1, 1) +
    0.45 * gapShrink +
    0.35 * (execution - 0.5) -
    0.15 * (marketPressure - 0.5);

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

type StoredProjectAction = {
  title: string;
  detail: string;
  priority: string;
  category: string;
};

async function replaceProjectActions(params: {
  supabase: ReturnType<typeof supabaseAdmin>;
  projectId: string;
  capturedAt: string;
  version: string;
  actions: StoredProjectAction[];
}) {
  const { supabase, projectId, capturedAt, version, actions } = params;

  const { error } = await supabase.from("project_actions").upsert(
    [
      {
        project_id: projectId,
        captured_at: capturedAt,
        version,
        actions_json: actions,
      },
    ],
    { onConflict: "project_id,captured_at,version" }
  );

  if (error) {
    throw new Error(`project_actions upsert error: ${error.message}`);
  }
}

function dedupeActions(actions: StoredProjectAction[]) {
  const seen = new Set<string>();
  const output: StoredProjectAction[] = [];

  for (const action of actions) {
    const key = `${action.category}::${action.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(action);
  }

  return output;
}

function buildAuthorityActions(args: {
  yourReviews: number;
  top3MedianReviews: number;
  posts30d: number;
  photosCount: number;
  qaCount: number;
  hasPrimaryCategory: boolean;
  additionalCategoryCount: number;
  hasDescription: boolean;
  hasHours: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
}): StoredProjectAction[] {
  const actions: StoredProjectAction[] = [];
  const reviewGap = Math.max(0, args.top3MedianReviews - args.yourReviews);

  if (reviewGap >= 10) {
    actions.push({
      title: "Increase review acquisition",
      detail: `The business trails the top 3 median by ${reviewGap} reviews. Prioritize a structured review acquisition process to close the authority gap.`,
      priority: reviewGap >= 50 ? "high" : "medium",
      category: "reviews",
    });
  }

  if (args.posts30d < 4) {
    actions.push({
      title: "Publish more GBP posts",
      detail: `Only ${args.posts30d} posts were detected in the last 30 days. Increase posting cadence to strengthen freshness and activity signals.`,
      priority: "medium",
      category: "competition",
    });
  }

  if (args.photosCount < 25) {
    actions.push({
      title: "Add more GBP photos",
      detail: `The profile currently shows ${args.photosCount} photos. Add more high-quality, service-relevant photos to improve profile completeness and engagement.`,
      priority: "medium",
      category: "competition",
    });
  }

  if (args.qaCount < 3) {
    actions.push({
      title: "Build GBP Q&A depth",
      detail: `The profile only shows ${args.qaCount} Q&A items. Add common service and customer questions to improve completeness and trust.`,
      priority: "low",
      category: "competition",
    });
  }

  if (!args.hasPrimaryCategory) {
    actions.push({
      title: "Confirm primary category",
      detail: "The profile appears to be missing a primary category signal. Verify and correct the primary GBP category.",
      priority: "high",
      category: "competition",
    });
  }

  if (args.additionalCategoryCount < 2) {
    actions.push({
      title: "Expand additional categories",
      detail: `Only ${args.additionalCategoryCount} additional categories were detected. Add relevant secondary categories where appropriate.`,
      priority: "medium",
      category: "competition",
    });
  }

  if (!args.hasDescription) {
    actions.push({
      title: "Add or improve GBP description",
      detail: "The GBP description signal appears weak or missing. Add a stronger business description aligned to services and location.",
      priority: "medium",
      category: "competition",
    });
  }

  if (!args.hasHours) {
    actions.push({
      title: "Verify business hours",
      detail: "Business hours appear incomplete or missing. Confirm regular hours and special hours in GBP.",
      priority: "medium",
      category: "competition",
    });
  }

  if (!args.hasPhone) {
    actions.push({
      title: "Verify phone number",
      detail: "The phone signal appears incomplete or missing. Confirm the primary business phone in GBP.",
      priority: "high",
      category: "competition",
    });
  }

  if (!args.hasWebsite) {
    actions.push({
      title: "Verify website link",
      detail: "The website signal appears incomplete or missing. Confirm the primary website URL in GBP.",
      priority: "high",
      category: "competition",
    });
  }

  return actions;
}

function validateAuthorityOutput(computed: Record<string, unknown>) {
  return (
    isFiniteNumber(computed.authorityScore) &&
    typeof computed.authorityTier === "string" &&
    computed.authorityTier.trim() !== "" &&
    isFiniteNumber(computed.competitiveStrength) &&
    isFiniteNumber(computed.structuralOptimization)
  );
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

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`);
  }

  const projectRows = (projects ?? []) as Array<{ id: string; client_id?: string | null }>;
  result.projects_total = projectRows.length;

  if (projectRows.length === 0) {
    return result;
  }

  const yesterday = yesterdayDateUTC();

  for (const project of projectRows) {
    const projectId = project.id;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("gbp_profiles")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (profileError) {
        result.errors.push({
          project_id: projectId,
          message: `gbp_profiles error: ${profileError.message}`,
        });
        result.projects_skipped++;
        continue;
      }

      if (!profile) {
        result.projects_skipped++;
        continue;
      }

      const profileRow = profile as AnyRow;
      const yourReviews = num(profileRow, "total_reviews", 0);
      const posts30d = num(profileRow, "posts_30d", 0);
      const photosCount = num(profileRow, "photos_count", 0);
      const qaCount = num(profileRow, "qa_count", 0);

      const { data: metrics, error: metricsError } = await supabase
        .from("gbp_competitor_metrics")
        .select("*")
        .eq("project_id", projectId);

      if (metricsError) {
        result.errors.push({
          project_id: projectId,
          message: `gbp_competitor_metrics error: ${metricsError.message}`,
        });
        result.projects_skipped++;
        continue;
      }

      const metricsRows = (metrics ?? []) as AnyRow[];
      const competitorReviews = metricsRows.map((row) => num(row, "total_reviews", 0));

      const sortedByReviewsDesc = [...metricsRows].sort(
        (a, b) => num(b, "total_reviews", 0) - num(a, "total_reviews", 0)
      );
      const top3 = sortedByReviewsDesc.slice(0, 3);

      const top3MedianReviews = median(top3.map((row) => num(row, "total_reviews", 0)));
      const marketMedianReviews = median(competitorReviews);

      const dist = [...competitorReviews, yourReviews];
      const pRank = percentileRank(dist, yourReviews);

      const competitorCount = metricsRows.length;
      const densityScore = Math.min(1, competitorCount / 50);

      const reviewSorted = [...competitorReviews].sort((a, b) => a - b);
      const p90Index = Math.max(0, Math.floor(0.9 * Math.max(0, reviewSorted.length - 1)));
      const reviewCeiling = reviewSorted.length ? reviewSorted[p90Index] : 0;

      const marketReviewCeilingScore = normalize01(reviewCeiling, 200);
      const marketVelocityCeilingScore = 0;
      const marketDensityScore = normalize01(densityScore, 0.7);

      const hasPrimaryCategory = Boolean(profileRow["primary_category"]);
      const additionalCategories = profileRow["additional_categories"];
      const additionalCategoryCount = Array.isArray(additionalCategories)
        ? additionalCategories.length
        : 0;

      const rawProvider =
        typeof profileRow["raw_provider"] === "object" && profileRow["raw_provider"] !== null
          ? (profileRow["raw_provider"] as Record<string, unknown>)
          : null;

      const hasDescription = Boolean(rawProvider?.description);
      const hasHours = Boolean(rawProvider?.hours);
      const hasPhone = Boolean(rawProvider?.phone);
      const hasWebsite = Boolean(rawProvider?.website);

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

      if (!validateAuthorityOutput(computed as unknown as Record<string, unknown>)) {
        result.errors.push({
          project_id: projectId,
          message: "Authority engine returned invalid output for this project.",
        });
        result.projects_skipped++;
        continue;
      }

      const { data: yRow } = await supabase
        .from("project_authority_scores")
        .select("authority_score, inputs, captured_at")
        .eq("project_id", projectId)
        .eq("captured_at", yesterday)
        .eq("version", version)
        .maybeSingle();

      const previousRow = (yRow ?? null) as AuthorityScoreRow | null;
      const authorityYesterday =
        previousRow?.authority_score == null ? null : Number(previousRow.authority_score);
      const gapToday = Math.max(0, top3MedianReviews - yourReviews);
      const gapYesterday =
        previousRow?.inputs?.gap != null ? Number(previousRow.inputs.gap) : null;

      const momentum = computeMomentum({
        authorityToday: computed.authorityScore,
        authorityYesterday,
        gapToday,
        gapYesterday,
        posts30d,
        photosCount,
        qaCount,
        marketMedianReviews,
      });

      const inputs: JsonObject = {
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
          components: momentum.components,
          note: "v1.1 momentum uses authority delta (if available), gap shrink proxy, and GBP activity signals.",
        },
      };

      const { error: upsertError } = await supabase.from("project_authority_scores").upsert(
        [
          {
            project_id: projectId,
            captured_at,
            version,
            authority_score: computed.authorityScore,
            authority_tier: computed.authorityTier,
            competitive_strength: computed.competitiveStrength,
            structural_optimization: computed.structuralOptimization,
            momentum_score: momentum.score,
            momentum_label: momentum.label,
            inputs,
          },
        ],
        { onConflict: "project_id,captured_at,version" }
      );

      if (upsertError) {
        result.errors.push({
          project_id: projectId,
          message: `upsert error: ${upsertError.message}`,
        });
        result.projects_skipped++;
        continue;
      }

      const authorityActions = buildAuthorityActions({
        yourReviews,
        top3MedianReviews,
        posts30d,
        photosCount,
        qaCount,
        hasPrimaryCategory,
        additionalCategoryCount,
        hasDescription,
        hasHours,
        hasPhone,
        hasWebsite,
      });

      const { data: rankKeywords, error: rankKeywordsError } = await supabase
        .from("project_rank_keywords")
        .select("keyword, metro")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      const pressureActions: StoredProjectAction[] = [];

      if (rankKeywordsError) {
        result.errors.push({
          project_id: projectId,
          message: `project_rank_keywords error: ${rankKeywordsError.message}`,
        });
      } else {
        const keywordRows = (rankKeywords ?? []) as RankKeywordRow[];

        for (const row of keywordRows) {
          const keyword = typeof row.keyword === "string" ? row.keyword : "";
          const metro = typeof row.metro === "string" ? row.metro : "";

          if (!keyword || !metro) continue;

          try {
            const pressure = await detectCompetitorPressure({
              projectId,
              keyword,
              metro,
            });

            const generated = buildPressureActions(pressure);

            for (const action of generated) {
              pressureActions.push({
                ...action,
                detail: `${action.detail} Keyword: ${keyword}. Metro: ${metro}.`,
              });
            }
          } catch (pressureError: unknown) {
            result.errors.push({
              project_id: projectId,
              message: `pressure action error (${keyword}): ${getErrorMessage(
                pressureError,
                "Unknown error"
              )}`,
            });
          }
        }
      }

      const mergedActions = dedupeActions([...authorityActions, ...pressureActions]).slice(0, 12);

      try {
        await replaceProjectActions({
          supabase,
          projectId,
          capturedAt: captured_at,
          version,
          actions: mergedActions,
        });
      } catch (actionStoreError: unknown) {
        result.errors.push({
          project_id: projectId,
          message: getErrorMessage(actionStoreError, "Unknown project_actions error"),
        });
      }

      result.projects_scored++;
    } catch (error: unknown) {
      result.errors.push({
        project_id: projectId,
        message: getErrorMessage(error, "Unknown scorer error"),
      });
      result.projects_skipped++;
    }
  }

  return result;
}