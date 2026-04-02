"use client";

import { useEffect, useState } from "react";

import {
  type OwnerDashboardResponse,
  type OwnerWebsiteSummaryResponse,
} from "@/lib/owner/types";

type ErrorShape = {
  error?: string;
};

type UseProjectWebsitePageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  websiteSummary: OwnerWebsiteSummaryResponse["summary"] | null;
  loading: boolean;
  error: string | null;
};

export function useProjectWebsitePageState(
  params: Promise<{ projectId: string }>,
): UseProjectWebsitePageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [websiteSummary, setWebsiteSummary] =
    useState<OwnerWebsiteSummaryResponse["summary"] | null>(null);
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

        const [dashboardResponse, websiteResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/owner-website-summary`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const websiteJson =
          (await websiteResponse.json()) as OwnerWebsiteSummaryResponse;

        const dashboardError = (dashboardJson as ErrorShape).error;
        const websiteError = (websiteJson as ErrorShape).error;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardError ?? "Failed to load owner dashboard context.",
          );
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
        setWebsiteSummary(websiteJson.summary);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load website page.",
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
    websiteSummary,
    loading,
    error,
  };
}