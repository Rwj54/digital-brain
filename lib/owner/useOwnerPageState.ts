"use client";

import { useCallback, useEffect, useState } from "react";

import { loadOwnerPageData } from "@/lib/owner/loadOwnerPageData";
import {
  type OwnerPageDashboard,
  type OwnerTask,
  type OwnerTasksResponse,
  type Props,
} from "@/lib/owner/types";

type UseOwnerPageStateResult = {
  dashboard: OwnerPageDashboard | null;
  tasksData: OwnerTasksResponse | null;
  loading: boolean;
  savingTaskId: string | null;
  error: string;
  toggleTask: (task: OwnerTask) => Promise<void>;
};

export function useOwnerPageState(
  params: Props["params"],
): UseOwnerPageStateResult {
  const [projectId, setProjectId] = useState<string>("");
  const [dashboard, setDashboard] = useState<OwnerPageDashboard | null>(null);
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

  return {
    dashboard,
    tasksData,
    loading,
    savingTaskId,
    error,
    toggleTask,
  };
}