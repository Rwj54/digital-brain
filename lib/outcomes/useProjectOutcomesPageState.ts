"use client";

import { useEffect, useState } from "react";

import { type OwnerDashboardResponse } from "@/lib/owner/types";

type OutcomesSummary = {
  monthlyCustomerEvents: number | null;
  reviewConversionRate: number | null;
  eventLabelSingular: string | null;
  eventLabelPlural: string | null;
  outcomesReadinessLabel: string;
};

type OutcomesSummaryResponse = {
  ok?: boolean;
  error?: string;
  summary?: OutcomesSummary;
};

type ErrorShape = {
  error?: string;
};

type UseProjectOutcomesPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  outcomesSummary: OutcomesSummary | null;
  loading: boolean;
  error: string | null;
};

export function useProjectOutcomesPageState(
  params: Promise<{ projectId: string }>,
): UseProjectOutcomesPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [outcomesSummary, setOutcomesSummary] =
    useState<OutcomesSummary | null>(null);
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

        const [dashboardResponse, outcomesResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/owner-outcomes-summary`, {
            cache: "no-store",
          }),
        ]);

        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardResponse;
        const outcomesJson =
          (await outcomesResponse.json()) as OutcomesSummaryResponse;

        const dashboardError = (dashboardJson as ErrorShape).error;
        const outcomesError = outcomesJson.error;

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardError ?? "Failed to load owner dashboard context.",
          );
        }

        if (!outcomesResponse.ok || !outcomesJson.ok || !outcomesJson.summary) {
          throw new Error(
            outcomesError ?? "Failed to load owner outcomes summary.",
          );
        }

        if (!isMounted) {
          return;
        }

        setDashboardContext(dashboardJson);
        setOutcomesSummary(outcomesJson.summary);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load outcomes page.",
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
    outcomesSummary,
    loading,
    error,
  };
}