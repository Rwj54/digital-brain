import Link from "next/link";

import {
  formatConversionRate,
  formatCount,
  formatDate,
  formatDifficulty,
  formatRating,
  formatWho,
  getAiCategoryAlignmentHelper,
  getAiCategoryAlignmentLabel,
  getAiEvidence,
  getAiNamingAlignmentHelper,
  getAiNamingAlignmentLabel,
  getAiNextAction,
  getAiPlainLanguageSummary,
  getAiReadinessScore,
  getAiTopIssue,
  getAiWhyItMatters,
  getSummaryTone,
  getWebsiteAlignmentHelper,
  getWebsiteAlignmentLabel,
} from "@/lib/owner/formatters";
import {
  type DetailTab,
  type OwnerPageDashboard,
  type OwnerTaskImpact,
  type OwnerTaskImpactsResponse,
  type OwnerTasksResponse,
  type RenderStep,
} from "@/lib/owner/types";
import {
  DetailBullet,
  DetailRow,
  InlineTag,
  SectionLabel,
  TabButton,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
  tasksData: OwnerTasksResponse;
  impactsData: OwnerTaskImpactsResponse;
  steps: RenderStep[];
  detailTab: DetailTab;
  onDetailTabChange: (tab: DetailTab) => void;
};

function getStepCompletionProofNote(step: RenderStep): string {
  if (step.kind !== "task") {
    return "";
  }

  const note = step.task.task_data?.completion_proof_note;

  return typeof note === "string" ? note.trim() : "";
}

function getStepImpact(
  step: RenderStep,
  impactsData: OwnerTaskImpactsResponse,
): OwnerTaskImpact | null {
  if (step.kind !== "task") {
    return null;
  }

  return (
    impactsData.impacts.find((impact) => impact.owner_task_id === step.task.id) ??
    null
  );
}

function formatImpactStatus(impact: OwnerTaskImpact): string {
  const status = impact.readiness.computedStatus || impact.status;

  if (status === "waiting_for_window") return "Watching";
  if (status === "window_ready") return "Ready to compare";
  if (status === "completed") return "Compared";

  return "Tracked";
}

function formatDaysRemaining(daysRemaining: number | null): string {
  if (daysRemaining === null) {
    return "Timing not available";
  }

  if (daysRemaining === 0) {
    return "Ready now";
  }

  if (daysRemaining === 1) {
    return "1 day left";
  }

  return `${daysRemaining} days left`;
}

function formatImpactEligibleDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return formatDate(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getImpactWatchText(impact: OwnerTaskImpact | null): string {
  if (!impact) {
    return "No impact watch has been started for this task yet.";
  }

  if (impact.readiness.computedStatus === "completed" && impact.impact_summary) {
    return impact.impact_summary;
  }

  if (impact.readiness.isWindowReady) {
    return "The watch window is ready for comparison. Digital Brain has not claimed the action worked yet; it only knows the waiting period is complete.";
  }

  if (impact.readiness.eligibleOn) {
    return `Digital Brain is watching this action until ${formatImpactEligibleDate(
      impact.readiness.eligibleOn,
    )} before comparing what changed. No outcome impact has been claimed yet.`;
  }

  return "This task has an impact record attached for future outcome comparison. No outcome impact has been claimed yet.";
}

function formatComparisonPolicy(impact: OwnerTaskImpact): string {
  if (impact.comparisonPlan.claimPolicy === "compare_only_no_attribution") {
    return "Conservative comparison";
  }

  if (impact.comparisonPlan.claimPolicy === "context_only_no_claim") {
    return "Context only";
  }

  return "Future source needed";
}

function formatComparisonCapability(impact: OwnerTaskImpact): string {
  if (impact.comparisonPlan.canCompareNow) {
    return "Can compare later";
  }

  if (impact.comparisonPlan.claimPolicy === "future_required_no_claim") {
    return "Needs future source";
  }

  return "Context only";
}

function getComparisonSourceLabels(impact: OwnerTaskImpact): string[] {
  const plan = impact.comparisonPlan;
  const primarySources = plan.canCompareNow
    ? plan.allowedSources
    : plan.contextSources;

  return primarySources.slice(0, 3).map((source) => source.ownerLabel);
}

function getComparisonNoClaimLanguage(impact: OwnerTaskImpact): string {
  const plan = impact.comparisonPlan;
  const source =
    plan.allowedSources[0] ?? plan.contextSources[0] ?? plan.futureSources[0];

  return (
    source?.noClaimLanguage ??
    "Digital Brain can preserve this task for future comparison, but it should not claim the action caused a result without stronger proof."
  );
}

function formatReviewNumber(value: number | null): string {
  if (value === null) {
    return "Not available";
  }

  return formatCount(value);
}

function formatReviewRatingValue(value: number | null): string {
  if (value === null) {
    return "Not available";
  }

  return formatRating(value);
}

function formatReviewComparisonStatus(impact: OwnerTaskImpact): string {
  const comparison = impact.reviewComparison;

  if (!comparison) {
    return "Not available";
  }

  if (comparison.canCompare) {
    return "Ready to compare";
  }

  if (!comparison.isWindowReady) {
    return "Waiting for window";
  }

  return "Needs more data";
}

function getReviewComparisonReadinessText(impact: OwnerTaskImpact): string {
  const comparison = impact.reviewComparison;

  if (!comparison) {
    return "No review comparison read is available for this task yet.";
  }

  if (comparison.canCompare) {
    return comparison.ownerSummary;
  }

  if (!comparison.isWindowReady) {
    return "Digital Brain saved the review baseline and can see the current review read, but it should wait for the watch window before presenting this as a comparison.";
  }

  return comparison.ownerSummary;
}

function getReviewComparisonBaselineLabels(impact: OwnerTaskImpact): string[] {
  const comparison = impact.reviewComparison;

  if (!comparison) {
    return [];
  }

  return [
    `Baseline reviews: ${formatReviewNumber(
      comparison.baseline.baselineCurrentReviews,
    )}`,
    `Baseline rating: ${formatReviewRatingValue(
      comparison.baseline.baselineCurrentRating,
    )}`,
    `Baseline review gap: ${formatReviewNumber(
      comparison.baseline.baselineReviewGap,
    )}`,
  ];
}

function getReviewComparisonCurrentLabels(impact: OwnerTaskImpact): string[] {
  const comparison = impact.reviewComparison;

  if (!comparison) {
    return [];
  }

  return [
    `Current reviews: ${formatReviewNumber(comparison.current.currentReviews)}`,
    `Current rating: ${formatReviewRatingValue(
      comparison.current.currentRating,
    )}`,
    `Current review gap: ${formatReviewNumber(
      comparison.current.currentReviewGap,
    )}`,
  ];
}

export function OwnerDetailSections({
  dashboard,
  tasksData,
  impactsData,
  steps,
  detailTab,
  onDetailTabChange,
}: Props) {
  const visibilityTone = getSummaryTone("visibility");
  const aiTone = getSummaryTone("ai");
  const websiteTone = getSummaryTone("website");
  const outcomesTone = getSummaryTone("outcomes");

  const visibilitySummary = dashboard.dashboard.visibilitySummary;
  const aiSummary = dashboard.dashboard.aiSummary;
  const aiReadinessScore = getAiReadinessScore(aiSummary);
  const aiPlainLanguageSummary = getAiPlainLanguageSummary(aiSummary);
  const aiTopIssue = getAiTopIssue(aiSummary);
  const aiWhyItMatters = getAiWhyItMatters(aiSummary);
  const aiNextAction = getAiNextAction(aiSummary);
  const aiEvidence = getAiEvidence(aiSummary);
  const outcomesSetupHref = dashboard.clientId
    ? `/clients/${dashboard.clientId}/projects/${dashboard.projectId}`
    : null;
  const showOutcomesSetupCta =
    !dashboard.dashboard.outcomesSummary.hasMonthlyEvents ||
    !dashboard.dashboard.outcomesSummary.hasConversionRate;
  const outcomesSummary = dashboard.dashboard.outcomesSummary;

  return (
    <section className="border-t border-[var(--border)] py-8">
      <div className="max-w-3xl">
        <SectionLabel>Details below the fold</SectionLabel>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
          Drill deeper without losing the main story
        </h2>
        <p className="mt-3 text-base leading-7 text-[var(--text-body)]">
          These tabs let you inspect the supporting evidence behind the decision
          engine without turning the page into a traditional SEO dashboard.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <TabButton
          label="Visibility details"
          active={detailTab === "visibility"}
          onClick={() => onDetailTabChange("visibility")}
        />
        <TabButton
          label="AI visibility"
          active={detailTab === "ai"}
          onClick={() => onDetailTabChange("ai")}
        />
        <TabButton
          label="Website trust"
          active={detailTab === "website"}
          onClick={() => onDetailTabChange("website")}
        />
        <TabButton
          label="Outcomes"
          active={detailTab === "outcomes"}
          onClick={() => onDetailTabChange("outcomes")}
        />
        <TabButton
          label="Task evidence"
          active={detailTab === "tasks"}
          onClick={() => onDetailTabChange("tasks")}
        />
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_0.92fr]">
        {detailTab === "visibility" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-700)]">
                Visibility details
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                Current local rank footing
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the owner-facing visibility evidence layer. It explains
                whether the tracked search is producing real footing, what the
                current problem is, and what to do next.
              </p>

              <div className="mt-6">
                <DetailRow
                  label="Visibility score"
                  value={`${visibilitySummary.visibilityReadinessScore} / 100`}
                  helper="Owner-facing visibility footing based on the tracked keyword, market, and saved rank snapshots."
                />
                <DetailRow
                  label="Plain-English read"
                  value={visibilitySummary.visibilityLabel}
                  helper={visibilitySummary.plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={visibilitySummary.topIssue}
                  helper={visibilitySummary.whyItMatters}
                />
              </div>
            </div>

            <div>
              <DetailRow
                label="Keyword"
                value={visibilitySummary.keyword ?? "Not set"}
              />
              <DetailRow
                label="Metro"
                value={visibilitySummary.metro ?? "Not set"}
              />
              <DetailRow
                label="Latest rank"
                value={
                  visibilitySummary.latestRank !== null
                    ? `#${visibilitySummary.latestRank}`
                    : "Not set"
                }
              />
              <DetailRow
                label="Best rank"
                value={
                  visibilitySummary.bestRank !== null
                    ? `#${visibilitySummary.bestRank}`
                    : "Not set"
                }
              />
              <DetailRow
                label="Previous rank"
                value={
                  visibilitySummary.previousRank !== null
                    ? `#${visibilitySummary.previousRank}`
                    : "Not set"
                }
              />
              <DetailRow
                label="Last captured"
                value={formatDate(visibilitySummary.latestCapturedAt)}
              />

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  One next action
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                  {visibilitySummary.nextAction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  {visibilitySummary.nextAction.reason}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <InlineTag>
                    Who: {visibilitySummary.nextAction.whoShouldDoIt}
                  </InlineTag>
                  <InlineTag>
                    Difficulty: {visibilitySummary.nextAction.difficulty}
                  </InlineTag>
                </div>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  {visibilitySummary.evidence.map((item, index) => (
                    <DetailBullet
                      key={`${index}-${item}`}
                      text={item}
                      color={
                        index === 0
                          ? visibilityTone.solid
                          : index === 1
                            ? "var(--accent-blue-600)"
                            : index === 2
                              ? "var(--success)"
                              : index === 3
                                ? "var(--warning)"
                                : "var(--brand-600)"
                      }
                    />
                  ))}
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Visibility navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the visibility page for the local ranking read, supporting evidence, and next visibility actions.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/projects/${dashboard.projectId}/visibility`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open visibility page
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {detailTab === "ai" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--accent-mint-600)]">
                AI visibility
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                AI readiness signals
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the owner-facing evidence layer for AI visibility. It
                focuses on whether the business identity, category clarity, and
                review signals help Google and AI systems clearly understand the
                business.
              </p>

              <div className="mt-6">
                <DetailRow
                  label="AI visibility score"
                  value={
                    aiReadinessScore !== null
                      ? `${aiReadinessScore} / 100`
                      : "Not set"
                  }
                  helper="Owner-facing AI readiness read based on saved Google Business Profile and project identity facts."
                />
                <DetailRow
                  label="Plain-English read"
                  value={aiSummary.aiReadinessLabel ?? "Not set"}
                  helper={aiPlainLanguageSummary ?? undefined}
                />
                <DetailRow
                  label="Top issue"
                  value={aiTopIssue ?? "Not set"}
                  helper={aiWhyItMatters ?? undefined}
                />
              </div>
            </div>

            <div>
              <DetailRow
                label="GBP name"
                value={aiSummary.gbpName ?? "Not set"}
              />
              <DetailRow
                label="Primary category"
                value={aiSummary.primaryCategory ?? "Not set"}
              />
              <DetailRow
                label="Review count"
                value={formatCount(aiSummary.totalReviews ?? null)}
              />
              <DetailRow
                label="Rating"
                value={formatRating(aiSummary.rating ?? null)}
              />
              <DetailRow
                label="Naming alignment"
                value={getAiNamingAlignmentLabel(aiSummary)}
                helper={getAiNamingAlignmentHelper(aiSummary)}
              />
              <DetailRow
                label="Category alignment"
                value={getAiCategoryAlignmentLabel(aiSummary)}
                helper={getAiCategoryAlignmentHelper(aiSummary)}
              />

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  One next action
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                  {aiNextAction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  {aiNextAction.reason}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <InlineTag>
                    Who: {formatWho(aiNextAction.whoShouldDoIt)}
                  </InlineTag>
                  <InlineTag>
                    Difficulty: {formatDifficulty(aiNextAction.difficulty)}
                  </InlineTag>
                </div>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  {aiEvidence.map((item, index) => (
                    <DetailBullet
                      key={`${index}-${item}`}
                      text={item}
                      color={
                        index === 0
                          ? aiTone.solid
                          : index === 1
                            ? "var(--accent-blue-600)"
                            : index === 2
                              ? "var(--success)"
                              : index === 3
                                ? "var(--warning)"
                                : "var(--brand-600)"
                      }
                    />
                  ))}
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  AI navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the AI page for the AI readiness read, supporting evidence, and next AI actions.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/projects/${dashboard.projectId}/ai`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open AI page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/identity`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open identity page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/reviews`}
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
            </div>
          </>
        ) : null}

        {detailTab === "website" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--accent-blue-600)]">
                Website trust
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                Website identity trust
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the owner-facing website trust read. It explains whether
                Digital Brain has a clear website, domain, and brand anchor to
                work from before deeper website intelligence is added.
              </p>

              <div className="mt-6">
                <DetailRow
                  label="Trust score"
                  value={`${dashboard.dashboard.websiteSummary.websiteReadinessScore} / 100`}
                  helper="Owner-facing website identity footing based on saved project data."
                />
                <DetailRow
                  label="Plain-English read"
                  value={dashboard.dashboard.websiteSummary.websiteReadinessLabel}
                  helper={dashboard.dashboard.websiteSummary.plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={dashboard.dashboard.websiteSummary.topIssue}
                  helper={dashboard.dashboard.websiteSummary.whyItMatters}
                />
              </div>
            </div>

            <div>
              <DetailRow
                label="Site URL"
                value={dashboard.dashboard.websiteSummary.siteUrl ?? "Not set"}
              />
              <DetailRow
                label="Target domain"
                value={
                  dashboard.dashboard.websiteSummary.targetDomain ?? "Not set"
                }
              />
              <DetailRow
                label="Derived site domain"
                value={
                  dashboard.dashboard.websiteSummary.derivedSiteDomain ??
                  "Not set"
                }
              />
              <DetailRow
                label="Brand name"
                value={
                  dashboard.dashboard.websiteSummary.targetBrandName ?? "Not set"
                }
              />
              <DetailRow
                label="Domain alignment"
                value={getWebsiteAlignmentLabel(
                  dashboard.dashboard.websiteSummary,
                )}
                helper={getWebsiteAlignmentHelper(
                  dashboard.dashboard.websiteSummary,
                )}
              />

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  One next action
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                  {dashboard.dashboard.websiteSummary.nextAction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  {dashboard.dashboard.websiteSummary.nextAction.reason}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <InlineTag>
                    Who:{" "}
                    {dashboard.dashboard.websiteSummary.nextAction.whoShouldDoIt}
                  </InlineTag>
                  <InlineTag>
                    Difficulty:{" "}
                    {dashboard.dashboard.websiteSummary.nextAction.difficulty}
                  </InlineTag>
                </div>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  {dashboard.dashboard.websiteSummary.evidence.map(
                    (item, index) => (
                      <DetailBullet
                        key={`${index}-${item}`}
                        text={item}
                        color={
                          index === 0
                            ? websiteTone.solid
                            : index === 1
                              ? "var(--warning)"
                            : index === 2
                                ? "var(--brand-600)"
                              : index === 3
                                  ? "var(--accent-blue-600)"
                                : "var(--success)"
                        }
                      />
                    ),
                  )}
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Website navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the website page for the website and domain read, supporting evidence, and next website actions.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/projects/${dashboard.projectId}/website`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open website page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/identity`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open identity page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/reviews`}
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
            </div>
          </>
        ) : null}

        {detailTab === "outcomes" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--success)]">
                Outcomes
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                Business impact footing
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the early owner-facing business-outcomes layer. It shows
                whether customer-event and conversion context exists yet,
                without exposing internal scoring logic.
              </p>

              <div className="mt-6">
                <DetailRow
                  label="Monthly events"
                  value={formatCount(outcomesSummary.monthlyCustomerEvents)}
                  helper="How many tracked customer events are connected."
                />
                <DetailRow
                  label="Conversion rate"
                  value={formatConversionRate(outcomesSummary.reviewConversionRate)}
                  helper="Current review-to-customer conversion rate."
                />
                <DetailRow
                  label="Current reviews"
                  value={formatCount(outcomesSummary.currentReviews)}
                  helper="Saved review count from the current GBP profile."
                />
                <DetailRow
                  label="Realistic 90-day goal"
                  value={formatCount(outcomesSummary.realisticTarget90d)}
                  helper="A practical 90-day review target based on saved outcomes capacity."
                />
              </div>
            </div>

            <div>
              <DetailRow
                label="Singular label"
                value={outcomesSummary.eventLabelSingular ?? "Not set"}
              />
              <DetailRow
                label="Plural label"
                value={outcomesSummary.eventLabelPlural ?? "Not set"}
              />
              <DetailRow
                label="Plain-English read"
                value={outcomesSummary.outcomesReadinessLabel}
              />
              <DetailRow
                label="Top competitor"
                value={
                  outcomesSummary.topCompetitorName
                    ? outcomesSummary.topCompetitorReviews !== null
                      ? `${outcomesSummary.topCompetitorName} (${formatCount(
                          outcomesSummary.topCompetitorReviews,
                        )} reviews)`
                      : outcomesSummary.topCompetitorName
                    : "Not set"
                }
              />
              <DetailRow
                label="Review gap"
                value={formatCount(outcomesSummary.gapReviews)}
              />
              <DetailRow
                label="Weekly pace"
                value={formatCount(outcomesSummary.perWeek)}
              />
              <DetailRow
                label="Months to close gap"
                value={formatCount(outcomesSummary.monthsToCloseGap)}
              />
              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  <DetailBullet
                    text={
                      outcomesSummary.gapReviews !== null
                        ? `Current review gap is ${formatCount(
                            outcomesSummary.gapReviews,
                          )}.`
                        : "A reliable review-gap read is not available yet."
                    }
                    color={outcomesTone.solid}
                  />
                  <DetailBullet
                    text={
                      outcomesSummary.realisticTarget90d !== null
                        ? `A realistic 90-day review goal is ${formatCount(
                            outcomesSummary.realisticTarget90d,
                          )}.`
                        : "A realistic 90-day review goal is not available yet."
                    }
                    color="var(--brand-600)"
                  />
                  <DetailBullet
                    text={
                      outcomesSummary.perWeek !== null
                        ? `That works out to about ${formatCount(
                            outcomesSummary.perWeek,
                          )} reviews per week.`
                        : "Weekly review pace is not available yet."
                    }
                    color="var(--accent-blue-600)"
                  />
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Outcomes navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the outcomes page for the business-results read, supporting evidence, and next outcomes actions.
                </p>

                {showOutcomesSetupCta && outcomesSetupHref ? (
                  <div className="mt-4">
                    <p className="text-sm leading-6 text-[var(--text-body)]">
                      This project needs the owner’s monthly customer count or
                      review conversion rate. Use the editable dashboard to add those
                      inputs so the owner outcomes read becomes more useful.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href={outcomesSetupHref}
                        className="px-4 py-3 text-sm font-semibold text-white"
                        style={{
                          backgroundColor: "var(--brand-700)",
                        }}
                      >
                        Open outcomes setup
                      </Link>
                      <Link
                        href={`/projects/${dashboard.projectId}/outcomes`}
                        className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                        style={{
                          border: "1px solid var(--border)",
                          backgroundColor: "transparent",
                        }}
                      >
                        Open outcomes page
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={`/projects/${dashboard.projectId}/outcomes`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open outcomes page
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {detailTab === "tasks" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-[var(--brand-700)]">
                Task evidence
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                Why these actions are on the page
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the owner-readable evidence layer for the guided
                actions. It explains what is being asked, who should do it, how
                hard it is, and what success looks like.
              </p>

              <div className="mt-6 space-y-6">
                {steps.map((step) => {
                  const stepImpact = getStepImpact(step, impactsData);
                  const comparisonSourceLabels = stepImpact
                    ? getComparisonSourceLabels(stepImpact)
                    : [];
                  const reviewBaselineLabels = stepImpact
                    ? getReviewComparisonBaselineLabels(stepImpact)
                    : [];
                  const reviewCurrentLabels = stepImpact
                    ? getReviewComparisonCurrentLabels(stepImpact)
                    : [];

                  return (
                    <div
                      key={`detail-${step.key}`}
                      className="border-t border-[var(--border)] pt-5 first:border-t-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-[var(--text-strong)]">
                          {step.title}
                        </p>
                        <InlineTag tone={getSummaryTone("visibility")}>
                          {step.status === "completed"
                            ? "Completed"
                            : step.status === "recommended"
                              ? "Recommended"
                              : "Open"}
                        </InlineTag>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                        {step.reason}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <InlineTag>Who: {step.who}</InlineTag>
                        <InlineTag>Time: {step.time}</InlineTag>
                        <InlineTag>Difficulty: {step.difficulty}</InlineTag>
                      </div>

                      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Expected benefit
                          </dt>
                          <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                            {step.expectedBenefit}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            What success looks like
                          </dt>
                          <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                            {step.proofOfCompletion}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Confidence
                          </dt>
                          <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                            {step.confidenceLabel}
                          </dd>
                        </div>
                      </dl>

                      {getStepCompletionProofNote(step) ? (
                        <div className="mt-4 border-t border-[var(--border)] pt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Completion proof
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                            {getStepCompletionProofNote(step)}
                          </p>
                        </div>
                      ) : null}

                      {stepImpact ? (
                        <div className="mt-4 border-t border-[var(--border)] pt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                              Impact watch
                            </p>
                            <InlineTag>{formatImpactStatus(stepImpact)}</InlineTag>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                            {getImpactWatchText(stepImpact)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <InlineTag>
                              Eligible: {formatImpactEligibleDate(stepImpact.readiness.eligibleOn)}
                            </InlineTag>
                            <InlineTag>
                              {formatDaysRemaining(
                                stepImpact.readiness.daysRemaining,
                              )}
                            </InlineTag>
                            <InlineTag>
                              Ready to compare:{" "}
                              {stepImpact.readiness.isWindowReady ? "Yes" : "No"}
                            </InlineTag>
                          </div>

                          <div className="mt-4 border-t border-[var(--border)] pt-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                Future comparison plan
                              </p>
                              <InlineTag>
                                {formatComparisonCapability(stepImpact)}
                              </InlineTag>
                              <InlineTag>{formatComparisonPolicy(stepImpact)}</InlineTag>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                              {stepImpact.comparisonPlan.ownerSummary}
                            </p>

                            {comparisonSourceLabels.length > 0 ? (
                              <div className="mt-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                  Comparison signals
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {comparisonSourceLabels.map((label) => (
                                    <InlineTag key={`${step.key}-${label}`}>
                                      {label}
                                    </InlineTag>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {stepImpact.comparisonPlan.blockedReason ? (
                              <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                                {stepImpact.comparisonPlan.blockedReason}
                              </p>
                            ) : null}

                            <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                              {getComparisonNoClaimLanguage(stepImpact)}
                            </p>
                          </div>

                          {stepImpact.reviewComparison ? (
                            <div className="mt-4 border-t border-[var(--border)] pt-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                  Review comparison read
                                </p>
                                <InlineTag>
                                  {formatReviewComparisonStatus(stepImpact)}
                                </InlineTag>
                                <InlineTag>Read-only</InlineTag>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                                {getReviewComparisonReadinessText(stepImpact)}
                              </p>

                              {reviewBaselineLabels.length > 0 ? (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                    Saved baseline
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {reviewBaselineLabels.map((label) => (
                                      <InlineTag key={`${step.key}-${label}`}>
                                        {label}
                                      </InlineTag>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {reviewCurrentLabels.length > 0 ? (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                    Current read
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {reviewCurrentLabels.map((label) => (
                                      <InlineTag key={`${step.key}-${label}`}>
                                        {label}
                                      </InlineTag>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {stepImpact.reviewComparison.canCompare ? (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                    Conservative comparison
                                  </p>
                                  <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--text-body)]">
                                    {stepImpact.reviewComparison.signals.map(
                                      (signal) => (
                                        <li key={`${step.key}-${signal.key}`}>
                                          {signal.ownerRead}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              ) : null}

                              {stepImpact.reviewComparison.blockedReason ? (
                                <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                                  {stepImpact.reviewComparison.blockedReason}
                                </p>
                              ) : null}

                              <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                                {stepImpact.reviewComparison.noClaimLanguage}
                              </p>
                            </div>
                          ) : null}

                          <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">
                            This is timing metadata only. Digital Brain has not
                            claimed this action improved rankings, reviews, or
                            business outcomes yet.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <DetailRow
                label="Open tasks"
                value={String(tasksData.summary.openTasks)}
                helper="Tasks still waiting for completion."
              />
              <DetailRow
                label="Completed tasks"
                value={String(tasksData.summary.completedTasks)}
                helper="Tasks already marked complete."
              />
              <DetailRow
                label="Snapshot priorities"
                value={String(dashboard.dashboard.summary.priorityCount)}
                helper="Owner snapshot recommendations currently available."
              />
              <DetailRow
                label="Impact watches"
                value={String(impactsData.summary.waitingForWindow)}
                helper="Completed action records waiting for their comparison window."
              />
              <DetailRow
                label="Ready to compare"
                value={String(impactsData.summary.computedWindowReady)}
                helper="Impact watches whose waiting window has elapsed. This does not claim the action worked yet."
              />
              <DetailRow
                label="Comparable later"
                value={String(impactsData.summary.comparableNow)}
                helper="Impact watches with a safe comparison source already mapped. This still does not claim attribution."
              />
              <DetailRow
                label="Review reads"
                value={String(impactsData.summary.reviewComparisons)}
                helper="Review impact watches with read-only baseline and current review data available."
              />
              <DetailRow
                label="Review reads ready"
                value={String(impactsData.summary.reviewComparisonsReady)}
                helper="Review reads whose watch window has elapsed and can be compared conservatively."
              />
              <DetailRow
                label="Context only"
                value={String(impactsData.summary.contextOnly)}
                helper="Impact watches that can show context but should not be presented as proof."
              />
              <DetailRow
                label="Future source needed"
                value={String(impactsData.summary.futureRequired)}
                helper="Impact watches that need future outcome data before comparison is useful."
              />
              <DetailRow
                label="Impact records"
                value={String(impactsData.summary.totalImpacts)}
                helper="Historical owner action records being preserved for outcome attribution."
              />
              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  <DetailBullet
                    text="These are simplified owner actions, not a raw issue dump."
                    color="var(--brand-600)"
                  />
                  <DetailBullet
                    text="Completion tracking helps prove momentum and reinforce confidence."
                    color="var(--success)"
                  />
                  <DetailBullet
                    text={
                      impactsData.summary.computedWindowReady > 0
                        ? `${formatCount(
                            impactsData.summary.computedWindowReady,
                          )} completed action record(s) are ready for a future comparison pass.`
                        : impactsData.summary.totalImpacts > 0
                          ? `${formatCount(
                              impactsData.summary.waitingForWindow,
                            )} completed action record(s) are being watched for later outcome comparison.`
                          : "No completed action impact records are being watched yet."
                    }
                    color="var(--warning)"
                  />
                  <DetailBullet
                    text={
                      impactsData.summary.reviewComparisons > 0
                        ? `${formatCount(
                            impactsData.summary.reviewComparisons,
                          )} review comparison read(s) have saved baseline and current review data available.`
                        : "No review comparison reads are available yet."
                    }
                    color="var(--brand-700)"
                  />
                  <DetailBullet
                    text="The decision engine stays in the background while the owner sees only the next useful move."
                    color="var(--accent-blue-600)"
                  />
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Task navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the action center to move from explanation into execution.
                  This is the fastest path from “why this matters” to the
                  owner-facing working order.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/projects/${dashboard.projectId}/actions`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open action center
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
