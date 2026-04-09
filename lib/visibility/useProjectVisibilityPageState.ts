"use client";

import { useEffect, useState } from "react";

import {
  type OwnerDashboardResponse,
  type OwnerVisibilitySummary,
  type OwnerVisibilitySummaryResponse,
} from "@/lib/owner/types";

type ErrorShape = {
  error?: string;
};

type UseProjectVisibilityPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  visibilitySummary: OwnerVisibilitySummary | null;
  loading: boolean;
  error: string | null;
};

export function useProjectVisibilityPageState(
  params: Promise<{ projectId: string }>,
): UseProjectVisibilityPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [visibilitySummary, setVisibilitySummary] =
    useState<OwnerVisibilitySummary | null>(null);
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

        const [dashboardResponse, visibilityResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/owner-visibility-summary`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const visibilityJson =
          (await visibilityResponse.json()) as OwnerVisibilitySummaryResponse;

        const dashboardError = (dashboardJson as ErrorShape).error;
        const visibilityError = (visibilityJson as ErrorShape).error;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardError ?? "Failed to load owner dashboard context.",
          );
        }

        if (!visibilityResponse.ok || !visibilityJson.ok) {
          throw new Error(
            visibilityError ?? "Failed to load owner visibility summary.",
          );
        }

        if (!isMounted) {
          return;
        }

        setDashboardContext(dashboardJson);
        setVisibilitySummary(visibilityJson.summary);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load visibility page.",
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
    visibilitySummary,
    loading,
    error,
  };
}