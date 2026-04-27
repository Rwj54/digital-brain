"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { saveProjectReviewCapacityData } from "@/components/projects/dashboard/writeData";
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
  const {
    projectId,
    dashboardContext,
    outcomesSummary,
    loading,
    error,
    reloadPage,
  } = useProjectOutcomesPageState(params);

  const [monthlyEventsInput, setMonthlyEventsInput] = useState("");
  const [reviewConvRateInput, setReviewConvRateInput] = useState("");
  const [eventLabelSingularInput, setEventLabelSingularInput] = useState("Event");
  const [eventLabelPluralInput, setEventLabelPluralInput] = useState("Events");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!outcomesSummary) {
      return;
    }

    setMonthlyEventsInput(
      typeof outcomesSummary.monthlyCustomerEvents === "number"
        ? String(outcomesSummary.monthlyCustomerEvents)
        : ""
    );
    setReviewConvRateInput(
      typeof outcomesSummary.reviewConversionRate === "number"
        ? String(outcomesSummary.reviewConversionRate)
        : ""
    );
    setEventLabelSingularInput(textValue(outcomesSummary.eventLabelSingular, "Event"));
    setEventLabelPluralInput(textValue(outcomesSummary.eventLabelPlural, "Events"));
  }, [
    outcomesSummary,
    outcomesSummary?.monthlyCustomerEvents,
    outcomesSummary?.reviewConversionRate,
    outcomesSummary?.eventLabelSingular,
    outcomesSummary?.eventLabelPlural,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading outcomes read...
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
  const currentReviews =
    typeof outcomesSummary.currentReviews === "number"
      ? outcomesSummary.currentReviews
      : null;
  const topCompetitorName = outcomesSummary.topCompetitorName;
  const topCompetitorReviews =
    typeof outcomesSummary.topCompetitorReviews === "number"
      ? outcomesSummary.topCompetitorReviews
      : null;
  const gapReviews =
    typeof outcomesSummary.gapReviews === "number"
      ? outcomesSummary.gapReviews
      : null;
  const desiredTarget90d =
    typeof outcomesSummary.desiredTarget90d === "number"
      ? outcomesSummary.desiredTarget90d
      : null;
  const maxReviews90d =
    typeof outcomesSummary.maxReviews90d === "number"
      ? outcomesSummary.maxReviews90d
      : null;
  const realisticTarget90d =
    typeof outcomesSummary.realisticTarget90d === "number"
      ? outcomesSummary.realisticTarget90d
      : null;
  const perWeek =
    typeof outcomesSummary.perWeek === "number"
      ? outcomesSummary.perWeek
      : null;
  const monthsToCloseGap =
    typeof outcomesSummary.monthsToCloseGap === "number"
      ? outcomesSummary.monthsToCloseGap
      : null;

  const catchUpRealitySummary =
    desiredTarget90d !== null && realisticTarget90d !== null
      ? desiredTarget90d > realisticTarget90d
        ? `Closing the full 90-day catch-up target would require about ${formatCount(desiredTarget90d)} reviews, but the current event volume supports a more realistic target of about ${formatCount(realisticTarget90d)}.`
        : `The current event volume is strong enough to support the full 90-day catch-up target of about ${formatCount(desiredTarget90d)} reviews.`
      : "Digital Brain needs both the catch-up target and realistic target before it can show how aggressive this review goal should be.";

  const paceCeilingSummary =
    maxReviews90d !== null && monthsToCloseGap !== null
      ? `At the current pace ceiling, this business could add up to about ${formatCount(maxReviews90d)} reviews in 90 days, and closing the full gap would still take about ${formatCount(monthsToCloseGap)} month${monthsToCloseGap === 1 ? "" : "s"}.`
      : maxReviews90d !== null
        ? `At the current pace ceiling, this business could add up to about ${formatCount(maxReviews90d)} reviews in 90 days.`
        : "Digital Brain does not yet have enough pace context to show the current ceiling clearly.";

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

  const outcomesSetupHref = dashboardContext?.clientId
    ? `/clients/${dashboardContext.clientId}/projects/${projectId}`
    : null;
  const showOutcomesSetupCta = !hasEventSignals || !hasConversionSignal;

  async function handleSaveOutcomesSetup() {
    if (!dashboardContext?.clientId) {
      setSaveError("Missing client context for outcomes setup.");
      setSaveMessage(null);
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveMessage(null);

      const result = await saveProjectReviewCapacityData({
        clientId: dashboardContext.clientId,
        projectId,
        monthlyEvents: monthlyEventsInput,
        reviewConvRate: reviewConvRateInput,
        volumePreset: "custom",
        eventLabelSingular: eventLabelSingularInput,
        eventLabelPlural: eventLabelPluralInput,
        preset: {
          key: "custom",
          label: "Custom",
          helper: "",
          singular: eventLabelSingularInput.trim() || "Event",
          plural: eventLabelPluralInput.trim() || "Events",
          example: "",
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setSaveMessage("Outcomes inputs saved.");
      reloadPage();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Failed to save outcomes inputs."
      );
    } finally {
      setSaving(false);
    }
  }

  const evidence = dedupeEvidence([
    hasEventSignals
      ? `Monthly customer events are currently ${formatCount(monthlyCustomerEvents)}.`
      : "Monthly customer-event tracking is still missing or too thin.",
    hasConversionSignal
      ? `Review conversion rate is currently ${formatConversionRate(reviewConversionRate)}.`
      : "Conversion footing is still not clear enough.",
    currentReviews !== null
      ? `Current review count is ${formatCount(currentReviews)}.`
      : "Current review count is not available yet.",
    gapReviews !== null
      ? `The current review gap to the strongest tracked competitor is ${formatCount(gapReviews)}.`
      : "A reliable review-gap read is not available yet.",
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
                This page shows the outcomes read for this business. It shows whether
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

              {showOutcomesSetupCta && outcomesSetupHref ? (
                <div className="mt-5">
                  <Link
                    href={outcomesSetupHref}
                    className="inline-flex items-center px-4 py-3 text-sm font-semibold text-white"
                    style={{
                      backgroundColor: "var(--brand-700)",
                    }}
                  >
                    Open outcomes setup
                  </Link>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-body)]">
                    This project is still missing the owner’s monthly event count or
                    review conversion rate. Use the editable dashboard to add those
                    inputs so this outcomes center can explain real business impact
                    more clearly.
                  </p>
                </div>
              ) : null}
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
          <SectionLabel>Current outcomes summary</SectionLabel>

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

          {showOutcomesSetupCta ? (
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <SectionLabel>Quick setup</SectionLabel>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                Add the basic outcomes inputs here so this page can explain business
                impact more clearly without sending the owner to another screen.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Monthly customer events
                  </span>
                  <input
                    value={monthlyEventsInput}
                    onChange={(event) => setMonthlyEventsInput(event.target.value)}
                    inputMode="numeric"
                    placeholder="40"
                    className="mt-2 w-full border bg-transparent px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Review conversion rate
                  </span>
                  <input
                    value={reviewConvRateInput}
                    onChange={(event) => setReviewConvRateInput(event.target.value)}
                    inputMode="decimal"
                    placeholder="12"
                    className="mt-2 w-full border bg-transparent px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Singular event label
                  </span>
                  <input
                    value={eventLabelSingularInput}
                    onChange={(event) =>
                      setEventLabelSingularInput(event.target.value)
                    }
                    placeholder="Lead"
                    className="mt-2 w-full border bg-transparent px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Plural event label
                  </span>
                  <input
                    value={eventLabelPluralInput}
                    onChange={(event) =>
                      setEventLabelPluralInput(event.target.value)
                    }
                    placeholder="Leads"
                    className="mt-2 w-full border bg-transparent px-3 py-3 text-sm text-[var(--text-strong)] outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveOutcomesSetup()}
                  disabled={saving || !dashboardContext?.clientId}
                  className="inline-flex items-center px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "var(--brand-700)" }}
                >
                  {saving ? "Saving..." : "Save outcomes inputs"}
                </button>

                {outcomesSetupHref ? (
                  <Link
                    href={outcomesSetupHref}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open full dashboard setup
                  </Link>
                ) : null}
              </div>

              {saveMessage ? (
                <p className="mt-3 text-sm leading-7 text-[var(--success)]">
                  {saveMessage}
                </p>
              ) : null}

              {saveError ? (
                <p className="mt-3 text-sm leading-7 text-[var(--danger)]">
                  {saveError}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Payoff math</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricStripItem
              label="Current reviews"
              value={formatCount(currentReviews)}
              bg="var(--reference-soft)"
              tone="var(--text-strong)"
            />
            <MetricStripItem
              label="Review gap"
              value={formatCount(gapReviews)}
              bg="var(--warning-soft)"
              tone="var(--warning)"
            />
            <MetricStripItem
              label="Max in 90 days"
              value={formatCount(maxReviews90d)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Realistic 90-day goal"
              value={formatCount(realisticTarget90d)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Weekly pace"
              value={formatCount(perWeek)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <SectionLabel>Reality check</SectionLabel>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              {catchUpRealitySummary}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              {paceCeilingSummary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <InlineTag>
                Needed in 90 days: {formatCount(desiredTarget90d)}
              </InlineTag>
              <InlineTag>
                Realistic in 90 days: {formatCount(realisticTarget90d)}
              </InlineTag>
              <InlineTag>
                Ceiling in 90 days: {formatCount(maxReviews90d)}
              </InlineTag>
              <InlineTag>
                Months to close: {formatCount(monthsToCloseGap)}
              </InlineTag>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <div>
              <SectionLabel>What this means in practice</SectionLabel>
              <p className="mt-3 text-base leading-7 text-[var(--text-body)]">
                {realisticTarget90d !== null && perWeek !== null
                  ? `At the current ${textValue(eventLabelPlural, "Events")} volume and conversion rate, this business can likely generate about ${formatCount(realisticTarget90d)} reviews over the next 90 days, which is roughly ${formatCount(perWeek)} per week.`
                  : "Once outcomes inputs are present, this section translates them into a practical review-growth pace the owner can actually follow."}
              </p>
              {topCompetitorName || topCompetitorReviews !== null || monthsToCloseGap !== null ? (
                <p className="mt-4 text-sm leading-7 text-[var(--text-body)]">
                  {topCompetitorName && topCompetitorReviews !== null && gapReviews !== null
                    ? `${topCompetitorName} currently sits at ${formatCount(topCompetitorReviews)} reviews, leaving a gap of ${formatCount(gapReviews)}.`
                    : "Competitor review-gap context is partially available but not complete yet."}{" "}
                  {monthsToCloseGap !== null
                    ? `At the current pace, closing that full gap would take about ${formatCount(monthsToCloseGap)} month${monthsToCloseGap === 1 ? "" : "s"}.`
                    : ""}
                </p>
              ) : null}
            </div>

            <div>
              <DetailRow
                label="Current reviews"
                value={formatCount(currentReviews)}
              />
              <DetailRow
                label="Top competitor"
                value={
                  topCompetitorName
                    ? topCompetitorReviews !== null
                      ? `${topCompetitorName} (${formatCount(topCompetitorReviews)} reviews)`
                      : topCompetitorName
                    : "Not set"
                }
              />
              <DetailRow
                label="Suggested 90-day target"
                value={formatCount(desiredTarget90d)}
              />
              <DetailRow
                label="Realistic 90-day target"
                value={formatCount(realisticTarget90d)}
              />
              <DetailRow
                label="Months to close review gap"
                value={formatCount(monthsToCloseGap)}
              />
            </div>
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
                  href={`/projects/${projectId}/reviews`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open reviews page
                </Link>
                <Link
                  href={`/projects/${projectId}/visibility`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open visibility page
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
              <SectionLabel>Outcomes read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Outcomes read"
                  value={outcomesRead}
                  helper="This is the current outcomes read based on saved event and conversion signals."
                />
                <DetailRow
                  label="Who should do it"
                  value={nextActionWho}
                  helper="This is who should handle the next outcomes move."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This shows how hard the next outcomes move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {numericValue(outcomesScore)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  outcomes score right now
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