"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerDashboardResponse = {
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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

function buildActionPlan(summary: RankSummaryResponse["summary"]) {
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

function buildTrendLine(series: RankSeriesPoint[], summary: RankSummaryResponse["summary"]): string {
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

function HeaderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">{value}</p>
    </div>
  );
}

function MetricStripItem({
  label,
  value,
  bg,
  tone,
}: {
  label: string;
  value: string;
  bg: string;
  tone: string;
}) {
  return (
    <div className="px-4 py-4" style={{ backgroundColor: bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function InlineTag({
  children,
  tone,
  bg,
}: {
  children: ReactNode;
  tone?: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        borderColor: tone ?? "var(--border)",
        color: tone ?? "var(--text-body)",
        backgroundColor: bg ?? "transparent",
      }}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p> : null}
    </div>
  );
}

export default function RankPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboardContext, setDashboardContext] = useState<OwnerDashboardResponse | null>(null);
  const [keywords, setKeywords] = useState<RankKeywordRow[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("");
  const [summary, setSummary] = useState<RankSummaryResponse["summary"]>(null);
  const [series, setSeries] = useState<RankSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingKeywordData, setLoadingKeywordData] = useState(false);
  const [runningDiscovery, setRunningDiscovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const selectedKeyword = useMemo(
    () => keywords.find((item) => item.id === selectedKeywordId) ?? null,
    [keywords, selectedKeywordId]
  );

  async function loadVisibilityData(
    resolvedProjectId: string,
    keywordRow: RankKeywordRow
  ) {
    const encodedKeyword = encodeURIComponent(keywordRow.keyword);
    const encodedMetro = encodeURIComponent(keywordRow.metro);

    const [summaryResponse, seriesResponse] = await Promise.all([
      fetch(
        `/api/projects/${resolvedProjectId}/rank-summary?keyword=${encodedKeyword}&metro=${encodedMetro}`,
        { cache: "no-store" }
      ),
      fetch(
        `/api/projects/${resolvedProjectId}/rank-series?keyword=${encodedKeyword}&metro=${encodedMetro}`,
        { cache: "no-store" }
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

        const [dashboardResponse, keywordsResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/rank-keywords`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson = (await dashboardResponse.json()) as OwnerDashboardResponse;
        const keywordsJson = (await keywordsResponse.json()) as RankKeywordsResponse;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(dashboardJson.error ?? "Failed to load owner dashboard context.");
        }

        if (!keywordsResponse.ok || !keywordsJson.ok) {
          throw new Error(keywordsJson.error ?? "Failed to load rank keywords.");
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
          err instanceof Error ? err.message : "Failed to load visibility page."
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
  }, [params]);

  async function handleKeywordChange(nextKeywordId: string) {
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
        err instanceof Error ? err.message : "Failed to load selected keyword."
      );
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

      if (selectedKeyword) {
        await loadVisibilityData(projectId, selectedKeyword);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run rank discovery."
      );
    } finally {
      setRunningDiscovery(false);
    }
  }

  const actionPlan = useMemo(() => buildActionPlan(summary), [summary]);
  const trendLine = useMemo(() => buildTrendLine(series, summary), [series, summary]);
  const recentSeries = useMemo(() => [...series].slice(-6).reverse(), [series]);
  const visibilityLabel = useMemo(
    () => buildVisibilityLabel(summary?.latestRank ?? null),
    [summary?.latestRank]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">Loading visibility page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Visibility center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See where you are showing up in Google.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page translates ranking data into a plain-language visibility read, a next
                move, and a simple recent checkpoint history for the selected keyword.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>Current visibility read</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {actionPlan.headline}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {actionPlan.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag tone="var(--brand-600)" bg="var(--brand-100)">
                  {visibilityLabel}
                </InlineTag>
                <InlineTag>
                  Keyword: {selectedKeyword?.keyword ?? "Not set"}
                </InlineTag>
                <InlineTag>
                  Metro: {selectedKeyword?.metro ?? "Not set"}
                </InlineTag>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta
              label="Business"
              value={dashboardContext?.projectDisplayName ?? "Not set"}
            />
            <HeaderMeta
              label="Domain"
              value={dashboardContext?.domainDisplayValue ?? "Not set"}
            />
            <HeaderMeta
              label="Location / Market"
              value={
                dashboardContext?.projectLocationLabel ??
                dashboardContext?.projectMetro ??
                "Not set"
              }
            />
            <HeaderMeta
              label="Scope"
              value={dashboardContext?.pageScopeLabel ?? "Not set"}
            />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(dashboardContext?.capturedAt ?? null)}
            />
          </div>
        </section>

        {error ? (
          <section className="border-b border-[var(--danger)] py-5">
            <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          </section>
        ) : null}

        {runMessage ? (
          <section className="border-b border-[var(--success)] py-5">
            <p className="text-sm font-medium text-[var(--success)]">{runMessage}</p>
          </section>
        ) : null}

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Visibility markers</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="Latest rank"
              value={summary?.latestRank?.toString() ?? "—"}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Best rank"
              value={summary?.bestRank?.toString() ?? "—"}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Page-one rate"
              value={summary ? formatPercent(summary.top10PresenceRate) : "—"}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Top-3 rate"
              value={summary ? formatPercent(summary.top3PresenceRate) : "—"}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to do next</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next visibility move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              This keeps the decision simple. It tells you the next practical goal for this keyword,
              based on where the business is currently showing up.
            </p>

            <div className="mt-6">
              {actionPlan.nextMoves.map((item, index) => (
                <article
                  key={item}
                  className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                    index === actionPlan.nextMoves.length - 1
                      ? ""
                      : "border-b border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center md:justify-center">
                    <div
                      className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor:
                          index === 0 ? "var(--brand-700)" : "var(--reference-soft)",
                        color: index === 0 ? "#ffffff" : "var(--text-strong)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                      {item}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                      {index === 0
                        ? "This is the first move most likely to improve visibility for the selected keyword."
                        : "This supports the main visibility goal and helps confirm whether the updates are working."}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Keyword focus</SectionLabel>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div>
                  <label
                    htmlFor="keyword-picker"
                    className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  >
                    Selected keyword
                  </label>
                  <select
                    id="keyword-picker"
                    value={selectedKeywordId}
                    onChange={(event) => {
                      void handleKeywordChange(event.target.value);
                    }}
                    disabled={loadingKeywordData || runningDiscovery || keywords.length === 0}
                    className="mt-2 w-full border border-[var(--border)] bg-white px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
                  >
                    {keywords.length === 0 ? (
                      <option value="">No keywords configured</option>
                    ) : null}

                    {keywords.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.keyword} — {item.metro}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={runRankDiscovery}
                  disabled={runningDiscovery || loadingKeywordData || !projectId}
                  className="px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--text-strong)",
                    border: "1px solid var(--text-strong)",
                  }}
                >
                  {runningDiscovery ? "Running..." : "Run rank discovery"}
                </button>

                <Link
                  href={`/projects/${projectId}/owner`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Back to owner page
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>Recent checkpoints</SectionLabel>

              <div className="mt-4">
                {recentSeries.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--text-body)]">
                    No visibility checkpoints are available yet for this keyword.
                  </p>
                ) : (
                  recentSeries.map((point, index) => (
                    <div
                      key={point.capturedAt}
                      className={`border-t border-[var(--border)] py-4 ${
                        index === 0 ? "border-t-0 pt-0" : ""
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {formatDate(point.capturedAt)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                        Best rank: {point.bestRank}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                        Worst rank: {point.worstRank} • Results captured: {point.resultCount}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>What this means</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Visibility label"
                  value={visibilityLabel}
                  helper="This is the plain-language read for the latest observed rank."
                />
                <DetailRow
                  label="Trend line"
                  value={trendLine}
                  helper="This compares the latest checkpoint to the one before it."
                />
                <DetailRow
                  label="Tracked days"
                  value={summary ? String(series.length) : "0"}
                  helper="This is how many capture days exist for the selected keyword."
                />
                <DetailRow
                  label="Local visibility score"
                  value={summary ? `${summary.localMarketVisibilityScore}` : "Not set"}
                  helper="Higher means the business is showing up more consistently across tracked results."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress and proof</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {summary ? formatPercent(summary.top20PresenceRate) : "—"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  top-20 presence rate for the selected keyword
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: summary ? formatPercent(summary.top20PresenceRate) : "0%",
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Latest captured"
                    value={formatDate(summary?.latestCapturedAt ?? null)}
                  />
                  <HeaderMeta
                    label="Snapshots"
                    value={summary ? String(summary.snapshotCount) : "0"}
                  />
                  <HeaderMeta
                    label="Found in latest"
                    value={
                      summary
                        ? summary.targetFoundInLatestSnapshot
                          ? "Yes"
                          : "No"
                        : "Not set"
                    }
                  />
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}