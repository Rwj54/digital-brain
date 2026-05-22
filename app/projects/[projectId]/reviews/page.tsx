"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectReviewsPageState } from "@/lib/reviews/useProjectReviewsPageState";

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

function formatCount(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "Not set";
}

function formatRating(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "Not set";
}

function boolLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
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

function dedupeEvidence(items: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const item of items) {
    const normalized = item.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

function buildReviewTrustSummary(input: {
  totalReviews: number | null;
  rating: number | null;
  hasReviewSignals: boolean;
  reputationLabel: string;
  businessName: string;
}) {
  const { totalReviews, rating, hasReviewSignals, reputationLabel, businessName } = input;

  if (!hasReviewSignals) {
    return "Saved review proof still needs more depth before the reputation read can feel stronger.";
  }

  if (totalReviews !== null && rating !== null && totalReviews >= 25 && rating >= 4.2) {
    return `Saved review count and rating already give ${businessName} a usable trust base. The current review read is ${reputationLabel}.`;
  }

  if (totalReviews !== null && rating !== null) {
    return `${businessName} has saved reviews and rating data, but the review base still needs more depth at ${formatCount(totalReviews)} reviews and a ${formatRating(rating)} rating.`;
  }

  if (totalReviews !== null) {
    return `${businessName} has ${formatCount(totalReviews)} saved reviews, but rating quality is still not fully visible. The current review read is ${reputationLabel}.`;
  }

  return `Saved review proof is present, and the current review read is ${reputationLabel}.`;
}

function buildReviewComparisonSummary(input: {
  currentReviews: number | null;
  topCompetitorName: string | null;
  topCompetitorReviews: number | null;
  gapReviews: number | null;
  businessName: string;
}) {
  const {
    currentReviews,
    topCompetitorName,
    topCompetitorReviews,
    gapReviews,
    businessName,
  } = input;

  if (currentReviews === null || topCompetitorReviews === null) {
    return "Digital Brain needs more reliable competitor review data before it can show a clear local comparison.";
  }

  if (gapReviews === null || gapReviews <= 0) {
    return topCompetitorName
      ? `${businessName} is already matching or exceeding ${topCompetitorName} on saved review count.`
      : `${businessName} is already matching or exceeding the strongest tracked competitor on saved review count.`;
  }

  return topCompetitorName
    ? `${businessName} currently has ${formatCount(currentReviews)} reviews, while ${topCompetitorName} has ${formatCount(topCompetitorReviews)}. That leaves a saved review gap of ${formatCount(gapReviews)}.`
    : `${businessName} currently has ${formatCount(currentReviews)} reviews, while the strongest tracked competitor has ${formatCount(topCompetitorReviews)}. That leaves a saved review gap of ${formatCount(gapReviews)}.`;
}

export default function ProjectReviewsPage({ params }: PageProps) {
  const { projectId, dashboardContext, aiSummary, loading, error } =
    useProjectReviewsPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading reviews read...
          </p>
        </div>
      </main>
    );
  }

  if (error || !aiSummary) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load reviews page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const totalReviews =
    typeof aiSummary.totalReviews === "number" ? aiSummary.totalReviews : null;
  const rating = typeof aiSummary.rating === "number" ? aiSummary.rating : null;
  const hasReviewSignals =
    typeof aiSummary.hasReviewSignals === "boolean"
      ? aiSummary.hasReviewSignals
      : false;

  const reputationScore =
    totalReviews !== null && rating !== null
      ? Math.min(
          100,
          Math.round(Math.min(totalReviews, 100) * 0.55 + rating * 9),
        )
      : hasReviewSignals
        ? 55
        : 28;

  const reputationLabel = hasReviewSignals
    ? totalReviews !== null && totalReviews >= 25 && rating !== null && rating >= 4.2
      ? "Good review footing"
      : "Review base is present but needs more depth"
    : "Review base still needs work";

  const plainLanguageSummary = hasReviewSignals
    ? totalReviews !== null && totalReviews >= 25 && rating !== null && rating >= 4.2
      ? "The business has a usable review foundation, but keeping review growth active will strengthen trust over time."
      : "The business has some review proof, but the review foundation is not yet strong enough to feel durable."
    : "The business still needs more review proof before this reputation layer feels strong.";

  const topIssue = hasReviewSignals
    ? totalReviews !== null && totalReviews >= 25 && rating !== null && rating >= 4.2
      ? "The review foundation exists, but it still needs steady maintenance."
      : "Review proof is present, but the review base still needs more depth."
    : "Review proof is still too limited.";

  const whyItMatters = hasReviewSignals
    ? "Reviews help reinforce that the business is real, trusted, and active. A stronger review base improves trust for both people and search systems."
    : "Without stronger review proof, the business trust foundation remains weaker for owners, searchers, and search systems.";

  const nextActionTitle =
    hasReviewSignals && totalReviews !== null && totalReviews >= 25
      ? "Get consistent 5-star reviews"
      : "Start asking happy customers for reviews";

  const nextActionWho = "Owner or team member";
  const nextActionDifficulty = hasReviewSignals ? "Medium" : "Easy";
  const nextActionReason = hasReviewSignals
    ? "Consistent 5-star reviews protect the rating, build customer trust, and show Google this is an active, growing business."
    : "The fastest way to improve reputation strength is to ask happy customers for reviews in a steady, repeatable way.";

  const evidence = dedupeEvidence([
    ...(Array.isArray(aiSummary.evidence) ? aiSummary.evidence : []),
    hasReviewSignals
      ? `Review proof is present with ${formatCount(totalReviews)} reviews and a ${formatRating(rating)} rating.`
      : "Review proof still needs more depth.",
    totalReviews !== null && totalReviews > 0
      ? "Review count is now part of the saved trust foundation."
      : "Review count is not yet giving the business a strong trust cushion.",
    rating !== null
      ? `Saved rating is ${formatRating(rating)}.`
      : "Saved rating is not available yet.",
  ]).slice(0, 8);

  const currentReviewsComparison =
    dashboardContext?.dashboard.outcomesSummary.currentReviews ?? totalReviews ?? null;
  const topCompetitorName =
    dashboardContext?.dashboard.outcomesSummary.topCompetitorName ?? null;
  const topCompetitorReviews =
    dashboardContext?.dashboard.outcomesSummary.topCompetitorReviews ?? null;
  const reviewGap =
    dashboardContext?.dashboard.outcomesSummary.gapReviews ?? null;

  const reviewsBusinessName =
    dashboardContext?.projectDisplayName ?? "this business";

  const reviewTrustSummary = buildReviewTrustSummary({
    totalReviews,
    rating,
    hasReviewSignals,
    reputationLabel,
    businessName: reviewsBusinessName,
  });

  const hasReliableReviewComparison =
    currentReviewsComparison !== null && topCompetitorReviews !== null;
  const reviewComparisonSummary = buildReviewComparisonSummary({
    currentReviews: currentReviewsComparison,
    topCompetitorName,
    topCompetitorReviews,
    gapReviews: reviewGap,
    businessName: reviewsBusinessName,
  });

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Reviews and reputation center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                Build steady 5-star review growth that strengthens trust with
                customers and Google.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page shows whether the business has enough review trust,
                what review signals are already helping, and what to do next to
                keep review growth active.
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
                  {reputationLabel}
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
          <SectionLabel>Current reviews summary</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricStripItem
              label="Review score"
              value={numericValue(reputationScore)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Total reviews"
              value={formatCount(totalReviews)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Rating"
              value={formatRating(rating)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Review signals present"
              value={boolLabel(hasReviewSignals)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
            <MetricStripItem
              label="Review read"
              value={reputationLabel}
              bg="var(--reference-soft)"
              tone="var(--text-strong)"
            />
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <SectionLabel>What the saved review trust signals show</SectionLabel>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              {reviewTrustSummary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <InlineTag>Total reviews: {formatCount(totalReviews)}</InlineTag>
              <InlineTag>Rating: {formatRating(rating)}</InlineTag>
              <InlineTag>Signals present: {boolLabel(hasReviewSignals)}</InlineTag>
              <InlineTag>Review read: {reputationLabel}</InlineTag>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <SectionLabel>How this compares locally</SectionLabel>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                {hasReliableReviewComparison
                  ? reviewComparisonSummary
                  : `Digital Brain has ${reviewsBusinessName}'s saved review count, but it needs more reliable competitor review data to make a local review-gap comparison.`}
              </p>
              {hasReliableReviewComparison ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <InlineTag>
                    Your reviews: {formatCount(currentReviewsComparison)}
                  </InlineTag>
                  <InlineTag>
                    Strongest competitor:{" "}
                    {topCompetitorName
                      ? `${topCompetitorName} (${formatCount(topCompetitorReviews)})`
                      : formatCount(topCompetitorReviews)}
                  </InlineTag>
                  <InlineTag>
                    Review gap: {formatCount(reviewGap)}
                  </InlineTag>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <InlineTag>Your reviews: {formatCount(currentReviewsComparison)}</InlineTag>
                  <InlineTag>Competitor review comparison: Not ready yet</InlineTag>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <SectionLabel>Review request starter plan</SectionLabel>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                Start with recent happy customers. Ask soon after the order,
                make the review link easy to use, and track that the request
                was sent. The goal is not a one-time spike. The goal is a steady
                habit that creates fresh trust signals over time.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Step 1
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
                    Pick recent happy customers
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                    Start with people who already had a good experience and are
                    most likely to respond.
                  </p>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Step 2
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
                    Send a simple review link
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                    Keep the request short, personal, and easy to complete from
                    a phone.
                  </p>
                </div>

                <div className="border-t border-[var(--border)] pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Step 3
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
                    Mark the task complete
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                    Record what was sent in the owner task proof note so the
                    business has a simple progress record.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/owner#next-steps`}
                  className="px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  style={{
                    border: "1px solid var(--text-strong)",
                    backgroundColor: "var(--text-strong)",
                    color: "#ffffff",
                  }}
                >
                  Open owner action plan
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next reputation move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Start with the biggest trust gap first. Stronger reviews help
              reinforce that the business is trusted, active, and credible.
            </p>

            <div className="mt-6">
              {[
                {
                  title: "Get consistent 5-star reviews",
                  detail:
                    "Consistent 5-star reviews protect the rating, build customer trust, and show Google this is an active, growing business.",
                },
                {
                  title: "Set up a simple review request program",
                  detail:
                    "Ask happy customers for a review soon after their order or visit. The goal is to make review requests a repeatable habit, not a one-time push.",
                },
                {
                  title: "Build steady review momentum",
                  detail:
                    "Getting one or two new reviews every few days or each week builds stronger rating quality and shows customers that the business cares about their experience.",
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
              <SectionLabel>Review details</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Reputation read"
                  value={reputationLabel}
                  helper={plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={topIssue}
                  helper={whyItMatters}
                />
                <DetailRow
                  label="Review count"
                  value={formatCount(totalReviews)}
                />
                <DetailRow
                  label="Rating"
                  value={formatRating(rating)}
                />
                <DetailRow
                  label="Review signals present"
                  value={boolLabel(hasReviewSignals)}
                />
                <DetailRow
                  label="Business profile name"
                  value={textValue(
                    typeof aiSummary.gbpName === "string"
                      ? aiSummary.gbpName
                      : null,
                  )}
                />
                <DetailRow
                  label="Business profile category"
                  value={textValue(
                    typeof aiSummary.primaryCategory === "string"
                      ? aiSummary.primaryCategory
                      : null,
                  )}
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
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {(evidence.length > 0
                  ? evidence
                  : ["No review details are available yet."]).map(
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
              <SectionLabel>Reviews read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Reviews read"
                  value={reputationLabel}
                  helper="This is the current reviews read based on saved review trust signals."
                />
                <DetailRow
                  label="Who should do it"
                  value={nextActionWho}
                  helper="This is who should handle the next review and reputation move."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This shows how hard the next reputation move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {numericValue(reputationScore)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  reputation score right now
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${Math.max(0, Math.min(reputationScore, 100))}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Review count"
                    value={formatCount(totalReviews)}
                  />
                  <HeaderMeta
                    label="Rating"
                    value={formatRating(rating)}
                  />
                  <HeaderMeta
                    label="Review signals present"
                    value={boolLabel(hasReviewSignals)}
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