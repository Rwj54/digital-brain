"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type OwnerDashboardResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  projectDisplayName: string | null;
  projectCategory: string | null;
  projectMetro: string | null;
  domainDisplayValue: string | null;
  projectLocationLabel: string | null;
  pageScopeLabel: string;
  capturedAt: string;
};

export type RankKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
  created_at: string;
};

export type RankKeywordsResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  count: number;
  keywords: RankKeywordRow[];
};

export type RankSummary = {
  latestCapturedAt: string;
  latestRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  snapshotCount: number;
  latestDayCount: number;
  targetFoundInLatestSnapshot: boolean;
  top3PresenceCount: number;
  top10PresenceCount: number;
  top20PresenceCount: number;
  top3PresenceRate: number;
  top10PresenceRate: number;
  top20PresenceRate: number;
  localMarketVisibilityScore: number;
};

export type RankSummaryResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  keyword: string;
  metro: string;
  summary: RankSummary | null;
};

export type RankSeriesPoint = {
  capturedAt: string;
  bestRank: number;
  worstRank: number;
  resultCount: number;
};

export type RankSeriesResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  keyword: string;
  metro: string;
  pointCount: number;
  series: RankSeriesPoint[];
};

export type RankActionPlan = {
  headline: string;
  reason: string;
  nextMoves: string[];
};

export type UseProjectRankPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  keywords: RankKeywordRow[];
  selectedKeywordId: string;
  summary: RankSummary | null;
  series: RankSeriesPoint[];
  loading: boolean;
  loadingKeywordData: boolean;
  runningDiscovery: boolean;
  error: string | null;
  runMessage: string | null;
  selectedKeyword: RankKeywordRow | null;
  actionPlan: RankActionPlan;
  trendLine: string;
  recentSeries: RankSeriesPoint[];
  visibilityLabel: string;
  handleKeywordChange: (nextKeywordId: string) => Promise<void>;
  runRankDiscovery: () => Promise<void>;
};

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

function buildActionPlan(summary: RankSummary | null): RankActionPlan {
  if (!summary || summary.latestRank === null) {
    return {
      headline: "Get your first visibility checkpoint",
      reason:
        "Digital Brain does not yet have enough rank data to show where this business is appearing for the selected keyword.",
      nextMoves: [
        "Run a fresh rank discovery for this keyword and market.",
        "Confirm the selected keyword matches what customers actually search.",
        "Check that the business profile and website clearly support this service and location.",
      ],
    };
  }

  if (!summary.targetFoundInLatestSnapshot) {
    return {
      headline: "Break into the tracked market results",
      reason:
        "The business was not found in the latest tracked top-20 results, so the first goal is to get visible at all for this keyword and market.",
      nextMoves: [
        "Confirm the selected keyword is realistic for this location.",
        "Strengthen the business profile and page signals tied to this service.",
        "Run another visibility check after the next round of updates.",
      ],
    };
  }

  if (summary.latestRank <= 3) {
    return {
      headline: "Protect a strong position",
      reason:
        "This keyword is already performing well. The goal now is to hold the position and prevent competitors from passing you.",
      nextMoves: [
        "Keep profile details, photos, and review activity current.",
        "Watch competitors for sudden review or rank movement.",
        "Keep the related website page accurate and locally relevant.",
      ],
    };
  }

  if (summary.latestRank <= 10) {
    return {
      headline: "Push this keyword into the top 3",
      reason:
        "The business is already visible on page one for this keyword. The next win is breaking into the highest-visibility positions.",
      nextMoves: [
        "Improve the page and profile signals most tied to this service.",
        "Strengthen recent review activity and business-profile freshness.",
        "Re-check movement after the next update cycle.",
      ],
    };
  }

  if (summary.latestRank <= 20) {
    return {
      headline: "Move this keyword onto page one",
      reason:
        "The business is visible, but it is still too low to create strong local visibility. The next goal is to get this keyword into the top 10.",
      nextMoves: [
        "Tighten service and location relevance on the website and profile.",
        "Focus on credibility signals such as reviews and completeness.",
        "Keep tracking to confirm whether the updates improve position.",
      ],
    };
  }

  return {
    headline: "Build real visibility for this keyword",
    reason:
      "The business is currently too far down the results to create reliable visibility. This keyword needs stronger relevance and trust signals.",
    nextMoves: [
      "Re-check whether this is the right target keyword for the market.",
      "Improve website and profile alignment around this service and location.",
      "Track again after the next round of business-profile and page updates.",
    ],
  };
}

function buildTrendLine(
  series: RankSeriesPoint[],
  summary: RankSummary | null,
): string {
  if (!summary) {
    return "No trend data available yet.";
  }

  if (series.length < 2) {
    return "Only one visibility checkpoint is available so far.";
  }

  const latest = series[series.length - 1];
  const previous = series[series.length - 2];

  if (latest.bestRank < previous.bestRank) {
    return `Visibility is improving. Best observed rank moved from ${previous.bestRank} to ${latest.bestRank}.`;
  }

  if (latest.bestRank > previous.bestRank) {
    return `Visibility slipped. Best observed rank moved from ${previous.bestRank} to ${latest.bestRank}.`;
  }

  return `Visibility is steady. Best observed rank remained at ${latest.bestRank}.`;
}

export function useProjectRankPageState(
  params: Promise<{ projectId: string }>,
): UseProjectRankPageStateResult {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [keywords, setKeywords] = useState<RankKeywordRow[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [summary, setSummary] = useState<RankSummary | null>(null);
  const [series, setSeries] = useState<RankSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKeywordData, setLoadingKeywordData] = useState(false);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const selectedKeyword = useMemo(
    () => keywords.find((item) => item.id === selectedKeywordId) ?? null,
    [keywords, selectedKeywordId],
  );

  const loadVisibilityData = useCallback(
    async (resolvedProjectId: string, keywordRow: RankKeywordRow) => {
      const encodedKeyword = encodeURIComponent(keywordRow.keyword);
      const encodedMetro = encodeURIComponent(keywordRow.metro);

      const [summaryResponse, seriesResponse] = await Promise.all([
        fetch(
          `/api/projects/${resolvedProjectId}/rank-summary?keyword=${encodedKeyword}&metro=${encodedMetro}`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/projects/${resolvedProjectId}/rank-series?keyword=${encodedKeyword}&metro=${encodedMetro}`,
          { cache: "no-store" },
        ),
      ]);

      const summaryJson = (await summaryResponse.json()) as RankSummaryResponse;
      const seriesJson = (await seriesResponse.json()) as RankSeriesResponse;

      if (!summaryResponse.ok || !summaryJson.ok) {
        throw new Error(summaryJson.error ?? "Failed to load rank summary.");
      }

      if (!seriesResponse.ok || !seriesJson.ok) {
        throw new Error(seriesJson.error ?? "Failed to load rank trend.");
      }

      setSummary(summaryJson.summary);
      setSeries(seriesJson.series);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);

        const resolvedParams = await params;
        const resolvedProjectId = resolvedParams.projectId;

        if (!resolvedProjectId) {
          throw new Error("Missing projectId.");
        }

        if (!isMounted) {
          return;
        }

        setProjectId(resolvedProjectId);

        const [dashboardResponse, keywordsResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/rank-keywords`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const keywordsJson =
          (await keywordsResponse.json()) as RankKeywordsResponse;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardJson.error ?? "Failed to load owner dashboard context.",
          );
        }

        if (!keywordsResponse.ok || !keywordsJson.ok) {
          throw new Error(
            keywordsJson.error ?? "Failed to load rank keywords.",
          );
        }

        if (!isMounted) {
          return;
        }

        setDashboardContext(dashboardJson);
        setKeywords(keywordsJson.keywords);

        const initialKeyword =
          keywordsJson.keywords.find((item) => item.is_active) ??
          keywordsJson.keywords[0] ??
          null;

        if (!initialKeyword) {
          setSelectedKeywordId("");
          setSummary(null);
          setSeries([]);
          return;
        }

        setSelectedKeywordId(initialKeyword.id);
        await loadVisibilityData(resolvedProjectId, initialKeyword);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load visibility page.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [loadVisibilityData, params]);

  const handleKeywordChange = useCallback(
    async (nextKeywordId: string) => {
      if (!projectId) {
        return;
      }

      const keywordRow = keywords.find((item) => item.id === nextKeywordId);

      if (!keywordRow) {
        return;
      }

      try {
        setLoadingKeywordData(true);
        setError(null);
        setRunMessage(null);
        setSelectedKeywordId(keywordRow.id);
        await loadVisibilityData(projectId, keywordRow);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load selected keyword.",
        );
      } finally {
        setLoadingKeywordData(false);
      }
    },
    [keywords, loadVisibilityData, projectId],
  );

  const runRankDiscovery = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      setRunningDiscovery(true);
      setRunMessage(null);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/rank-discovery`, {
        method: "POST",
      });

      const json = (await response.json()) as {
        ok: boolean;
        error?: string;
        storedCount?: number;
      };

      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to run rank discovery.");
      }

      setRunMessage(
        `Rank discovery completed. Stored ${json.storedCount ?? 0} snapshots.`,
      );

      if (selectedKeyword) {
        await loadVisibilityData(projectId, selectedKeyword);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run rank discovery.",
      );
    } finally {
      setRunningDiscovery(false);
    }
  }, [loadVisibilityData, projectId, selectedKeyword]);

  const actionPlan = useMemo(() => buildActionPlan(summary), [summary]);
  const trendLine = useMemo(() => buildTrendLine(series, summary), [series, summary]);
  const recentSeries = useMemo(() => [...series].slice(-6).reverse(), [series]);
  const visibilityLabel = useMemo(
    () => buildVisibilityLabel(summary?.latestRank ?? null),
    [summary?.latestRank],
  );

  return {
    projectId,
    dashboardContext,
    keywords,
    selectedKeywordId,
    summary,
    series,
    loading,
    loadingKeywordData,
    runningDiscovery,
    error,
    runMessage,
    selectedKeyword,
    actionPlan,
    trendLine,
    recentSeries,
    visibilityLabel,
    handleKeywordChange,
    runRankDiscovery,
  };
}