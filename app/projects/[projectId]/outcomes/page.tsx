"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectOutcomesPageState } from "@/lib/outcomes/useProjectOutcomesPageState";

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

function formatConversionRate(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Not set";
  }

  if (value <= 1) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return `${value.toFixed(1)}%`;
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

export default function ProjectOutcomesPage({ params }: PageProps) {
  const { projectId, dashboardContext, outcomesSummary, loading, error } =
    useProjectOutcomesPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading outcomes page...
          </p>
        </div>
      </main>
    );
  }

  if (error || !outcomesSummary) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load outcomes page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const monthlyCustomerEvents =
    typeof outcomesSummary.monthlyCustomerEvents === "number"
      ? outcomesSummary.monthlyCustomerEvents
      : null;
  const reviewConversionRate =
    typeof outcomesSummary.reviewConversionRate === "number"
      ? outcomesSummary.reviewConversionRate
      : null;
  const eventLabelSingular = outcomesSummary.eventLabelSingular;
  const eventLabelPlural = outcomesSummary.eventLabelPlural;
  const outcomesReadinessLabel = textValue(
    outcomesSummary.outcomesReadinessLabel,
    "Outcomes footing not set",
  );

  const hasEventSignals =
    typeof monthlyCustomerEvents === "number" && monthlyCustomerEvents > 0;
  const hasConversionSignal =
    typeof reviewConversionRate === "number" && reviewConversionRate > 0;

  const outcomesScore =
    hasEventSignals && hasConversionSignal
      ? Math.min(
          100,
          Math.round(
            Math.min(monthlyCustomerEvents ?? 0, 100) * 0.6 +
              Math.min(
                reviewConversionRate <= 1
                  ? reviewConversionRate * 100
                  : reviewConversionRate,
                100,
              ) *
                0.4,
          ),
        )
      : hasEventSignals
        ? 58
        : 24;

  const outcomesRead = hasEventSignals
    ? hasConversionSignal
      ? "Business outcome signals are starting to connect"
      : "Customer-event signals exist, but conversion footing is still thin"
    : "Business outcome signals are still thin";

  const plainLanguageSummary = hasEventSignals
    ? hasConversionSignal
      ? "The project now has some real business-outcome footing. That makes it easier to connect visibility work to real customer activity."
      : "Customer-event data exists, but the project still needs a clearer conversion view so owners can see whether reputation and visibility work are turning into results."
    : "This project still needs stronger customer-event tracking before the owner can clearly see business results from visibility work.";

  const topIssue = hasEventSignals
    ? hasConversionSignal
      ? "Outcome tracking exists, but it still needs to deepen over time."
      : "Outcome tracking exists, but conversion footing is still not clear enough."
    : "Business outcome signals are not connected strongly enough yet.";

  const whyItMatters = hasEventSignals
    ? hasConversionSignal
      ? "When customer-event and conversion signals exist, the owner can start connecting search visibility work to real business results."
      : "Customer events alone are not enough. Owners also need a clearer read on whether those events are turning into meaningful results."
    : "Without customer-event signals, the owner cannot clearly see whether visibility work is making a real business difference.";

  const nextActionTitle = hasEventSignals
    ? hasConversionSignal
      ? "Keep outcomes tracking active and strengthen result visibility"
      : "Clarify the conversion view for the events you already track"
    : "Connect customer-event tracking first";

  const nextActionWho = "Owner or marketing lead";
  const nextActionDifficulty = hasEventSignals ? "Medium" : "Easy";
  const nextActionReason = hasEventSignals
    ? hasConversionSignal
      ? "The next win is to make business impact easier to see and easier to trust over time."
      : "The project already has some event signals. The next step is turning that into a clearer outcomes story for the owner."
    : "The fastest path to a useful outcomes center is to connect real customer-event tracking first.";

  const evidence = dedupeEvidence([
    hasEventSignals
      ? `Monthly customer events are currently ${formatCount(monthlyCustomerEvents)}.`
      : "Monthly customer-event tracking is still missing or too thin.",
    hasConversionSignal
      ? `Review conversion rate is currently ${formatConversionRate(reviewConversionRate)}.`
      : "Conversion footing is still not clear enough.",
    eventLabelSingular
      ? `Single event label is "${eventLabelSingular}".`
      : "A single customer-event label is not set yet.",
    eventLabelPlural
      ? `Plural event label is "${eventLabelPlural}".`
      : "A plural customer-event label is not set yet.",
    `Current outcomes readiness label is "${outcomesReadinessLabel}".`,
  ]);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Outcomes center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See whether visibility work is starting to connect to real
                business outcomes.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page gives the owner-facing outcomes read. It shows whether
                customer-event and conversion signals are strong enough to help
                explain business impact over time.
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
                  {outcomesRead}
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
          <SectionLabel>Outcomes markers</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="Monthly events"
              value={formatCount(monthlyCustomerEvents)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Conversion rate"
              value={formatConversionRate(reviewConversionRate)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Event signals present"
              value={boolLabel(hasEventSignals)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Outcomes score"
              value={numericValue(outcomesScore)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next outcomes move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Start with the biggest business-results gap first. The goal is to
              help the owner understand whether visibility work is producing
              real-world movement.
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
                  title: "Keep outcome tracking tied to real customer activity",
                  detail:
                    "The owner should be able to connect visibility work to events and to the business results that matter most.",
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
              <SectionLabel>Outcomes evidence</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Outcomes read"
                  value={outcomesRead}
                  helper={plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={topIssue}
                  helper={whyItMatters}
                />
                <DetailRow
                  label="Monthly customer events"
                  value={formatCount(monthlyCustomerEvents)}
                />
                <DetailRow
                  label="Review conversion rate"
                  value={formatConversionRate(reviewConversionRate)}
                />
                <DetailRow
                  label="Single event label"
                  value={textValue(eventLabelSingular)}
                />
                <DetailRow
                  label="Plural event label"
                  value={textValue(eventLabelPlural)}
                />
                <DetailRow
                  label="Readiness label"
                  value={outcomesReadinessLabel}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Outcomes navigation</SectionLabel>
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
                  View AI page
                </Link>
                <Link
                  href={`/projects/${projectId}/identity`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View identity page
                </Link>
                <Link
                  href={`/projects/${projectId}/reviews`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View reviews page
                </Link>
                <Link
                  href={`/projects/${projectId}/visibility`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View visibility page
                </Link>
                <Link
                  href={`/projects/${projectId}/website`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View website page
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you now</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {evidence.map((item, index) => (
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
                ))}
              </ul>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Plain-English read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Current read"
                  value={outcomesRead}
                  helper="This is the owner-facing business-outcomes read based on saved event and conversion signals."
                />
                <DetailRow
                  label="Next action owner"
                  value={nextActionWho}
                  helper="This is who should make the next outcomes move."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This tells the owner how hard the next outcomes move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress and proof</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {numericValue(outcomesScore)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  outcomes score for this project
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${Math.max(0, Math.min(outcomesScore, 100))}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Monthly events"
                    value={formatCount(monthlyCustomerEvents)}
                  />
                  <HeaderMeta
                    label="Conversion rate"
                    value={formatConversionRate(reviewConversionRate)}
                  />
                  <HeaderMeta
                    label="Event signals present"
                    value={boolLabel(hasEventSignals)}
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