"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectRankPageState } from "@/lib/rank/useProjectRankPageState";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
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
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">
        {value}
      </p>
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
      <p
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ color: tone }}
      >
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
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export default function RankPage({ params }: PageProps) {
  const {
    projectId,
    dashboardContext,
    keywords,
    selectedKeywordId,
    summary,
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
  } = useProjectRankPageState(params);

  const snapshotValue = formatDate(
    summary?.latestCapturedAt ?? dashboardContext?.capturedAt ?? null,
  );

  const rankHeadlineBusinessName =
    dashboardContext?.projectDisplayName ?? "this business";

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading rank read...
          </p>
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
                See where {rankHeadlineBusinessName} is showing up in Google.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page turns ranking data into a plain-language visibility
                read, a clear next goal, and a simple checkpoint history for the
                selected keyword.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
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
                <InlineTag>Keyword: {selectedKeyword?.keyword ?? "Not set"}</InlineTag>
                <InlineTag>Metro: {selectedKeyword?.metro ?? "Not set"}</InlineTag>
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
            <HeaderMeta label="Snapshot" value={snapshotValue} />
          </div>
        </section>

        {error ? (
          <section className="border-b border-[var(--danger)] py-5">
            <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          </section>
        ) : null}

        {runMessage ? (
          <section className="border-b border-[var(--success)] py-5">
            <p className="text-sm font-medium text-[var(--success)]">
              {runMessage}
            </p>
          </section>
        ) : null}

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Current rank summary</SectionLabel>

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
            <SectionLabel>Your next moves</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next visibility move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              This keeps the decision simple. It shows the next practical goal
              for this keyword based on where the business is currently showing
              up in Google.
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
                          index === 0
                            ? "var(--brand-700)"
                            : "var(--reference-soft)",
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
              <SectionLabel>Keyword and refresh</SectionLabel>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div>
                  <label
                    htmlFor="keyword-picker"
                    className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  >
                    Active keyword
                  </label>
                  <select
                    id="keyword-picker"
                    value={selectedKeywordId}
                    onChange={(event) => {
                      void handleKeywordChange(event.target.value);
                    }}
                    disabled={
                      loadingKeywordData ||
                      runningDiscovery ||
                      keywords.length === 0
                    }
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
                  onClick={() => {
                    void runRankDiscovery();
                  }}
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
              <SectionLabel>Recent rank updates</SectionLabel>

              <div className="mt-4">
                {recentSeries.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--text-body)]">
                    No rank updates are available yet for this keyword.
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
                        Worst rank: {point.worstRank} • Results captured:{" "}
                        {point.resultCount}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>What this tells you</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Visibility label"
                  value={visibilityLabel}
                  helper="This is the current read for the latest observed rank."
                />
                <DetailRow
                  label="Trend line"
                  value={trendLine}
                  helper="This compares the latest rank update to the one before it."
                />
                <DetailRow
                  label="Tracked days"
                  value={summary ? String(recentSeries.length > 0 ? summary.snapshotCount : 0) : "0"}
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
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {summary ? formatPercent(summary.top20PresenceRate) : "—"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  top-20 presence rate right now
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
                    label="Last update"
                    value={formatDate(summary?.latestCapturedAt ?? null)}
                  />
                  <HeaderMeta
                    label="Tracked days"
                    value={summary ? String(summary.snapshotCount) : "0"}
                  />
                  <HeaderMeta
                    label="Found last time"
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