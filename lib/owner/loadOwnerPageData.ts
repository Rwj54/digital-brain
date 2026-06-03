import {
  type OwnerAiSummaryResponse,
  type OwnerDashboardResponse,
  type OwnerPageData,
  type OwnerTaskImpactsResponse,
  type OwnerTasksResponse,
  type OwnerVisibilitySummaryResponse,
  type OwnerWebsiteSummaryResponse,
} from "@/lib/owner/types";

function buildOwnerApiPath(projectId: string, path: string): string {
  return `/api/projects/${projectId}/${path}`;
}

async function fetchOwnerJson<T>(
  path: string,
  errorMessage: string,
): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function loadOwnerPageData(
  projectId: string,
): Promise<OwnerPageData> {
  const [
    dashboardJson,
    tasksJson,
    impactsJson,
    visibilityJson,
    websiteJson,
    aiJson,
  ] = await Promise.all([
    fetchOwnerJson<OwnerDashboardResponse>(
      buildOwnerApiPath(projectId, "owner-dashboard"),
      "Failed to load owner dashboard.",
    ),
    fetchOwnerJson<OwnerTasksResponse>(
      buildOwnerApiPath(projectId, "owner-tasks"),
      "Failed to load owner dashboard.",
    ),
    fetchOwnerJson<OwnerTaskImpactsResponse>(
      buildOwnerApiPath(projectId, "owner-task-impacts"),
      "Failed to load owner dashboard.",
    ),
    fetchOwnerJson<OwnerVisibilitySummaryResponse>(
      buildOwnerApiPath(projectId, "owner-visibility-summary"),
      "Failed to load owner dashboard.",
    ),
    fetchOwnerJson<OwnerWebsiteSummaryResponse>(
      buildOwnerApiPath(projectId, "owner-website-summary"),
      "Failed to load owner dashboard.",
    ),
    fetchOwnerJson<OwnerAiSummaryResponse>(
      buildOwnerApiPath(projectId, "owner-ai-summary"),
      "Failed to load owner dashboard.",
    ),
  ]);

  return {
    dashboard: {
      ...dashboardJson,
      dashboard: {
        ...dashboardJson.dashboard,
        visibilitySummary: visibilityJson.summary,
        aiSummary: aiJson.summary,
        websiteSummary: websiteJson.summary,
      },
    },
    tasksData: tasksJson,
    impactsData: impactsJson,
  };
}