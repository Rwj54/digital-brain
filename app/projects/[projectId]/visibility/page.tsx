"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectVisibilityPageState } from "@/lib/visibility/useProjectVisibilityPageState";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function formatDate(value: string | null) {
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

function formatRank(value: number | null | undefined) {
  return typeof value === "number" ? `#${value}` : "Not set";
}

function formatRankMovement(
  latestRank: number | null | undefined,
  previousRank: number | null | undefined,
) {
  if (typeof latestRank !== "number") {
    return "Not set";
  }

  if (typeof previousRank !== "number") {
    return "First snapshot";
  }

  if (latestRank < previousRank) {
    const gain = previousRank - latestRank;
    return `Up ${gain}`;
  }

  if (latestRank > previousRank) {
    const loss = latestRank - previousRank;
    return `Down ${loss}`;
  }

  return "No change";
}

function buildRankTrendSummary(input: {
  latestRank: number | null | undefined;
  previousRank: number | null | undefined;
  keyword: string;
  metro: string;
  businessName: string;
}) {
  const { latestRank, previousRank, keyword, metro, businessName } = input;
  const searchLabel = `${keyword} in ${metro}`;

  if (typeof latestRank !== "number") {
    return `No saved ranking trend is available yet for ${searchLabel}.`;
  }

  if (typeof previousRank !== "number") {
    return `This is the first saved visibility snapshot for ${searchLabel}.`;
  }

  if (latestRank < previousRank) {
    const gain = previousRank - latestRank;
    return `${businessName} moved up ${gain} spot${gain === 1 ? "" : "s"} since the last saved snapshot for ${searchLabel}.`;
  }

  if (latestRank > previousRank) {
    const loss = latestRank - previousRank;
    return `${businessName} moved down ${loss} spot${loss === 1 ? "" : "s"} since the last saved snapshot for ${searchLabel}.`;
  }

  return `${businessName} is holding the same saved position for ${searchLabel}.`;
}

function buildMarketFootingSummary(input: {
  latestRank: number | null | undefined;
  bestRank: number | null | undefined;
  keyword: string;
  metro: string;
  visibilityRead: string;
  businessName: string;
}) {
  const { latestRank, bestRank, keyword, metro, visibilityRead, businessName } = input;
  const searchLabel = `${keyword} in ${metro}`;

  if (typeof latestRank !== "number") {
    return `Digital Brain does not have enough saved rank data yet to describe ${businessName}'s current footing for ${searchLabel}.`;
  }

  if (latestRank <= 3) {
    return typeof bestRank === "number"
      ? `${businessName} currently has strong saved visibility for ${searchLabel}, with a latest rank of #${latestRank} and a best saved rank of #${bestRank}.`
      : `${businessName} currently has strong saved visibility for ${searchLabel}, with a latest rank of #${latestRank}.`;
  }

  if (latestRank <= 10) {
    return typeof bestRank === "number"
      ? `${businessName} is visible for ${searchLabel}, but it has not reached the strongest footing yet. The latest saved rank is #${latestRank}, and the best saved rank is #${bestRank}.`
      : `${businessName} is visible for ${searchLabel}, but it has not reached the strongest footing yet. The latest saved rank is #${latestRank}.`;
  }

  return typeof bestRank === "number"
    ? `${businessName} still has weak saved visibility for ${searchLabel}. The latest saved rank is #${latestRank}, the best saved rank is #${bestRank}, and the current visibility read is ${visibilityRead}.`
    : `${businessName} still has weak saved visibility for ${searchLabel}. The latest saved rank is #${latestRank}, and the current visibility read is ${visibilityRead}.`;
}

function numericValue(value: number | null | undefined) {
  return typeof value === "number" ? `${value}` : "Not set";
}

function textValue(value: string | null | undefined, fallback = "Not set") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function boolLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
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
  border,
}: {
  children: ReactNode;
  tone?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: tone ?? "var(--text-body)",
        backgroundColor: bg ?? "transparent",
        borderColor: border ?? "var(--border)",
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

function EvidenceBullet({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-2 h-2.5 w-2.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{text}</span>
    </li>
  );
}

export default function ProjectVisibilityPage({ params }: PageProps) {
  const { projectId, dashboardContext, visibilitySummary, loading, error } =
    useProjectVisibilityPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading visibility read...
          </p>
        </div>
      </main>
    );
  }

  if (error || !visibilitySummary) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load visibility page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const visibilityScore = visibilitySummary.visibilityReadinessScore;
  const keyword = textValue(visibilitySummary.keyword);
  const metro = textValue(visibilitySummary.metro);
  const latestRank = visibilitySummary.latestRank;
  const bestRank = visibilitySummary.bestRank;
  const previousRank = visibilitySummary.previousRank;
  const latestCapturedAt = visibilitySummary.latestCapturedAt;
  const visibilityRead = visibilitySummary.visibilityLabel;
  const plainLanguageSummary = visibilitySummary.plainLanguageSummary;
  const topIssue = visibilitySummary.topIssue;
  const whyItMatters = visibilitySummary.whyItMatters;
  const nextActionTitle = visibilitySummary.nextAction.title;
  const nextActionWho = visibilitySummary.nextAction.whoShouldDoIt;
  const nextActionDifficulty = visibilitySummary.nextAction.difficulty;
  const nextActionReason = visibilitySummary.nextAction.reason;
  const hasActiveKeyword = visibilitySummary.hasActiveKeyword;
  const hasTrackedKeyword =
    typeof visibilitySummary.keyword === "string" &&
    visibilitySummary.keyword.trim().length > 0;
  const isSetupBlocked = !hasTrackedKeyword;
  const isTrackingInactive = hasTrackedKeyword && !hasActiveKeyword;
  const visibilityHeadlineBusinessName =
    dashboardContext?.projectDisplayName ?? "this business";

  const heroHeadline = isSetupBlocked
    ? `Set one tracked search for ${visibilityHeadlineBusinessName} before visibility can be measured clearly.`
    : isTrackingInactive
      ? `Finish tracked-search activation for ${visibilityHeadlineBusinessName} before visibility can be measured clearly.`
      : `See whether ${visibilityHeadlineBusinessName} has real local ranking footing in the market that matters most.`;

  const heroSupportLine = isSetupBlocked
    ? "This project does not have a tracked keyword and market yet, so Digital Brain cannot build a reliable visibility read."
    : isTrackingInactive
      ? "This project has a saved tracked search, but tracking is not active yet, so the visibility read is still in setup mode."
      : "This page shows the tracked keyword, current ranking footing, and the clearest next move to strengthen local visibility.";

  const trackingStatus = isSetupBlocked
    ? "Not configured"
    : isTrackingInactive
      ? "Saved but inactive"
      : "Active";

  const setupHeading = isSetupBlocked || isTrackingInactive
    ? "Finish visibility setup first"
    : "The clearest next visibility move";

  const setupIntro = isSetupBlocked
    ? `Start by choosing one real search phrase and market for ${visibilityHeadlineBusinessName}. Visibility cannot be measured clearly until that tracked search exists.`
    : isTrackingInactive
      ? "Start by activating the saved tracked search. Visibility cannot be measured clearly until tracking is active."
      : "Start with the biggest visibility gap first. Stronger local footing begins with a real tracked search, a clear market, and a practical next action.";

  const rankMovement = formatRankMovement(latestRank, previousRank);
  const rankTrendSummary = buildRankTrendSummary({
    latestRank,
    previousRank,
    keyword,
    metro,
    businessName: visibilityHeadlineBusinessName,
  });
  const marketFootingSummary = buildMarketFootingSummary({
    latestRank,
    bestRank,
    keyword,
    metro,
    visibilityRead,
    businessName: visibilityHeadlineBusinessName,
  });

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Local visibility center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                {heroHeadline}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                {heroSupportLine}
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {nextActionTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {nextActionReason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag
                  tone="var(--accent-blue-600)"
                  bg="var(--accent-blue-100)"
                  border="var(--accent-blue-600)"
                >
                  {visibilityRead}
                </InlineTag>
                <InlineTag>Who: {nextActionWho}</InlineTag>
                <InlineTag>Difficulty: {nextActionDifficulty}</InlineTag>
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

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Current visibility summary</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricStripItem
              label="Visibility score"
              value={numericValue(visibilityScore)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Tracking status"
              value={trackingStatus}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Latest rank"
              value={formatRank(latestRank)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Best rank"
              value={formatRank(bestRank)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
            <MetricStripItem
              label="Rank movement"
              value={rankMovement}
              bg="var(--reference-soft)"
              tone="var(--text-strong)"
            />
          </div>

          {!isSetupBlocked ? (
            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <SectionLabel>What the saved ranking trend shows</SectionLabel>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                {rankTrendSummary}
              </p>

              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <SectionLabel>What this means in the tracked market</SectionLabel>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                  {marketFootingSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <InlineTag>Search: {keyword}</InlineTag>
                  <InlineTag>Market: {metro}</InlineTag>
                  <InlineTag>Visibility read: {visibilityRead}</InlineTag>
                  <InlineTag>Saved trend: {rankMovement}</InlineTag>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              {setupHeading}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              {setupIntro}
            </p>

            <div className="mt-6">
              {[
                {
                  title: nextActionTitle,
                  detail: nextActionReason,
                },
                {
                  title: topIssue,
                  detail: whyItMatters,
                },
                {
                  title: "Keep visibility tracking tied to the real market",
                  detail:
                    "The keyword, metro, and ranking snapshots should reflect the market the owner actually cares about most.",
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                    index === 2 ? "" : "border-b border-[var(--border)]"
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
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                      {item.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Visibility evidence</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Visibility read"
                  value={visibilityRead}
                  helper={plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={topIssue}
                  helper={whyItMatters}
                />
                <DetailRow
                  label="Last update"
                  value={formatDate(latestCapturedAt)}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Open another center</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-3">
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
                <Link
                  href={`/projects/${projectId}/ai`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open AI page
                </Link>
                <Link
                  href={`/projects/${projectId}/identity`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open identity page
                </Link>
                <Link
                  href={`/projects/${projectId}/website`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open website page
                </Link>
                <Link
                  href={`/projects/${projectId}/reviews`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open reviews page
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {(visibilitySummary.evidence.length > 0
                  ? visibilitySummary.evidence
                  : ["No visibility details are available yet."]).map(
                  (item, index) => (
                    <EvidenceBullet
                      key={`${index}-${item}`}
                      text={item}
                      color={
                        index === 0
                          ? "var(--brand-600)"
                          : index === 1
                            ? "var(--accent-blue-600)"
                            : index === 2
                              ? "var(--success)"
                              : index === 3
                                ? "var(--warning)"
                                : "var(--accent-mint-600)"
                      }
                    />
                  ),
                )}
              </ul>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Visibility read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Visibility read"
                  value={visibilityRead}
                  helper="This is the current local visibility read based on the tracked search and rank history."
                />
                <DetailRow
                  label="Who should do it"
                  value={nextActionWho}
                  helper="This is who should handle the next visibility move."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This shows how hard the next visibility move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {numericValue(visibilityScore)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  visibility score right now
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${
                        typeof visibilityScore === "number"
                          ? Math.max(0, Math.min(visibilityScore, 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta label="Keyword" value={keyword} />
                  <HeaderMeta label="Latest rank" value={formatRank(latestRank)} />
                  <HeaderMeta label="Best rank" value={formatRank(bestRank)} />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Previous rank"
                    value={formatRank(previousRank)}
                  />
                  <HeaderMeta label="Metro" value={metro} />
                  <HeaderMeta
                    label="Active keyword"
                    value={boolLabel(hasActiveKeyword)}
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