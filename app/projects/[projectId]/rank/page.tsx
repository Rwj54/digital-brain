"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RankTrendChart from "@/components/rank/RankTrendChart";
import RankMarketResultsTable from "@/components/rank/RankMarketResultsTable";
import RankKeywordPicker from "@/components/rank/RankKeywordPicker";
import RankSummaryStats from "@/components/rank/RankSummaryStats";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type RankKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
  created_at: string;
};

type RankKeywordsResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  count: number;
  keywords: RankKeywordRow[];
};

type RankSummaryResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  keyword: string;
  metro: string;
  summary: {
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
  } | null;
};

type RankSeriesPoint = {
  capturedAt: string;
  bestRank: number;
  worstRank: number;
  resultCount: number;
};

type RankSeriesResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  keyword: string;
  metro: string;
  pointCount: number;
  series: RankSeriesPoint[];
};

type RankHistoryRow = {
  id: string;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
  raw_result: {
    title?: string | null;
    category?: string | null;
    address?: string | null;
    rating?:
      | {
          value?: number | null;
          votes_count?: number | null;
        }
      | number
      | null;
    phone?: string | null;
  } | null;
};

type RankHistoryResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  keyword: string;
  metro: string;
  count: number;
  snapshots: RankHistoryRow[];
};

type RankConfigResponse = {
  ok: boolean;
  error?: string;
  project: {
    id: string;
    rank_keyword: string | null;
    rank_metro: string | null;
    rank_lat: number | null;
    rank_lng: number | null;
    keyword_id?: string | null;
  } | null;
};

function getUniqueCaptureDayCount(series: RankSeriesPoint[], latestCapturedAt?: string | null) {
  const uniqueDates = new Set<string>();

  for (const point of series) {
    if (point.capturedAt) {
      uniqueDates.add(point.capturedAt);
    }
  }

  if (latestCapturedAt) {
    uniqueDates.add(latestCapturedAt);
  }

  return uniqueDates.size;
}

export default function RankPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [projectLat, setProjectLat] = useState<number | null>(null);
  const [projectLng, setProjectLng] = useState<number | null>(null);

  const [keywords, setKeywords] = useState<RankKeywordRow[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [metro, setMetro] = useState<string>("");

  const [summary, setSummary] = useState<RankSummaryResponse["summary"]>(null);
  const [series, setSeries] = useState<RankSeriesPoint[]>([]);
  const [history, setHistory] = useState<RankHistoryRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingKeywordData, setLoadingKeywordData] = useState(false);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  async function loadKeywordData(
    resolvedProjectId: string,
    nextKeyword: string,
    nextMetro: string
  ) {
    const encodedKeyword = encodeURIComponent(nextKeyword);
    const encodedMetro = encodeURIComponent(nextMetro);

    const [summaryResponse, seriesResponse, historyResponse] = await Promise.all([
      fetch(
        `/api/projects/${resolvedProjectId}/rank-summary?keyword=${encodedKeyword}&metro=${encodedMetro}`,
        { cache: "no-store" }
      ),
      fetch(
        `/api/projects/${resolvedProjectId}/rank-series?keyword=${encodedKeyword}&metro=${encodedMetro}`,
        { cache: "no-store" }
      ),
      fetch(
        `/api/projects/${resolvedProjectId}/rank-history?keyword=${encodedKeyword}&metro=${encodedMetro}&limit=25`,
        { cache: "no-store" }
      ),
    ]);

    const summaryJson = (await summaryResponse.json()) as RankSummaryResponse;
    const seriesJson = (await seriesResponse.json()) as RankSeriesResponse;
    const historyJson = (await historyResponse.json()) as RankHistoryResponse;

    if (!summaryResponse.ok || !summaryJson.ok) {
      throw new Error(summaryJson.error ?? "Failed to load rank summary.");
    }

    if (!seriesResponse.ok || !seriesJson.ok) {
      throw new Error(seriesJson.error ?? "Failed to load rank series.");
    }

    if (!historyResponse.ok || !historyJson.ok) {
      throw new Error(historyJson.error ?? "Failed to load rank history.");
    }

    setSummary(summaryJson.summary);
    setSeries(seriesJson.series);
    setHistory(historyJson.snapshots);
  }

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

        const [configResponse, keywordsResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/rank-config`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/rank-keywords`, {
            cache: "no-store",
          }),
        ]);

        const configJson = (await configResponse.json()) as RankConfigResponse;
        const keywordsJson = (await keywordsResponse.json()) as RankKeywordsResponse;

        if (!configResponse.ok || !configJson.ok || !configJson.project) {
          throw new Error(configJson.error ?? "Failed to load rank config.");
        }

        if (!keywordsResponse.ok || !keywordsJson.ok) {
          throw new Error(keywordsJson.error ?? "Failed to load rank keywords.");
        }

        if (!isMounted) {
          return;
        }

        setProjectLat(configJson.project.rank_lat);
        setProjectLng(configJson.project.rank_lng);
        setKeywords(keywordsJson.keywords);

        const initialKeywordRow =
          keywordsJson.keywords.find(
            (item) => item.id === configJson.project?.keyword_id
          ) ??
          keywordsJson.keywords[0] ??
          null;

        if (!initialKeywordRow) {
          throw new Error("No active rank keywords found for this project.");
        }

        setSelectedKeywordId(initialKeywordRow.id);
        setKeyword(initialKeywordRow.keyword);
        setMetro(initialKeywordRow.metro);

        await loadKeywordData(
          resolvedProjectId,
          initialKeywordRow.keyword,
          initialKeywordRow.metro
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load rank page.");
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
  }, [params]);

  async function handleKeywordSelect(keywordRow: RankKeywordRow) {
    if (!projectId || selectedKeywordId === keywordRow.id) {
      return;
    }

    try {
      setLoadingKeywordData(true);
      setError(null);
      setRunMessage(null);

      setSelectedKeywordId(keywordRow.id);
      setKeyword(keywordRow.keyword);
      setMetro(keywordRow.metro);

      await loadKeywordData(projectId, keywordRow.keyword, keywordRow.metro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load selected keyword.");
    } finally {
      setLoadingKeywordData(false);
    }
  }

  async function runRankDiscovery() {
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
        `Rank discovery completed. Stored ${json.storedCount ?? 0} snapshots.`
      );

      if (keyword && metro) {
        await loadKeywordData(projectId, keyword, metro);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run rank discovery.");
    } finally {
      setRunningDiscovery(false);
    }
  }

  const latestMarketRows = useMemo(() => {
    if (!summary?.latestCapturedAt) {
      return [];
    }

    return history.filter((row) => row.captured_at === summary.latestCapturedAt);
  }, [history, summary]);

  const captureDayCount = useMemo(
    () => getUniqueCaptureDayCount(series, summary?.latestCapturedAt),
    [series, summary?.latestCapturedAt]
  );

  const captureDayHelper =
    captureDayCount === 1 ? "1 capture day" : `${captureDayCount} capture days`;

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-neutral-700 dark:text-neutral-400">
            Loading rank intelligence…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-500">
              Digital Brain
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950 dark:text-white">
              Rank Intelligence
            </h1>
            <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-400">
              Keyword:{" "}
              <span className="font-medium text-neutral-950 dark:text-neutral-200">
                {keyword || "—"}
              </span>{" "}
              • Metro:{" "}
              <span className="font-medium text-neutral-950 dark:text-neutral-200">
                {metro || "—"}
              </span>
            </p>
            <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-500">
              Search origin:{" "}
              {projectLat != null && projectLng != null
                ? `${projectLat}, ${projectLng}`
                : "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Back to Authority
            </Link>
            <button
              type="button"
              onClick={runRankDiscovery}
              disabled={runningDiscovery || loadingKeywordData}
              className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {runningDiscovery ? "Running…" : "Run Rank Discovery"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {runMessage ? (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            {runMessage}
          </div>
        ) : null}

        {!summary?.targetFoundInLatestSnapshot ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Tracked business not found in the latest top-20 snapshot for this keyword
            and search origin.
          </div>
        ) : null}

        <RankKeywordPicker
          keywords={keywords}
          selectedKeywordId={selectedKeywordId}
          loading={loadingKeywordData}
          onSelect={(keywordRow) => {
            void handleKeywordSelect(keywordRow);
          }}
        />

        <RankSummaryStats
          summary={summary}
          captureDayHelper={captureDayHelper}
          loading={loadingKeywordData}
        />

        <RankTrendChart
          series={series}
          latestCapturedAt={summary?.latestCapturedAt ?? null}
          loading={loadingKeywordData}
        />

        <RankMarketResultsTable
          rows={latestMarketRows}
          loading={loadingKeywordData}
        />
      </div>
    </main>
  );
}