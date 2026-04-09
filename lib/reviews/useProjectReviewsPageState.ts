"use client";

import { useEffect, useState } from "react";

import {
  type AiSummary,
  type OwnerAiSummaryResponse,
  type OwnerDashboardResponse,
} from "@/lib/owner/types";

type ErrorShape = {
  error?: string;
};

type UseProjectReviewsPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  aiSummary: AiSummary | null;
  loading: boolean;
  error: string | null;
};

export function useProjectReviewsPageState(
  params: Promise<{ projectId: string }>,
): UseProjectReviewsPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);

        const resolvedParams = await params;
        const resolvedProjectId = resolvedParams.projectId;

        if (!resolvedProjectId) {
          throw new Error("Missing projectId.");
        }

        if (!isMounted) {
          return;
        }

        setProjectId(resolvedProjectId);

        const [dashboardResponse, aiResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/owner-ai-summary`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;

        const dashboardError = (dashboardJson as ErrorShape).error;
        const aiError = (aiJson as ErrorShape).error;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardError ?? "Failed to load owner dashboard context.",
          );
        }

        if (!aiResponse.ok || !aiJson.ok) {
          throw new Error(aiError ?? "Failed to load owner AI summary.");
        }

        if (!isMounted) {
          return;
        }

        setDashboardContext(dashboardJson);
        setAiSummary(aiJson.summary);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load reviews page.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [params]);

  return {
    projectId,
    dashboardContext,
    aiSummary,
    loading,
    error,
  };
}