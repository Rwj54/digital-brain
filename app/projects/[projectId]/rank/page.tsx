"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

function formatRating(
  rating:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null
    | undefined
) {
  if (typeof rating === "number") {
    return rating.toFixed(1);
  }

  if (rating && typeof rating.value === "number") {
    return rating.value.toFixed(1);
  }

  return "—";
}

function formatReviews(
  rating:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null
    | undefined
) {
  if (rating && typeof rating === "object" && typeof rating.votes_count === "number") {
    return rating.votes_count;
  }

  return "—";
}

function formatRankValue(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  if (value >= 21) {
    return ">20";
  }

  return String(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

function formatVisibilityScore(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return value.toFixed(1);
}

function buildSparklinePoints(series: RankSeriesPoint[]) {
  if (series.length === 0) {
    return "";
  }

  const width = 520;
  const height = 180;
  const padding = 20;

  const bestRanks = series.map((point) => point.bestRank);
  const minRank = Math.min(...bestRanks);
  const maxRank = Math.max(...bestRanks);
  const rankRange = Math.max(maxRank - minRank, 1);

  return bestRanks
    .map((rank, index) => {
      const x =
        series.length === 1
          ? width / 2
          : padding + (index * (width - padding * 2)) / (series.length - 1);

      const normalized = (rank - minRank) / rankRange;
      const y = padding + normalized * (height - padding * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

function StatCard({
  label,
  value,
  helper,
  loading,
}: {
  label: string;
  value: string | number;
  helper?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
        {loading ? "…" : value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-400">{helper}</p>
      ) : null}
    </div>
  );
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

  const sparklinePoints = useMemo(() => buildSparklinePoints(series), [series]);

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

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Tracked Keywords
            </h2>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
              Select a keyword to view its rank intelligence.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {keywords.length === 0 ? (
              <div className="text-sm text-neutral-700 dark:text-neutral-500">
                No active rank keywords found.
              </div>
            ) : (
              keywords.map((item) => {
                const isSelected = item.id === selectedKeywordId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleKeywordSelect(item)}
                    disabled={loadingKeywordData}
                    className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-neutral-300 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <p className="text-sm font-medium">{item.keyword}</p>
                    <p
                      className={`mt-1 text-xs ${
                        isSelected
                          ? "text-neutral-200 dark:text-neutral-700"
                          : "text-neutral-700 dark:text-neutral-500"
                      }`}
                    >
                      {item.metro} • Priority {item.priority}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Latest Rank"
            value={formatRankValue(summary?.latestRank)}
            loading={loadingKeywordData}
          />
          <StatCard
            label="Best Rank"
            value={formatRankValue(summary?.bestRank)}
            loading={loadingKeywordData}
          />
          <StatCard
            label="Worst Rank"
            value={formatRankValue(summary?.worstRank)}
            loading={loadingKeywordData}
          />
          <StatCard
            label="Latest Day Results"
            value={summary?.latestDayCount ?? "—"}
            loading={loadingKeywordData}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Top 3 Presence"
            value={formatPercent(summary?.top3PresenceRate)}
            helper={
              summary
                ? `${summary.top3PresenceCount} of ${summary.snapshotCount} capture days`
                : undefined
            }
            loading={loadingKeywordData}
          />
          <StatCard
            label="Top 10 Presence"
            value={formatPercent(summary?.top10PresenceRate)}
            helper={
              summary
                ? `${summary.top10PresenceCount} of ${summary.snapshotCount} capture days`
                : undefined
            }
            loading={loadingKeywordData}
          />
          <StatCard
            label="Top 20 Presence"
            value={formatPercent(summary?.top20PresenceRate)}
            helper={
              summary
                ? `${summary.top20PresenceCount} of ${summary.snapshotCount} capture days`
                : undefined
            }
            loading={loadingKeywordData}
          />
          <StatCard
            label="Local Market Visibility"
            value={formatVisibilityScore(summary?.localMarketVisibilityScore)}
            helper="Weighted visibility score"
            loading={loadingKeywordData}
          />
        </section>

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Rank Trend
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
                Daily best-rank series for this keyword and metro.
              </p>
            </div>
            <div className="text-right text-xs text-neutral-700 dark:text-neutral-500">
              <p>Points: {series.length}</p>
              <p>Latest capture: {summary?.latestCapturedAt ?? "—"}</p>
            </div>
          </div>

          <div className="mt-6">
            {loadingKeywordData ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
                Loading rank series…
              </div>
            ) : series.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
                No rank series data yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <svg viewBox="0 0 520 180" className="h-56 w-full">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-neutral-950 dark:text-white"
                    points={sparklinePoints}
                  />
                </svg>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-500">
                  <span>{series[0]?.capturedAt ?? "—"}</span>
                  <span>{series[series.length - 1]?.capturedAt ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
              Current Top Market Results
            </h2>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
              Latest captured local pack results for this search origin.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-neutral-800 dark:text-neutral-500">
                <tr className="border-b border-neutral-300 dark:border-neutral-800">
                  <th className="px-3 py-3 font-medium">Rank</th>
                  <th className="px-3 py-3 font-medium">Business</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Rating</th>
                  <th className="px-3 py-3 font-medium">Reviews</th>
                  <th className="px-3 py-3 font-medium">Address</th>
                </tr>
              </thead>
              <tbody>
                {loadingKeywordData ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-neutral-700 dark:text-neutral-500">
                      Loading market results…
                    </td>
                  </tr>
                ) : latestMarketRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-neutral-700 dark:text-neutral-500">
                      No market results found.
                    </td>
                  </tr>
                ) : (
                  latestMarketRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-neutral-200 dark:border-neutral-900"
                    >
                      <td className="px-3 py-3 text-neutral-950 dark:text-neutral-200">
                        {row.rank_position}
                      </td>
                      <td className="px-3 py-3 text-neutral-950 dark:text-neutral-200">
                        {row.raw_result?.title ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {row.raw_result?.category ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {formatRating(row.raw_result?.rating)}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {formatReviews(row.raw_result?.rating)}
                      </td>
                      <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                        {row.raw_result?.address ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}