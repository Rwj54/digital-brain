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
  steps: RenderStep[];
  detailTab: DetailTab;
  onDetailTabChange: (tab: DetailTab) => void;
};

export function OwnerDetailSections({
  dashboard,
  tasksData,
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
                  Open the full visibility page for the dedicated local ranking
                  read, supporting evidence, and owner-facing visibility action
                  guidance.
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
                    Open full visibility page
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
                Machine-readiness signals
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                This is the owner-facing evidence layer for AI visibility. It
                focuses on whether the business identity, category clarity, and
                review signals give machines enough confidence to understand the
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
                  helper="Owner-facing machine-readiness footing based on saved GBP and project identity facts."
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
                  Open the full AI visibility page for the dedicated
                  machine-readiness read, supporting evidence, and owner-facing
                  AI action guidance.
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
                    Open full AI visibility page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/identity`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open business identity page
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
                  Open the full website page for the dedicated website identity
                  read, supporting evidence, and owner-facing website action
                  guidance.
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
                    Open full website page
                  </Link>
                  <Link
                    href={`/projects/${dashboard.projectId}/identity`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open business identity page
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
                  value={formatCount(
                    dashboard.dashboard.outcomesSummary.monthlyCustomerEvents,
                  )}
                  helper="How many tracked customer events are connected."
                />
                <DetailRow
                  label="Conversion rate"
                  value={formatConversionRate(
                    dashboard.dashboard.outcomesSummary.reviewConversionRate,
                  )}
                  helper="Current review-to-customer conversion footing."
                />
              </div>
            </div>

            <div>
              <DetailRow
                label="Singular label"
                value={
                  dashboard.dashboard.outcomesSummary.eventLabelSingular ??
                  "Not set"
                }
              />
              <DetailRow
                label="Plural label"
                value={
                  dashboard.dashboard.outcomesSummary.eventLabelPlural ??
                  "Not set"
                }
              />
              <DetailRow
                label="Plain-English read"
                value={dashboard.dashboard.outcomesSummary.outcomesReadinessLabel}
              />
              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  What this tells you now
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                  <DetailBullet
                    text="This is the beginning of the business-results layer, not the full outcome engine."
                    color={outcomesTone.solid}
                  />
                  <DetailBullet
                    text="Once event and conversion data deepen, this section becomes much more valuable."
                    color="var(--brand-600)"
                  />
                  <DetailBullet
                    text="Right now this helps owners see whether visibility work is being tied to real outcomes."
                    color="var(--accent-blue-600)"
                  />
                </ul>
              </div>

              <div className="border-t border-[var(--border)] py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Outcomes navigation
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  Open the full outcomes page for the dedicated business-results
                  read, supporting evidence, and owner-facing outcomes action
                  guidance.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={`/projects/${dashboard.projectId}/outcomes`}
                    className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                    style={{
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                    }}
                  >
                    Open full outcomes page
                  </Link>
                </div>
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
                {steps.map((step) => (
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
                  </div>
                ))}
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
                    text="The decision engine stays in the background while the owner sees only the next useful move."
                    color="var(--accent-blue-600)"
                  />
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}