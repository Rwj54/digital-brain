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

export default function RankPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [metro, setMetro] = useState<string>("");
  const [keywords, setKeywords] = useState<RankKeywordRow[]>([]);

  const [summary, setSummary] = useState<RankSummaryResponse["summary"]>(null);
  const [series, setSeries] = useState<RankSeriesPoint[]>([]);
  const [history, setHistory] = useState<RankHistoryRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

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

        const rankKeyword = configJson.project.rank_keyword ?? "";
        const rankMetro = configJson.project.rank_metro ?? "";

        if (!rankKeyword || !rankMetro) {
          throw new Error("Project rank config is incomplete.");
        }

        if (!isMounted) {
          return;
        }

        setKeyword(rankKeyword);
        setMetro(rankMetro);
        setKeywords(keywordsJson.keywords);

        const encodedKeyword = encodeURIComponent(rankKeyword);
        const encodedMetro = encodeURIComponent(rankMetro);

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

        if (!isMounted) {
          return;
        }

        setSummary(summaryJson.summary);
        setSeries(seriesJson.series);
        setHistory(historyJson.snapshots);
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

      const encodedKeyword = encodeURIComponent(keyword);
      const encodedMetro = encodeURIComponent(metro);

      const [summaryResponse, seriesResponse, historyResponse] = await Promise.all([
        fetch(
          `/api/projects/${projectId}/rank-summary?keyword=${encodedKeyword}&metro=${encodedMetro}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/projects/${projectId}/rank-series?keyword=${encodedKeyword}&metro=${encodedMetro}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/projects/${projectId}/rank-history?keyword=${encodedKeyword}&metro=${encodedMetro}&limit=25`,
          { cache: "no-store" }
        ),
      ]);

      const summaryJson = (await summaryResponse.json()) as RankSummaryResponse;
      const seriesJson = (await seriesResponse.json()) as RankSeriesResponse;
      const historyJson = (await historyResponse.json()) as RankHistoryResponse;

      if (summaryResponse.ok && summaryJson.ok) {
        setSummary(summaryJson.summary);
      }

      if (seriesResponse.ok && seriesJson.ok) {
        setSeries(seriesJson.series);
      }

      if (historyResponse.ok && historyJson.ok) {
        setHistory(historyJson.snapshots);
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
      <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-neutral-400">Loading rank intelligence…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Digital Brain
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Rank Intelligence</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Keyword: <span className="text-neutral-200">{keyword || "—"}</span>{" "}
              • Metro: <span className="text-neutral-200">{metro || "—"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Back to Authority
            </Link>
            <button
              type="button"
              onClick={runRankDiscovery}
              disabled={runningDiscovery}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningDiscovery ? "Running…" : "Run Rank Discovery"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {runMessage ? (
          <div className="rounded-2xl border border-emerald-900 bg-emerald-950/40 p-4 text-sm text-emerald-200">
            {runMessage}
          </div>
        ) : null}

        {!summary?.targetFoundInLatestSnapshot ? (
          <div className="rounded-2xl border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-200">
            Tracked business not found in the latest top-20 snapshot for this keyword
            and search origin.
          </div>
        ) : null}

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6">
          <div>
            <h2 className="text-lg font-semibold">Tracked Keywords</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Active keywords currently configured for this project.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {keywords.length === 0 ? (
              <div className="text-sm text-neutral-500">No active rank keywords found.</div>
            ) : (
              keywords.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <p className="text-sm font-medium text-neutral-200">{item.keyword}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.metro} • Priority {item.priority}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Latest Rank
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {formatRankValue(summary?.latestRank)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Best Rank
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {formatRankValue(summary?.bestRank)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Worst Rank
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {formatRankValue(summary?.worstRank)}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Latest Day Results
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {summary?.latestDayCount ?? "—"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Rank Trend</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Daily best-rank series for this keyword and metro.
              </p>
            </div>
            <div className="text-right text-xs text-neutral-500">
              <p>Points: {series.length}</p>
              <p>Latest capture: {summary?.latestCapturedAt ?? "—"}</p>
            </div>
          </div>

          <div className="mt-6">
            {series.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-8 text-sm text-neutral-500">
                No rank series data yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <svg viewBox="0 0 520 180" className="h-56 w-full">
                  <polyline
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    points={sparklinePoints}
                  />
                </svg>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span>{series[0]?.capturedAt ?? "—"}</span>
                  <span>{series[series.length - 1]?.capturedAt ?? "—"}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-6">
          <div>
            <h2 className="text-lg font-semibold">Current Top Market Results</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Latest captured local pack results for this search origin.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-neutral-500">
                <tr className="border-b border-neutral-800">
                  <th className="px-3 py-3 font-medium">Rank</th>
                  <th className="px-3 py-3 font-medium">Business</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Rating</th>
                  <th className="px-3 py-3 font-medium">Reviews</th>
                  <th className="px-3 py-3 font-medium">Address</th>
                </tr>
              </thead>
              <tbody>
                {latestMarketRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-neutral-500">
                      No market results found.
                    </td>
                  </tr>
                ) : (
                  latestMarketRows.map((row) => (
                    <tr key={row.id} className="border-b border-neutral-900">
                      <td className="px-3 py-3 text-neutral-200">
                        {row.rank_position}
                      </td>
                      <td className="px-3 py-3 text-neutral-200">
                        {row.raw_result?.title ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-400">
                        {row.raw_result?.category ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-neutral-400">
                        {formatRating(row.raw_result?.rating)}
                      </td>
                      <td className="px-3 py-3 text-neutral-400">
                        {formatReviews(row.raw_result?.rating)}
                      </td>
                      <td className="px-3 py-3 text-neutral-400">
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