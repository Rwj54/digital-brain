"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { OwnerActionPlanSection } from "@/components/owner/OwnerActionPlanSection";
import { OwnerDetailSections } from "@/components/owner/OwnerDetailSections";
import { OwnerHealthMarkersSection } from "@/components/owner/OwnerHealthMarkersSection";
import { OwnerHeroSection } from "@/components/owner/OwnerHeroSection";
import { buildOwnerSteps } from "@/lib/owner/buildOwnerSteps";
import { loadOwnerPageData } from "@/lib/owner/loadOwnerPageData";
import {
  type DetailTab,
  type OwnerPageDashboard,
  type OwnerTask,
  type OwnerTasksResponse,
  type Props,
} from "@/lib/owner/types";

export default function OwnerDashboardPage({ params }: Props) {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboard, setDashboard] = useState<OwnerPageDashboard | null>(null);
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

  const refreshOwnerPageData = useCallback(
    async (
      resolvedProjectId: string,
      options?: {
        showLoading?: boolean;
      },
    ) => {
      try {
        if (options?.showLoading) {
          setLoading(true);
        }

        setError("");

        const data = await loadOwnerPageData(resolvedProjectId);

        setDashboard(data.dashboard);
        setTasksData(data.tasksData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load owner dashboard.",
        );
      } finally {
        if (options?.showLoading) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!projectId) return;

    void refreshOwnerPageData(projectId, { showLoading: true });
  }, [projectId, refreshOwnerPageData]);

  const toggleTask = useCallback(
    async (task: OwnerTask) => {
      if (!projectId) return;

      try {
        setSavingTaskId(task.id);
        setError("");

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

        await refreshOwnerPageData(projectId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update task.");
      } finally {
        setSavingTaskId(null);
      }
    },
    [projectId, refreshOwnerPageData],
  );

  const steps = useMemo(() => {
    if (!dashboard || !tasksData) {
      return [];
    }

    return buildOwnerSteps(dashboard, tasksData);
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

  const primaryStep = steps[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <OwnerHeroSection
          dashboard={dashboard}
          primaryStep={primaryStep}
          openTasks={tasksData.summary.openTasks}
        />

        <OwnerHealthMarkersSection dashboard={dashboard} />

        <OwnerActionPlanSection
          dashboard={dashboard}
          steps={steps}
          tasksSummary={tasksData.summary}
          savingTaskId={savingTaskId}
          onToggleTask={toggleTask}
        />

        <OwnerDetailSections
          dashboard={dashboard}
          tasksData={tasksData}
          steps={steps}
          detailTab={detailTab}
          onDetailTabChange={setDetailTab}
        />
      </div>
    </main>
  );
}