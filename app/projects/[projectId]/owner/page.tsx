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

export default function OwnerDashboardPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
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
          websiteResponse,
          aiResponse,
        ] = await Promise.all([
          fetch(`/api/projects/${projectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${projectId}/owner-tasks`, {
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
          !websiteResponse.ok ||
          !aiResponse.ok
        ) {
          throw new Error("Failed to load owner dashboard.");
        }

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;
        const websiteJson =
          (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;
        const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;

        setDashboard({
          ...dashboardJson,
          dashboard: {
            ...dashboardJson.dashboard,
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
        websiteResponse,
        aiResponse,
      ] = await Promise.all([
        fetch(`/api/projects/${projectId}/owner-dashboard`, {
          cache: "no-store",
        }),
        fetch(`/api/projects/${projectId}/owner-tasks`, {
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
        !websiteResponse.ok ||
        !aiResponse.ok
      ) {
        throw new Error("Failed to refresh owner dashboard.");
      }

      const dashboardJson =
        (await dashboardResponse.json()) as OwnerDashboardResponse;
      const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;
      const websiteJson =
        (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;
      const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;

      setDashboard({
        ...dashboardJson,
        dashboard: {
          ...dashboardJson.dashboard,
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

  const aiSummary = dashboard.dashboard.aiSummary;
  const aiReadinessScore = getAiReadinessScore(aiSummary);
  const aiPlainLanguageSummary = getAiPlainLanguageSummary(aiSummary);
  const aiTopIssue = getAiTopIssue(aiSummary);
  const aiWhyItMatters = getAiWhyItMatters(aiSummary);
  const aiNextAction = getAiNextAction(aiSummary);
  const aiEvidence = getAiEvidence(aiSummary);

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Owner dashboard</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                {dashboard.dashboard.hero.headline}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                {dashboard.dashboard.hero.supportLine}
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {primaryStep?.title ?? dashboard.dashboard.hero.primaryActionText}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {primaryStep?.reason ??
                  dashboard.dashboard.progress.nextLikelyImprovement}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag>Who: {primaryStep?.who ?? "Owner"}</InlineTag>
                <InlineTag>Time: {primaryStep?.time ?? "Not set"}</InlineTag>
                <InlineTag>
                  Difficulty: {primaryStep?.difficulty ?? "Not set"}
                </InlineTag>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta
              label="Business"
              value={dashboard.projectDisplayName ?? "Not set"}
            />
            <HeaderMeta
              label="Domain"
              value={dashboard.domainDisplayValue ?? "Not set"}
            />
            <HeaderMeta
              label="Location / Market"
              value={
                dashboard.projectLocationLabel ??
                dashboard.projectMetro ??
                "Not set"
              }
            />
            <HeaderMeta label="Scope" value={dashboard.pageScopeLabel} />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(dashboard.capturedAt)}
            />
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
            <SummaryStat
              label="Start here"
              value={
                primaryStep?.title ?? dashboard.dashboard.hero.primaryActionText
              }
            />
            <SummaryStat
              label="Open tasks"
              value={String(tasksData.summary.openTasks)}
            />
            <SummaryStat
              label="Completion rate"
              value={formatPercent(dashboard.dashboard.summary.completedTaskRate)}
            />
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Health markers</SectionLabel>
          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            {dashboard.dashboard.healthMarkers.map((marker) => (
              <HealthMarkerItem key={marker.label} marker={marker} />
            ))}
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.22fr_0.78fr]">
          <section id="next-steps">
            <SectionLabel>Your next 3 steps</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              Follow these in order
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              This is the guided action flow that should give the clearest next wins
              without making the owner learn SEO or AI visibility jargon.
            </p>

            <div className="mt-6">
              {steps.map((step, index) => {
                const tone = getStepTone(step.status);
                const numberTone = getStepNumberTone(step.index);
                const isTask = step.kind === "task";
                const isSaving = isTask && savingTaskId === step.task.id;
                const isCompleted = step.status === "completed";
                const isLast = index === steps.length - 1;

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

              {stepsCount === 0 ? (
                <div className="border-t border-[var(--border)] pt-5 text-sm text-[var(--text-body)]">
                  No task or priority steps are available yet.
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What Google wants next</SectionLabel>

              <div className="mt-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-700)]">
                    Helping now
                  </p>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
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
                    Current local rank footing
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                    This shows the ranking context an owner can understand: what
                    keyword is active, what metro is being tracked, and whether the
                    business is moving into a stronger position.
                  </p>

                  <div className="mt-6">
                    <DetailRow
                      label="Latest rank"
                      value={
                        dashboard.dashboard.visibilitySummary.latestRank?.toString() ??
                        "Not set"
                      }
                      helper="Most recent captured position."
                    />
                    <DetailRow
                      label="Best rank"
                      value={
                        dashboard.dashboard.visibilitySummary.bestRank?.toString() ??
                        "Not set"
                      }
                      helper="Best observed position in current data."
                    />
                    <DetailRow
                      label="Last captured"
                      value={formatDate(
                        dashboard.dashboard.visibilitySummary.latestCapturedAt,
                      )}
                      helper="Most recent time this visibility snapshot was refreshed."
                    />
                  </div>
                </div>

                <div>
                  <DetailRow
                    label="Keyword"
                    value={dashboard.dashboard.visibilitySummary.keyword ?? "Not set"}
                  />
                  <DetailRow
                    label="Metro"
                    value={dashboard.dashboard.visibilitySummary.metro ?? "Not set"}
                  />
                  <DetailRow
                    label="Plain-English read"
                    value={dashboard.dashboard.visibilitySummary.visibilityLabel}
                  />
                  <div className="border-t border-[var(--border)] py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      What this tells you now
                    </p>
                    <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                      <DetailBullet
                        text="Visibility is tied to one active keyword and one metro context."
                        color={visibilityTone.solid}
                      />
                      <DetailBullet
                        text="The latest rank is the clearest near-term signal for owner-facing progress."
                        color="var(--accent-blue-600)"
                      />
                      <DetailBullet
                        text="Best rank helps show whether the current effort is capable of breaking through."
                        color="var(--success)"
                      />
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
                    This is the early owner-facing business-outcomes layer. It
                    shows whether customer-event and conversion context exists yet,
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
                    This is the owner-readable evidence layer for the guided actions.
                    It explains what is being asked, who should do it, how hard it
                    is, and what success looks like.
                  </p>

                  <div className="mt-6 space-y-6">
                    {steps.map((step) => {
                      const tone = getStepTone(step.status);

                      return (
                        <div
                          key={`detail-${step.key}`}
                          className="border-t border-[var(--border)] pt-5 first:border-t-0 first:pt-0"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-[var(--text-strong)]">
                              {step.title}
                            </p>
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