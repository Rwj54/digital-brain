import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type RankKeywordRow = {
  keyword: string;
  metro: string;
  priority: number;
  is_active: boolean;
};

type RankSnapshotRow = {
  rank_position: number;
  captured_at: string;
};

type VisibilitySummary = {
  hasActiveKeyword: boolean;
  keyword: string | null;
  metro: string | null;
  latestRank: number | null;
  bestRank: number | null;
  latestCapturedAt: string | null;
  previousRank: number | null;
  visibilityLabel: string;
  visibilityReadinessScore: number;
  plainLanguageSummary: string;
  topIssue: string;
  whyItMatters: string;
  nextAction: {
    title: string;
    whoShouldDoIt: string;
    difficulty: string;
    reason: string;
  };
  evidence: string[];
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function buildVisibilityLabel(rank: number | null): string {
  if (rank === null) {
    return "No rank data yet";
  }

  if (rank <= 3) {
    return "Strong visibility";
  }

  if (rank <= 10) {
    return "Visible but needs improvement";
  }

  if (rank <= 20) {
    return "Weak visibility";
  }

  return "Very low visibility";
}

function buildNoKeywordSummary(): VisibilitySummary {
  return {
    hasActiveKeyword: false,
    keyword: null,
    metro: null,
    latestRank: null,
    bestRank: null,
    latestCapturedAt: null,
    previousRank: null,
    visibilityLabel: "No active keyword configured",
    visibilityReadinessScore: 18,
    plainLanguageSummary:
      "Digital Brain does not have one clear tracked search phrase for this business yet.",
    topIssue: "No tracked search phrase is active yet.",
    whyItMatters:
      "Without one tracked keyword and market, the owner cannot see a reliable visibility story.",
    nextAction: {
      title: "Set one primary tracked search phrase",
      whoShouldDoIt: "Owner or marketing lead",
      difficulty: "Easy",
      reason:
        "Choose the main service search and market so Digital Brain can measure local visibility clearly.",
    },
    evidence: [
      "No active keyword is saved yet.",
      "No active metro is saved yet.",
      "Digital Brain needs one tracked search phrase before it can explain visibility in owner language.",
    ],
  };
}

function buildVisibilitySummary(input: {
  keyword: string;
  metro: string;
  latestRank: number | null;
  bestRank: number | null;
  latestCapturedAt: string | null;
  previousRank: number | null;
}): VisibilitySummary {
  const {
    keyword,
    metro,
    latestRank,
    bestRank,
    latestCapturedAt,
    previousRank,
  } = input;

  if (latestRank === null) {
    return {
      hasActiveKeyword: true,
      keyword,
      metro,
      latestRank: null,
      bestRank,
      latestCapturedAt,
      previousRank,
      visibilityLabel: "Tracking is configured, but no visibility snapshot is saved yet",
      visibilityReadinessScore: 34,
      plainLanguageSummary:
        "Digital Brain knows what search to watch, but it does not have a saved visibility snapshot yet.",
      topIssue: "No saved rank snapshot is visible yet.",
      whyItMatters:
        "Without at least one saved position, the owner cannot tell whether the business is visible, improving, or stuck.",
      nextAction: {
        title: "Run or refresh rank discovery",
        whoShouldDoIt: "Owner or developer",
        difficulty: "Easy",
        reason:
          "One saved visibility snapshot gives Digital Brain the first real footing for owner-facing visibility guidance.",
      },
      evidence: [
        `Tracked keyword: ${keyword}.`,
        `Tracked market: ${metro}.`,
        "No saved rank position is available yet for this tracked search.",
      ],
    };
  }

  let visibilityReadinessScore = 25;
  let plainLanguageSummary =
    "The business is not visible enough yet for this tracked search.";
  let topIssue =
    "The business is still ranking too low for the owner to rely on this search.";
  let whyItMatters =
    "If the business is not showing strongly enough, owners have less confidence that Google is connecting the business to the right search.";
  let nextAction = {
    title: "Improve the ranking footing for this search",
    whoShouldDoIt: "Owner or marketing lead",
    difficulty: "Medium",
    reason:
      "The business needs stronger local visibility before this search becomes a dependable owner-facing win.",
  };

  if (latestRank <= 3) {
    visibilityReadinessScore = 88;
    plainLanguageSummary =
      "This business is already showing strong local visibility for the tracked search.";
    topIssue = "No major visibility issue is leading right now.";
    whyItMatters =
      "Strong ranking gives the owner a clearer signal that Google is connecting the business to the intended local search.";
    nextAction = {
      title: "Protect and reinforce this visibility",
      whoShouldDoIt: "Owner or marketing lead",
      difficulty: "Easy",
      reason:
        "When visibility is already strong, the next best move is to protect it and keep momentum steady.",
    };
  } else if (latestRank <= 10) {
    visibilityReadinessScore = 68;
    plainLanguageSummary =
      "The business is visible, but it still has room to move into a stronger local position.";
    topIssue = "The business is visible, but not yet in the strongest spot.";
    whyItMatters =
      "Page-one visibility is useful, but climbing higher usually makes the business easier to trust and choose.";
    nextAction = {
      title: "Push this search into a stronger position",
      whoShouldDoIt: "Owner or marketing lead",
      difficulty: "Medium",
      reason:
        "A move from visible to clearly leading can turn this tracked search into a much stronger owner-facing win.",
    };
  } else if (latestRank <= 20) {
    visibilityReadinessScore = 46;
    plainLanguageSummary =
      "Digital Brain is tracking the search, but visibility is weak right now.";
    topIssue = "The business is being tracked, but not showing strongly enough yet.";
    whyItMatters =
      "Weak visibility makes it harder for owners to connect local search effort to real customer discovery.";
    nextAction = {
      title: "Strengthen this search before treating it as a win",
      whoShouldDoIt: "Owner or marketing lead",
      difficulty: "Medium",
      reason:
        "This search needs better rank footing before it becomes a dependable growth signal.",
    };
  }

  const movementEvidence =
    previousRank === null
      ? "A prior comparison point is not available yet."
      : latestRank < previousRank
        ? `Latest saved rank improved from #${previousRank} to #${latestRank}.`
        : latestRank > previousRank
          ? `Latest saved rank slipped from #${previousRank} to #${latestRank}.`
          : `Latest saved rank held steady at #${latestRank}.`;

  return {
    hasActiveKeyword: true,
    keyword,
    metro,
    latestRank,
    bestRank,
    latestCapturedAt,
    previousRank,
    visibilityLabel: buildVisibilityLabel(latestRank),
    visibilityReadinessScore,
    plainLanguageSummary,
    topIssue,
    whyItMatters,
    nextAction,
    evidence: [
      `Tracked keyword: ${keyword}.`,
      `Tracked market: ${metro}.`,
      `Latest saved rank: #${latestRank}.`,
      bestRank !== null ? `Best saved rank so far: #${bestRank}.` : "No best-rank history is available yet.",
      movementEvidence,
      latestCapturedAt
        ? `Last visibility snapshot: ${formatDate(latestCapturedAt)}.`
        : "No saved visibility capture date is available yet.",
    ],
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const { data: keywords, error: keywordsError } = await supabase
      .from("project_rank_keywords")
      .select("keyword, metro, priority, is_active")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .returns<RankKeywordRow[]>();

    if (keywordsError) {
      throw new Error(`Failed to load active rank keyword: ${keywordsError.message}`);
    }

    const activeKeyword = keywords?.[0] ?? null;

    if (!activeKeyword) {
      return NextResponse.json({
        ok: true,
        projectId,
        summary: buildNoKeywordSummary(),
      });
    }

    const { data: snapshots, error: snapshotsError } = await supabase
      .from("gbp_rank_snapshots")
      .select("rank_position, captured_at")
      .eq("project_id", projectId)
      .eq("keyword", activeKeyword.keyword)
      .eq("metro", activeKeyword.metro)
      .order("captured_at", { ascending: false })
      .limit(20)
      .returns<RankSnapshotRow[]>();

    if (snapshotsError) {
      throw new Error(`Failed to load rank snapshots: ${snapshotsError.message}`);
    }

    const latestRank = snapshots?.[0]?.rank_position ?? null;
    const latestCapturedAt = snapshots?.[0]?.captured_at ?? null;
    const previousRank = snapshots?.[1]?.rank_position ?? null;
    const bestRank =
      snapshots && snapshots.length > 0
        ? Math.min(...snapshots.map((snapshot) => snapshot.rank_position))
        : null;

    return NextResponse.json({
      ok: true,
      projectId,
      summary: buildVisibilitySummary({
        keyword: activeKeyword.keyword,
        metro: activeKeyword.metro,
        latestRank,
        bestRank,
        latestCapturedAt,
        previousRank,
      }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load owner visibility summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
