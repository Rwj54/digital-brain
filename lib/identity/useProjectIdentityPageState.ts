"use client";

import { useEffect, useState } from "react";

import {
  type AiSummary,
  type OwnerAiSummaryResponse,
  type OwnerDashboardResponse,
  type OwnerWebsiteSummaryResponse,
  type WebsiteSummary,
} from "@/lib/owner/types";

type ErrorShape = {
  error?: string;
};

type UseProjectIdentityPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  aiSummary: AiSummary | null;
  websiteSummary: WebsiteSummary | null;
  loading: boolean;
  error: string | null;
};

export function useProjectIdentityPageState(
  params: Promise<{ projectId: string }>,
): UseProjectIdentityPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [websiteSummary, setWebsiteSummary] =
    useState<WebsiteSummary | null>(null);
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

        const [dashboardResponse, aiResponse, websiteResponse] =
          await Promise.all([
            fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
              cache: "no-store",
            }),
            fetch(`/api/projects/${resolvedProjectId}/owner-ai-summary`, {
              cache: "no-store",
            }),
            fetch(`/api/projects/${resolvedProjectId}/owner-website-summary`, {
              cache: "no-store",
            }),
          ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const aiJson = (await aiResponse.json()) as OwnerAiSummaryResponse;
        const websiteJson =
          (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;

        const dashboardError = (dashboardJson as ErrorShape).error;
        const aiError = (aiJson as ErrorShape).error;
        const websiteError = (websiteJson as ErrorShape).error;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardError ?? "Failed to load owner dashboard context.",
          );
        }

        if (!aiResponse.ok || !aiJson.ok) {
          throw new Error(aiError ?? "Failed to load owner AI summary.");
        }

        if (!websiteResponse.ok || !websiteJson.ok) {
          throw new Error(
            websiteError ?? "Failed to load owner website summary.",
          );
        }

        if (!isMounted) {
          return;
        }

        setDashboardContext(dashboardJson);
        setAiSummary(aiJson.summary);
        setWebsiteSummary(websiteJson.summary);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load identity page.",
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
    websiteSummary,
    loading,
    error,
  };
}