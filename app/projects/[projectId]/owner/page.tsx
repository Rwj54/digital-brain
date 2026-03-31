"use client";

import { useEffect, useMemo, useState } from "react";

import {
  formatConfidence,
  formatCount,
  formatConversionRate,
  formatDate,
  formatDifficulty,
  formatPercent,
  formatRating,
  formatStatus,
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
  getStepNumberTone,
  getStepTone,
  getSummaryTone,
  getWebsiteAlignmentHelper,
  getWebsiteAlignmentLabel,
} from "@/lib/owner/formatters";
import {
  type DetailTab,
  type OwnerAiSummaryResponse,
  type OwnerDashboardResponse,
  type OwnerTask,
  type OwnerTasksResponse,
  type OwnerWebsiteSummaryResponse,
  type Props,
  type RenderStep,
} from "@/lib/owner/types";
import {
  DetailBullet,
  DetailRow,
  HeaderMeta,
  HealthMarkerItem,
  InlineTag,
  SectionLabel,
  SummaryStat,
  TabButton,
} from "@/components/owner/OwnerPagePrimitives";

type VisibilitySummary =
  OwnerDashboardResponse["dashboard"]["visibilitySummary"] & {
    previousRank: number | null;
    visibilityReadinessScore: number;
    plainLanguageSummary: string;
    topIssue: string;
    whyItMatters: string;
    nextAction: {
      title: string;
      whoShouldDoIt: string;
      difficulty: string;
      reason: string;
    };
    evidence: string[];
  };

type OwnerVisibilitySummaryResponse = {
  ok: boolean;
  projectId: string;
  summary: VisibilitySummary;
};

type OwnerDashboardView = Omit<OwnerDashboardResponse, "dashboard"> & {
  dashboard: Omit<OwnerDashboardResponse["dashboard"], "visibilitySummary"> & {
    visibilitySummary: VisibilitySummary;
  };
};

export default function OwnerDashboardPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboard, setDashboard] = useState<OwnerDashboardView | null>(null);
  const [tasksData, setTasksData] = useState<OwnerTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [detailTab, setDetailTab] = useState<DetailTab>("visibility");

  useEffect(() => {
    async function init() {
      const resolved = await params;
      setProjectId(resolved.projectId);
    }

    void init();
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardResponse,
          tasksResponse,
          visibilityResponse,
          websiteResponse,
          aiResponse,
        ] = await Promise.all([
          fetch(`/api/projects/${projectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${projectId}/owner-tasks`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${projectId}/owner-visibility-summary`, {
            cache: "no-store",
          }),
                    fetch(`/api/projects/${projectId}/owner-website-summary`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${projectId}/owner-ai-summary`, {
            cache: "no-store",
          }),
        ]);

        if (
          !dashboardResponse.ok ||
          !tasksResponse.ok ||
          !visibilityResponse.ok ||
          !websiteResponse.ok ||
          !aiResponse.ok
        ) {
          throw new Error("Failed to load owner dashboard.");
        }

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;
        const visibilityJson =
          (await visibilityResponse.json()) as OwnerVisibilitySummaryResponse;
        const websiteJson =
          (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;
        const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;

        setDashboard({
          ...dashboardJson,
          dashboard: {
            ...dashboardJson.dashboard,
            visibilitySummary: visibilityJson.summary,
            aiSummary: aiJson.summary,
            websiteSummary: websiteJson.summary,
          },
        });
        setTasksData(tasksJson);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load owner dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [projectId]);

  async function toggleTask(task: OwnerTask) {
    try {
      setSavingTaskId(task.id);

      const nextStatus = task.status === "completed" ? "open" : "completed";

      const response = await fetch(
        `/api/projects/${projectId}/owner-tasks/${task.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update task.");
      }

      const [
        dashboardResponse,
        tasksResponse,
        visibilityResponse,
        websiteResponse,
        aiResponse,
      ] = await Promise.all([
        fetch(`/api/projects/${projectId}/owner-dashboard`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/owner-tasks`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/owner-visibility-summary`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/owner-website-summary`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/owner-ai-summary`, {
          cache: "no-store",
        }),
      ]);

      if (
        !dashboardResponse.ok ||
        !tasksResponse.ok ||
        !visibilityResponse.ok ||
        !websiteResponse.ok ||
        !aiResponse.ok
      ) {
        throw new Error("Failed to refresh owner dashboard.");
      }

      const dashboardJson =
        (await dashboardResponse.json()) as OwnerDashboardResponse;
      const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;
      const visibilityJson =
        (await visibilityResponse.json()) as OwnerVisibilitySummaryResponse;
      const websiteJson =
        (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;
      const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;
            setDashboard({
        ...dashboardJson,
        dashboard: {
          ...dashboardJson.dashboard,
          visibilitySummary: visibilityJson.summary,
          aiSummary: aiJson.summary,
          websiteSummary: websiteJson.summary,
        },
      });
      setTasksData(tasksJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setSavingTaskId(null);
    }
  }

  const steps = useMemo<RenderStep[]>(() => {
    if (!dashboard || !tasksData) {
      return [];
    }

    if (tasksData.tasks.length > 0) {
      return [...tasksData.tasks]
        .sort((a, b) => {
          const aStatus = a.status === "open" ? 0 : 1;
          const bStatus = b.status === "open" ? 0 : 1;

          if (aStatus !== bStatus) {
            return aStatus - bStatus;
          }

          return a.sort_order - b.sort_order;
        })
        .slice(0, 3)
        .map((task, index) => ({
          key: task.id,
          kind: "task" as const,
          index: index + 1,
          title: task.title,
          reason: task.plain_language_reason ?? "No explanation available.",
          who: task.who_should_do_it
            ? formatWho(task.who_should_do_it)
            : "Not set",
          time: task.time_to_complete_estimate ?? "Not set",
          difficulty: task.difficulty
            ? formatDifficulty(task.difficulty)
            : "Not set",
          expectedBenefit: task.expected_benefit ?? "Expected benefit not set.",
          proofOfCompletion:
            task.proof_of_completion ?? "Proof of completion not set.",
          confidenceLabel: formatConfidence(task.confidence_level),
          status: task.status,
          task,
        }));
    }

    return dashboard.dashboard.topPriorities
      .slice(0, 3)
      .map((priority, index) => ({
        key: `${priority.sort_order}-${priority.title}`,
        kind: "priority" as const,
        index: index + 1,
        title: priority.title,
        reason: priority.plain_language_reason,
        who: formatWho(priority.who_should_do_it),
        time: priority.time_to_complete_estimate,
        difficulty: formatDifficulty(priority.difficulty),
        expectedBenefit: priority.expected_benefit,
        proofOfCompletion: priority.proof_of_completion,
        confidenceLabel: formatConfidence(priority.confidence_level),
        status: "recommended",
      }));
  }, [dashboard, tasksData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading owner dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (error || !dashboard || !tasksData) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load owner dashboard."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const stepsCount = steps.length;
  const primaryStep = steps[0];
  const visibilityTone = getSummaryTone("visibility");
  const aiTone = getSummaryTone("ai");
  const websiteTone = getSummaryTone("website");
  const outcomesTone = getSummaryTone("outcomes");

  const visibilitySummary = dashboard.dashboard.visibilitySummary;
  const visibilityNextAction = visibilitySummary.nextAction;

  const aiSummary = dashboard.dashboard.aiSummary;
  const aiReadinessScore = getAiReadinessScore(aiSummary);
  const aiPlainLanguageSummary = getAiPlainLanguageSummary(aiSummary);
  const aiTopIssue = getAiTopIssue(aiSummary);
  const aiWhyItMatters = getAiWhyItMatters(aiSummary);
  const aiNextAction = getAiNextAction(aiSummary);
                  return (
                  <article
                    key={step.key}
                    className={`grid gap-4 py-6 md:grid-cols-[56px_1fr_auto] md:items-start ${
                      isLast ? "" : "border-b border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center md:justify-center">
                      <div
                        className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                        style={{
                          backgroundColor: numberTone.soft,
                          color: numberTone.solid,
                        }}
                      >
                        {step.index}
                      </div>
                    </div>

                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold tracking-tight text-[var(--text-strong)]">
                          {step.title}
                        </h3>
                        <InlineTag tone={tone}>
                          {formatStatus(step.status)}
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

                    <div className="md:min-w-[148px]">
                      {isTask ? (
                        <button
                          type="button"
                          onClick={() => toggleTask(step.task)}
                          disabled={isSaving}
                          className="inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                          style={{
                            backgroundColor: isCompleted
                              ? "var(--reference-soft)"
                              : "var(--text-strong)",
                            color: isCompleted ? "var(--text-strong)" : "#ffffff",
                            border: isCompleted
                              ? "1px solid var(--border)"
                              : "1px solid var(--text-strong)",
                          }}
                        >
                          {isSaving
                            ? "Saving..."
                            : isCompleted
                              ? "Reopen task"
                              : "Mark complete"}
                        </button>
                      ) : (
                        <div className="pt-2 text-sm font-semibold text-[var(--accent-blue-600)]">
                          Suggested next action
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
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
                                      {dashboard.dashboard.guidance.helpingNow.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[var(--brand-600)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    Google still wants
                  </p>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                    {dashboard.dashboard.guidance.googleStillWants.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[var(--warning)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress and proof</SectionLabel>

              <div className="mt-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                      {formatPercent(dashboard.dashboard.summary.completedTaskRate)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                      completion rate across current owner tasks
                    </p>
                  </div>

                  <InlineTag
                    tone={{ solid: "var(--success)", soft: "var(--success-soft)" }}
                  >
                    {tasksData.summary.completedTasks} completed
                  </InlineTag>
                </div>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--success)]"
                    style={{
                      width: formatPercent(
                        dashboard.dashboard.summary.completedTaskRate,
                      ),
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <SummaryStat
                    label="Open now"
                    value={String(tasksData.summary.openTasks)}
                  />
                  <SummaryStat
                    label="Current priorities"
                    value={String(dashboard.dashboard.summary.priorityCount)}
                  />
                  <SummaryStat
                    label="Last updated"
                    value={formatDate(dashboard.dashboard.progress.lastUpdated)}
                  />
                </div>
              </div>
            </section>
          </aside>
        </section>

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
              onClick={() => setDetailTab("visibility")}
            />
            <TabButton
              label="AI visibility"
              active={detailTab === "ai"}
              onClick={() => setDetailTab("ai")}
            />
            <TabButton
              label="Website trust"
              active={detailTab === "website"}
              onClick={() => setDetailTab("website")}
            />
            <TabButton
              label="Outcomes"
              active={detailTab === "outcomes"}
              onClick={() => setDetailTab("outcomes")}
            />
            <TabButton
                          label="Task evidence"
              active={detailTab === "tasks"}
              onClick={() => setDetailTab("tasks")}
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
                    Local visibility footing
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                    This is the owner-facing visibility evidence layer. It shows how
                    the business is performing for the primary tracked search in the
                    saved market, what the main issue is, and what to do next.
                  </p>

                  <div className="mt-6">
                    <DetailRow
                      label="Visibility score"
                      value={`${visibilitySummary.visibilityReadinessScore} / 100`}
                      helper="Owner-facing visibility footing for the currently tracked search."
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
                    label="Previous rank"
                    value={
                      visibilitySummary.previousRank !== null
                        ? `#${visibilitySummary.previousRank}`
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
                    label="Last captured"
                    value={formatDate(visibilitySummary.latestCapturedAt)}
                  />

                  <div className="border-t border-[var(--border)] py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      One next action
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                      {visibilityNextAction.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                      {visibilityNextAction.reason}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <InlineTag>
                        Who: {formatWho(visibilityNextAction.whoShouldDoIt)}
                      </InlineTag>
                      <InlineTag>
                        Difficulty: {formatDifficulty(visibilityNextAction.difficulty)}
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
                                    : index === 4
                                      ? "var(--brand-600)"
                                      : "var(--accent-mint-600)"
                          }
                        />
                      ))}
                    </ul>
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
                      helper={
                        dashboard.dashboard.websiteSummary.plainLanguageSummary
                      }
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
                    value={dashboard.dashboard.websiteSummary.targetDomain ?? "Not set"}
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
                      dashboard.dashboard.websiteSummary.targetBrandName ??
                      "Not set"
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
                        {dashboard.dashboard.websiteSummary.nextAction
                          .whoShouldDoIt}
                      </InlineTag>
                      <InlineTag>
                        Difficulty:{" "}
                        {dashboard.dashboard.websiteSummary.nextAction.difficulty}
                      </InlineTag>
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
      </div>
    </main>
  );
}