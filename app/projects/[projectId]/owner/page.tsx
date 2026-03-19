"use client";

import { useEffect, useState } from "react";

import { OwnerCard } from "@/components/owner/OwnerCard";
import { OwnerPill } from "@/components/owner/OwnerPill";
import { OwnerStatCard } from "@/components/owner/OwnerStatCard";

type OwnerPriority = {
  title: string;
  plain_language_reason: string;
  why_now: string;
  expected_benefit: string;
  who_should_do_it: string;
  difficulty: string;
  time_to_complete_estimate: string;
  proof_of_completion: string;
  confidence_level: number;
  source: string;
  sort_order: number;
  task_type: string;
  task_data: Record<string, unknown>;
};

type OwnerTask = {
  id: string;
  project_id: string;
  priority_snapshot_id: string | null;
  title: string;
  plain_language_reason: string | null;
  why_now: string | null;
  expected_benefit: string | null;
  who_should_do_it: string | null;
  difficulty: string | null;
  time_to_complete_estimate: string | null;
  proof_of_completion: string | null;
  confidence_level: number | null;
  status: string;
  sort_order: number;
  task_type: string | null;
  task_data: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

type OwnerDashboardResponse = {
  ok: boolean;
  projectId: string;
  projectDisplayName: string | null;
  projectCategory: string | null;
  projectMetro: string | null;
  capturedAt: string;
  dashboard: {
    topPriorities: OwnerPriority[];
    summary: {
      priorityCount: number;
      hasPriorities: boolean;
      totalTasks: number;
      openTasks: number;
      completedTasks: number;
      completedTaskRate: number;
    };
    visibilitySummary: {
      hasActiveKeyword: boolean;
      keyword: string | null;
      metro: string | null;
      latestRank: number | null;
      bestRank: number | null;
      latestCapturedAt: string | null;
      visibilityLabel: string;
    };
    aiSummary: {
      gbpName: string | null;
      primaryCategory: string | null;
      totalReviews: number | null;
      rating: number | null;
      hasBusinessName: boolean;
      hasPrimaryCategory: boolean;
      hasReviewSignals: boolean;
      aiReadinessLabel: string;
    };
    websiteSummary: {
      siteUrl: string | null;
      targetDomain: string | null;
      targetBrandName: string | null;
      hasSiteUrl: boolean;
      hasTargetDomain: boolean;
      hasBrandName: boolean;
      websiteReadinessLabel: string;
    };
    outcomesSummary: {
      monthlyCustomerEvents: number | null;
      reviewConversionRate: number | null;
      eventLabelSingular: string | null;
      eventLabelPlural: string | null;
      hasMonthlyEvents: boolean;
      hasConversionRate: boolean;
      outcomesReadinessLabel: string;
    };
  };
};

type OwnerTasksResponse = {
  ok: boolean;
  projectId: string;
  statusFilter: string;
  count: number;
  summary: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
  };
  tasks: OwnerTask[];
};

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatWho(value: string): string {
  return value.replaceAll("_", " ");
}

function formatStatus(value: string): string {
  return value === "completed" ? "Completed" : "Open";
}

export default function OwnerDashboardPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null);
  const [tasksData, setTasksData] = useState<OwnerTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

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

        const [dashboardResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects/${projectId}/owner-dashboard`, { cache: "no-store" }),
          fetch(`/api/projects/${projectId}/owner-tasks`, { cache: "no-store" }),
        ]);

        if (!dashboardResponse.ok || !tasksResponse.ok) {
          throw new Error("Failed to load owner dashboard.");
        }

        const dashboardJson = (await dashboardResponse.json()) as OwnerDashboardResponse;
        const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;

        setDashboard(dashboardJson);
        setTasksData(tasksJson);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load owner dashboard.");
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

      const response = await fetch(`/api/projects/${projectId}/owner-tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task.");
      }

      const [dashboardResponse, tasksResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}/owner-dashboard`, { cache: "no-store" }),
        fetch(`/api/projects/${projectId}/owner-tasks`, { cache: "no-store" }),
      ]);

      if (!dashboardResponse.ok || !tasksResponse.ok) {
        throw new Error("Failed to refresh owner dashboard.");
      }

      const dashboardJson = (await dashboardResponse.json()) as OwnerDashboardResponse;
      const tasksJson = (await tasksResponse.json()) as OwnerTasksResponse;

      setDashboard(dashboardJson);
      setTasksData(tasksJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setSavingTaskId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p className="text-base text-slate-700">Loading owner dashboard...</p>
        </div>
      </main>
    );
  }

  if (error || !dashboard || !tasksData) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p className="text-base text-red-700">{error || "Failed to load owner dashboard."}</p>
        </div>
      </main>
    );
  }

  const openTasks = tasksData.tasks.filter((task) => task.status === "open");
  const completedTasks = tasksData.tasks.filter((task) => task.status === "completed");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <OwnerCard className="p-6">
          <div className="space-y-3">
            <OwnerPill label="Owner Dashboard" />

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                What to do now
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-700">
                Clear priorities, guided next actions, and the current signals shaping your local
                visibility.
              </p>
            </div>

            <div className="grid gap-3 pt-2 md:grid-cols-2">
              <OwnerCard className="border-sky-200 bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-800">
                  Business
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dashboard.projectDisplayName ?? "Not set"}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {dashboard.projectCategory ?? "Category not set"}
                </p>
                <p className="text-sm text-slate-700">{dashboard.projectMetro ?? "Metro not set"}</p>
              </OwnerCard>

              <OwnerCard className="bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Snapshot date
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{dashboard.capturedAt}</p>
                <p className="mt-1 text-sm text-slate-700">
                  This view keeps the next best action clear and owner-friendly.
                </p>
              </OwnerCard>
            </div>
          </div>
        </OwnerCard>

        <section className="grid gap-4 md:grid-cols-4">
          <OwnerStatCard
            label="Open tasks"
            value={<p className="text-3xl font-semibold text-slate-950">{dashboard.dashboard.summary.openTasks}</p>}
          />
          <OwnerStatCard
            label="Completed tasks"
            value={<p className="text-3xl font-semibold text-slate-950">{dashboard.dashboard.summary.completedTasks}</p>}
          />
          <OwnerStatCard
            label="Completion rate"
            value={<p className="text-3xl font-semibold text-slate-950">{formatPercent(dashboard.dashboard.summary.completedTaskRate)}</p>}
          />
          <OwnerStatCard
            label="Visibility"
            accent
            value={<p className="text-xl font-semibold text-slate-950">{dashboard.dashboard.visibilitySummary.visibilityLabel}</p>}
          />
        </section>

        <OwnerCard className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top 3 priorities</h2>
            <p className="mt-1 text-sm text-slate-700">Focus on these first before anything else.</p>
          </div>

          <div className="space-y-4">
            {dashboard.dashboard.topPriorities.map((priority) => (
              <OwnerCard
                key={`${priority.sort_order}-${priority.title}`}
                className="p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <OwnerPill label={`Priority ${priority.sort_order}`} />
                    <h3 className="text-xl font-semibold text-slate-950">{priority.title}</h3>
                    <p className="text-base leading-7 text-slate-700">
                      {priority.plain_language_reason}
                    </p>
                  </div>

                  <OwnerCard className="bg-slate-50 p-4 md:min-w-[240px]">
                    <div className="grid gap-2 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-950">Who should do it:</span>{" "}
                        {formatWho(priority.who_should_do_it)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Difficulty:</span>{" "}
                        {priority.difficulty}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Time:</span>{" "}
                        {priority.time_to_complete_estimate}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-950">Confidence:</span>{" "}
                        {formatPercent(priority.confidence_level)}
                      </p>
                    </div>
                  </OwnerCard>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <OwnerCard className="bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">Why now</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{priority.why_now}</p>
                  </OwnerCard>

                  <OwnerCard className="bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-950">Expected benefit</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {priority.expected_benefit}
                    </p>
                  </OwnerCard>
                </div>
              </OwnerCard>
            ))}
          </div>
        </OwnerCard>

        <OwnerCard className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Current tasks</h2>
            <p className="mt-1 text-sm text-slate-700">
              These are the saved tasks for this project right now.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-950">Open tasks</h3>
              <div className="space-y-4">
                {openTasks.length === 0 ? (
                  <OwnerCard className="bg-slate-50 p-5">
                    <p className="text-sm text-slate-700">No open tasks right now.</p>
                  </OwnerCard>
                ) : (
                  openTasks.map((task) => (
                    <OwnerCard
                      key={task.id}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <OwnerPill label={`Task ${task.sort_order}`} />
                          <h3 className="text-xl font-semibold text-slate-950">{task.title}</h3>
                          <p className="text-base leading-7 text-slate-700">
                            {task.plain_language_reason ?? "No explanation available."}
                          </p>
                        </div>

                        <OwnerCard className="bg-slate-50 p-4 md:min-w-[240px]">
                          <div className="grid gap-2 text-sm text-slate-700">
                            <p>
                              <span className="font-semibold text-slate-950">Status:</span>{" "}
                              {formatStatus(task.status)}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Who should do it:</span>{" "}
                              {task.who_should_do_it ? formatWho(task.who_should_do_it) : "Not set"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Difficulty:</span>{" "}
                              {task.difficulty ?? "Not set"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Time:</span>{" "}
                              {task.time_to_complete_estimate ?? "Not set"}
                            </p>
                            <button
                              type="button"
                              onClick={() => void toggleTask(task)}
                              disabled={savingTaskId === task.id}
                              className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingTaskId === task.id ? "Saving..." : "Mark complete"}
                            </button>
                          </div>
                        </OwnerCard>
                      </div>
                    </OwnerCard>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-slate-950">Completed tasks</h3>
              <div className="space-y-4">
                {completedTasks.length === 0 ? (
                  <OwnerCard className="bg-slate-50 p-5">
                    <p className="text-sm text-slate-700">No completed tasks yet.</p>
                  </OwnerCard>
                ) : (
                  completedTasks.map((task) => (
                    <OwnerCard
                      key={task.id}
                      className="bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <OwnerPill label={`Task ${task.sort_order}`} tone="neutral" />
                          <h3 className="text-xl font-semibold text-slate-950">{task.title}</h3>
                          <p className="text-base leading-7 text-slate-700">
                            {task.plain_language_reason ?? "No explanation available."}
                          </p>
                        </div>

                        <OwnerCard className="p-4 md:min-w-[240px]">
                          <div className="grid gap-2 text-sm text-slate-700">
                            <p>
                              <span className="font-semibold text-slate-950">Status:</span>{" "}
                              {formatStatus(task.status)}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Who should do it:</span>{" "}
                              {task.who_should_do_it ? formatWho(task.who_should_do_it) : "Not set"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Difficulty:</span>{" "}
                              {task.difficulty ?? "Not set"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-950">Time:</span>{" "}
                              {task.time_to_complete_estimate ?? "Not set"}
                            </p>
                            <button
                              type="button"
                              onClick={() => void toggleTask(task)}
                              disabled={savingTaskId === task.id}
                              className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingTaskId === task.id ? "Saving..." : "Mark as open"}
                            </button>
                          </div>
                        </OwnerCard>
                      </div>
                    </OwnerCard>
                  ))
                )}
              </div>
            </div>
          </div>
        </OwnerCard>

        <section className="grid gap-4 md:grid-cols-2">
          <OwnerCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-950">Visibility summary</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Keyword:</span>{" "}
                {dashboard.dashboard.visibilitySummary.keyword ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Metro:</span>{" "}
                {dashboard.dashboard.visibilitySummary.metro ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Latest rank:</span>{" "}
                {dashboard.dashboard.visibilitySummary.latestRank ?? "No data"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Best rank:</span>{" "}
                {dashboard.dashboard.visibilitySummary.bestRank ?? "No data"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Status:</span>{" "}
                {dashboard.dashboard.visibilitySummary.visibilityLabel}
              </p>
            </div>
          </OwnerCard>

          <OwnerCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-950">AI summary</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Business name:</span>{" "}
                {dashboard.dashboard.aiSummary.gbpName ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Primary category:</span>{" "}
                {dashboard.dashboard.aiSummary.primaryCategory ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Reviews:</span>{" "}
                {dashboard.dashboard.aiSummary.totalReviews ?? "No data"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Rating:</span>{" "}
                {dashboard.dashboard.aiSummary.rating ?? "No data"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Readiness:</span>{" "}
                {dashboard.dashboard.aiSummary.aiReadinessLabel}
              </p>
            </div>
          </OwnerCard>

          <OwnerCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-950">Website summary</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Site URL:</span>{" "}
                {dashboard.dashboard.websiteSummary.siteUrl ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Target domain:</span>{" "}
                {dashboard.dashboard.websiteSummary.targetDomain ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Brand name:</span>{" "}
                {dashboard.dashboard.websiteSummary.targetBrandName ?? "Not available"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Status:</span>{" "}
                {dashboard.dashboard.websiteSummary.websiteReadinessLabel}
              </p>
            </div>
          </OwnerCard>

          <OwnerCard className="p-6">
            <h2 className="text-xl font-semibold text-slate-950">Outcomes summary</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
              <p>
                <span className="font-semibold text-slate-950">Monthly events:</span>{" "}
                {dashboard.dashboard.outcomesSummary.monthlyCustomerEvents ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Review conversion rate:</span>{" "}
                {dashboard.dashboard.outcomesSummary.reviewConversionRate ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Label:</span>{" "}
                {dashboard.dashboard.outcomesSummary.eventLabelPlural ?? "Not set"}
              </p>
              <p>
                <span className="font-semibold text-slate-950">Status:</span>{" "}
                {dashboard.dashboard.outcomesSummary.outcomesReadinessLabel}
              </p>
            </div>
          </OwnerCard>
        </section>
      </div>
    </main>
  );
}