"use client";

import { useEffect, useMemo, useState } from "react";

export type ProjectActionItem = {
  title: string;
  detail: string;
  priority: "low" | "medium" | "high" | string;
  category: "reviews" | "competition" | "rank" | "general" | string;
};

export type ProjectActionsRow = {
  id: string;
  project_id: string;
  captured_at: string;
  version: string;
  actions_json: ProjectActionItem[] | null;
  created_at: string;
};

export type ProjectActionsResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  actionsRow: ProjectActionsRow | null;
};

export type OwnerDashboardContext = {
  ok: boolean;
  error?: string;
  projectId: string;
  projectDisplayName: string | null;
  projectCategory: string | null;
  projectMetro: string | null;
  domainDisplayValue: string | null;
  projectLocationLabel: string | null;
  pageScopeLabel: string;
  capturedAt: string;
};

export type ActionRead = {
  headline: string;
  reason: string;
  nextMoves: string[];
};

export type GroupedActions = {
  high: ProjectActionItem[];
  medium: ProjectActionItem[];
  low: ProjectActionItem[];
};

export type UseProjectActionsPageStateResult = {
  projectId: string;
  actionsRow: ProjectActionsRow | null;
  dashboardContext: OwnerDashboardContext | null;
  loading: boolean;
  error: string | null;
  actions: ProjectActionItem[];
  groupedActions: GroupedActions;
  totalActions: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  leadAction: ProjectActionItem | null;
  actionRead: ActionRead;
};

function buildActionRead(
  leadAction: ProjectActionItem | null,
  totalActions: number,
): ActionRead {
  if (!leadAction || totalActions === 0) {
    return {
      headline: "Get your first guided action plan",
      reason:
        "This project does not have a saved action plan yet. Once the next refresh completes, this page will turn into a clear working order for what to do first.",
      nextMoves: [
        "Run the workflows that generate project actions.",
        "Come back once a stored action set exists for this project.",
        "Start with the highest-priority action when the list appears.",
      ],
    };
  }

  if (leadAction.priority === "high") {
    return {
      headline: "Start with the highest-priority work",
      reason:
        "The first stored action is marked high priority, which means it should be handled before the lower-priority items below it.",
      nextMoves: [
        "Complete the first high-priority action before moving down the list.",
        "Use category tags to understand whether the work is about reviews, rank, or competition.",
        "Return to visibility, reviews, or the owner page when you need more context.",
      ],
    };
  }

  if (leadAction.priority === "medium") {
    return {
      headline: "Work through the current action list in order",
      reason:
        "There are no top-priority blockers in the current set, so the best move is to work through the medium-priority items first.",
      nextMoves: [
        "Start with the first listed action.",
        "Use the grouped sections to finish medium-priority work before lower-priority items.",
        "Check back after the next action refresh to see whether priorities changed.",
      ],
    };
  }

  return {
    headline: "Use this page as your working checklist",
    reason:
      "The current action set is lighter, so this page is mainly a clean working order for the next useful improvements.",
    nextMoves: [
      "Start with the first listed action.",
      "Use category tags to understand what kind of work each action supports.",
      "Re-check later when a new stored action set is available.",
    ],
  };
}

export function useProjectActionsPageState(
  params: Promise<{ projectId: string }>,
): UseProjectActionsPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [actionsRow, setActionsRow] = useState<ProjectActionsRow | null>(null);
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardContext | null>(null);
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

        const [actionsResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/projects/${resolvedProjectId}/actions`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
            cache: "no-store",
          }),
        ]);

        const actionsJson =
          (await actionsResponse.json()) as ProjectActionsResponse;
        const dashboardJson =
          (await dashboardResponse.json()) as OwnerDashboardContext;

        if (!actionsResponse.ok || !actionsJson.ok) {
          throw new Error(actionsJson.error ?? "Failed to load project actions.");
        }

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(
            dashboardJson.error ?? "Failed to load owner dashboard context.",
          );
        }

        if (!isMounted) {
          return;
        }

        setActionsRow(actionsJson.actionsRow);
        setDashboardContext(dashboardJson);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load actions page.",
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

  const actions = useMemo<ProjectActionItem[]>(() => {
    return Array.isArray(actionsRow?.actions_json) ? actionsRow.actions_json : [];
  }, [actionsRow]);

  const groupedActions = useMemo<GroupedActions>(() => {
    return {
      high: actions.filter((item) => item.priority === "high"),
      medium: actions.filter((item) => item.priority === "medium"),
      low: actions.filter(
        (item) => item.priority !== "high" && item.priority !== "medium",
      ),
    };
  }, [actions]);

  const totalActions = actions.length;
  const highCount = groupedActions.high.length;
  const mediumCount = groupedActions.medium.length;
  const lowCount = groupedActions.low.length;
  const leadAction = actions[0] ?? null;

  const actionRead = useMemo(() => {
    return buildActionRead(leadAction, totalActions);
  }, [leadAction, totalActions]);

  return {
    projectId,
    actionsRow,
    dashboardContext,
    loading,
    error,
    actions,
    groupedActions,
    totalActions,
    highCount,
    mediumCount,
    lowCount,
    leadAction,
    actionRead,
  };
}