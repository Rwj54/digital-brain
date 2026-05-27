"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectAiPageState } from "@/lib/ai/useProjectAiPageState";

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

function boolLabel(value: boolean | undefined) {
  return value ? "Yes" : "No";
}

function scoreLabel(value: number | null | undefined) {
  return typeof value === "number" ? `${value}` : "Not set";
}

function buildAiIdentitySummary(input: {
  businessName: string;
  primaryCategory: string;
  targetBrandName: string;
  projectCategory: string;
  reviewSignals: string;
  aiLabel: string;
}) {
  const {
    businessName,
    primaryCategory,
    targetBrandName,
    projectCategory,
    reviewSignals,
    aiLabel,
  } = input;

  const hasBusinessName = businessName !== "Not set";
  const hasPrimaryCategory = primaryCategory !== "Not set";
  const hasTargetBrandName = targetBrandName !== "Not set";
  const hasProjectCategory = projectCategory !== "Not set";

  if (!hasBusinessName) {
    return "The saved AI identity foundation needs the Google Business Profile name, so Google and AI systems have more to work with.";
  }

  if (!hasPrimaryCategory) {
    return "The saved business name exists, but the primary category needs to be added so Google and AI systems have a clearer picture of what the business does.";
  }

  if (!hasTargetBrandName || !hasProjectCategory) {
    return `The saved Google Business Profile details are present, and review proof reads as ${reviewSignals}, but the project details need to be completed. The current AI read is ${aiLabel}.`;
  }

  return `The saved business name, primary category, project brand, project category, and review proof are all present enough for a stronger early AI identity read. The current AI read is ${aiLabel}.`;
}

function textValue(value: string | null | undefined, fallback = "Not set") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function reviewSignalsValue(
  totalReviews: number | null | undefined,
  rating: number | null | undefined,
) {
  const reviews = typeof totalReviews === "number" ? totalReviews : 0;
  const ratingText =
    typeof rating === "number" ? rating.toFixed(1) : "not set yet";

  return `${reviews} reviews, rating ${ratingText}`;
}

export default function ProjectAiPage({ params }: PageProps) {
  const { projectId, dashboardContext, aiSummary, loading, error } =
    useProjectAiPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading AI read...
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
              {error || "Failed to load AI page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const aiScore =
    typeof aiSummary.aiReadinessScore === "number"
      ? aiSummary.aiReadinessScore
      : 0;

  const aiLabel = textValue(
    typeof aiSummary.aiReadinessLabel === "string"
      ? aiSummary.aiReadinessLabel
      : null,
  );

  const plainLanguageSummary = textValue(
    typeof aiSummary.plainLanguageSummary === "string"
      ? aiSummary.plainLanguageSummary
      : null,
    "Digital Brain needs more saved business details for a stronger AI visibility read.",
  );

  const topIssue = textValue(
    typeof aiSummary.topIssue === "string" ? aiSummary.topIssue : null,
  );

  const aiHeadlineBusinessName =
    dashboardContext?.projectDisplayName ?? "this business";

  const whyItMatters = textValue(
    typeof aiSummary.whyItMatters === "string" ? aiSummary.whyItMatters : null,
    `Google and AI systems need clear business identity and trust proof to understand ${aiHeadlineBusinessName} well.`,
  );

  const nextActionWho = textValue(
    aiSummary.nextAction?.whoShouldDoIt ?? aiSummary.nextAction?.who_should_do_it,
    "Owner or marketing lead",
  );

  const nextActionDifficulty = textValue(
    aiSummary.nextAction?.difficulty,
    "Easy",
  );

  const evidence = Array.isArray(aiSummary.evidence)
    ? aiSummary.evidence.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];

  const businessName = textValue(
    typeof aiSummary.gbpName === "string" ? aiSummary.gbpName : null,
  );

  const primaryCategory = textValue(
    typeof aiSummary.primaryCategory === "string"
      ? aiSummary.primaryCategory
      : null,
  );

  const targetBrandName = textValue(
    typeof aiSummary.targetBrandName === "string"
      ? aiSummary.targetBrandName
      : null,
  );

  const projectCategory = textValue(
    typeof aiSummary.projectCategory === "string"
      ? aiSummary.projectCategory
      : null,
  );

  const reviewSignals = reviewSignalsValue(
    typeof aiSummary.totalReviews === "number" ? aiSummary.totalReviews : null,
    typeof aiSummary.rating === "number" ? aiSummary.rating : null,
  );

  const aiIdentitySummary = buildAiIdentitySummary({
    businessName,
    primaryCategory,
    targetBrandName,
    projectCategory,
    reviewSignals,
    aiLabel,
  });


  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>AI visibility center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                Help Google and AI systems clearly understand{" "}
                {aiHeadlineBusinessName}.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page checks whether the business name, category, website,
                and review trust signals are clear enough for search and AI
                systems to understand who the business is and why customers can
                trust it.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                Check that the business name, category, website, and reviews all
                tell the same story.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                Google and AI systems can understand the business more easily
                when the public details are clear, consistent, and trustworthy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag
                  tone="var(--accent-blue-600)"
                  bg="var(--accent-blue-100)"
                  border="var(--accent-blue-600)"
                >
                  {aiLabel}
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
          <SectionLabel>Current AI summary</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="AI score"
              value={scoreLabel(aiSummary.aiReadinessScore)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Business name saved"
              value={boolLabel(aiSummary.hasBusinessName)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Category saved"
              value={boolLabel(aiSummary.hasPrimaryCategory)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Review signals"
              value={boolLabel(aiSummary.hasReviewSignals)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>What the saved business signals show</SectionLabel>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
            {aiIdentitySummary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <InlineTag>GBP name: {businessName}</InlineTag>
            <InlineTag>Primary category: {primaryCategory}</InlineTag>
            <InlineTag>Project brand: {targetBrandName}</InlineTag>
            <InlineTag>Project category: {projectCategory}</InlineTag>
            <InlineTag>Review trust: {reviewSignals}</InlineTag>
            <InlineTag>AI read: {aiLabel}</InlineTag>
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next AI readiness move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Start with the clearest business identity or trust issue first.
              When the business name, category, website, and reviews all agree,
              search and AI systems have a stronger picture of the business.
            </p>

            <div className="mt-6">
              {[
                {
                  title: "Make the business identity clear everywhere",
                  detail:
                    "Use the same business name, category, website, and location language across the Google Business Profile, website, and project settings.",
                },
                {
                  title: "Strengthen trust signals customers can see",
                  detail:
                    "Reviews, rating quality, clear service language, and a matching website help customers, Google, and AI systems trust the business more easily.",
                },
                {
                  title: "Keep website and Google profile language aligned",
                  detail:
                    "The website and Google Business Profile should describe the business in the same plain language so there is less confusion about what the business does.",
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
              <SectionLabel>AI readiness details</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="AI read"
                  value={aiLabel}
                  helper={plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={topIssue}
                  helper={whyItMatters}
                />
                <DetailRow
                  label="Business profile name"
                  value={businessName}
                />
                <DetailRow
                  label="Business profile category"
                  value={primaryCategory}
                />
                <DetailRow
                  label="Review trust signals"
                  value={reviewSignals}
                />
                <DetailRow
                  label="Saved brand name"
                  value={targetBrandName}
                />
                <DetailRow
                  label="Saved category"
                  value={projectCategory}
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
                  href={`/projects/${projectId}/actions`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open actions page
                </Link>
                <Link
                  href={`/projects/${projectId}/authority`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open authority page
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {(evidence.length > 0 ? evidence : ["No AI details are available yet."]).map(
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
              <SectionLabel>AI read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="AI read"
                  value={aiLabel}
                  helper="This is the current AI read for the saved project and GBP identity data."
                />
                <DetailRow
                  label="Who should do it"
                  value={nextActionWho}
                  helper="This is who should handle the next business clarity or trust fix."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This shows how hard the next AI readiness move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {aiScore}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  AI visibility score right now
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${Math.max(0, Math.min(aiScore, 100))}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Business name saved"
                    value={boolLabel(aiSummary.hasBusinessName)}
                  />
                  <HeaderMeta
                    label="Category saved"
                    value={boolLabel(aiSummary.hasPrimaryCategory)}
                  />
                  <HeaderMeta
                    label="Review signals"
                    value={boolLabel(aiSummary.hasReviewSignals)}
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