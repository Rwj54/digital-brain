"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type OwnerDashboardResponse = {
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

export type AuthorityHistoryRow = {
  project_id: string;
  captured_at: string;
  version: string | null;
  authority_score: number | null;
  authority_tier: string | null;
  competitive_strength: number | null;
  structural_optimization: number | null;
  momentum_score: number | null;
  momentum_label: string | null;
  created_at: string;
};

export type AuthorityHistoryResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  limit: number;
  rows: AuthorityHistoryRow[];
};

export type ActionItem = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low" | string;
  category:
    | "reviews"
    | "photos"
    | "posts"
    | "categories"
    | "citations"
    | "general"
    | string;
};

export type ActionsSuccessResponse = {
  ok: true;
  projectId: string;
  actionsRow: {
    id: string;
    project_id: string;
    captured_at: string | null;
    version: string | null;
    actions_json: ActionItem[] | null;
    created_at: string | null;
  } | null;
};

export type ActionsErrorResponse = {
  ok: false;
  error: string;
};

export type ActionsResponse = ActionsSuccessResponse | ActionsErrorResponse;

export type AuthorityRead = {
  headline: string;
  reason: string;
};

export type GroupedActions = {
  high: ActionItem[];
  medium: ActionItem[];
  low: ActionItem[];
};

export type UseProjectAuthorityPageStateResult = {
  projectId: string;
  dashboardContext: OwnerDashboardResponse | null;
  historyRows: AuthorityHistoryRow[];
  actions: ActionItem[];
  actionsVersion: string | null;
  actionsCapturedAt: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  latestRow: AuthorityHistoryRow | null;
  authorityRead: AuthorityRead;
  authorityTrend: string;
  primaryAction: ActionItem | null;
  groupedActions: GroupedActions;
  refreshPage: () => Promise<void>;
};

function buildAuthorityRead(row: AuthorityHistoryRow | null): AuthorityRead {
  if (!row || row.authority_score === null) {
    return {
      headline: "Get your first authority checkpoint",
      reason:
        "Digital Brain does not yet have enough authority data to show how strong this business looks in the local market.",
    };
  }

  if (row.authority_score >= 80) {
    return {
      headline: "Protect a strong authority position",
      reason:
        "This business already shows strong authority signals. The main goal now is to protect that position and keep momentum moving.",
    };
  }

  if (row.authority_score >= 60) {
    return {
      headline: "Strengthen the next layer of authority",
      reason:
        "This business has a workable authority base, but it still has room to improve against stronger local competitors.",
    };
  }

  if (row.authority_score >= 40) {
    return {
      headline: "Improve trust and market footing",
      reason:
        "Authority is present but still weak enough to hold the business back. The next wins should focus on trust, completeness, and competitive strength.",
    };
  }

  return {
    headline: "Build a stronger authority foundation",
    reason:
      "This business still needs more trust, completeness, and competitive strength before it can look strong in the market.",
  };
}

function buildAuthorityTrend(rows: AuthorityHistoryRow[]): string {
  if (rows.length < 2) {
    return "Only one authority checkpoint is available so far.";
  }

  const latest = rows[0];
  const previous = rows[1];

  if (
    latest.authority_score !== null &&
    previous.authority_score !== null &&
    latest.authority_score > previous.authority_score
  ) {
    return `Authority is improving. Score moved from ${previous.authority_score.toFixed(1)} to ${latest.authority_score.toFixed(1)}.`;
  }

  if (
    latest.authority_score !== null &&
    previous.authority_score !== null &&
    latest.authority_score < previous.authority_score
  ) {
    return `Authority slipped. Score moved from ${previous.authority_score.toFixed(1)} to ${latest.authority_score.toFixed(1)}.`;
  }

  return "Authority is steady compared with the previous checkpoint.";
}

function pickPrimaryAction(actions: ActionItem[]): ActionItem | null {
  const rank = (priority: string) => {
    if (priority === "high") return 0;
    if (priority === "medium") return 1;
    return 2;
  };

  return [...actions].sort((a, b) => rank(a.priority) - rank(b.priority))[0] ?? null;
}

export function useProjectAuthorityPageState(
  params: Promise<{ projectId: string }>,
): UseProjectAuthorityPageStateResult {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] =
    useState<OwnerDashboardResponse | null>(null);
  const [historyRows, setHistoryRows] = useState<AuthorityHistoryRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionsVersion, setActionsVersion] = useState<string | null>(null);
  const [actionsCapturedAt, setActionsCapturedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPageData = useCallback(async (resolvedProjectId: string) => {
    const [dashboardResponse, historyResponse, actionsResponse] = await Promise.all([
      fetch(`/api/projects/${resolvedProjectId}/owner-dashboard`, {
        cache: "no-store",
      }),
      fetch(`/api/projects/${resolvedProjectId}/authority-history?limit=12`, {
        cache: "no-store",
      }),
      fetch(`/api/projects/${resolvedProjectId}/actions`, {
        cache: "no-store",
      }),
    ]);

    const dashboardJson = (await dashboardResponse.json()) as OwnerDashboardResponse;
    const historyJson = (await historyResponse.json()) as AuthorityHistoryResponse;
    const actionsJson = (await actionsResponse.json()) as ActionsResponse;

    if (!dashboardResponse.ok || !dashboardJson.ok) {
      throw new Error(
        dashboardJson.error ?? "Failed to load owner dashboard context.",
      );
    }

    if (!historyResponse.ok || !historyJson.ok) {
      throw new Error(historyJson.error ?? "Failed to load authority history.");
    }

    if (!actionsResponse.ok || !actionsJson.ok) {
      throw new Error(actionsJson.ok ? "Failed to load actions." : actionsJson.error);
    }

    const actionsRow = actionsJson.actionsRow ?? null;

    setDashboardContext(dashboardJson);
    setHistoryRows(Array.isArray(historyJson.rows) ? historyJson.rows : []);
    setActions(
      Array.isArray(actionsRow?.actions_json) ? actionsRow.actions_json : [],
    );
    setActionsVersion(actionsRow?.version ?? null);
    setActionsCapturedAt(actionsRow?.captured_at ?? null);
  }, []);

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
        await loadPageData(resolvedProjectId);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load authority page.",
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
  }, [loadPageData, params]);

  const refreshPage = useCallback(async () => {
    if (!projectId) {
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      await loadPageData(projectId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh authority page.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadPageData, projectId]);

  const latestRow = historyRows[0] ?? null;
  const authorityRead = useMemo(() => buildAuthorityRead(latestRow), [latestRow]);
  const authorityTrend = useMemo(() => buildAuthorityTrend(historyRows), [historyRows]);
  const primaryAction = useMemo(() => pickPrimaryAction(actions), [actions]);

  const groupedActions = useMemo<GroupedActions>(() => {
    return {
      high: actions.filter((item) => item.priority === "high"),
      medium: actions.filter((item) => item.priority === "medium"),
      low: actions.filter(
        (item) => item.priority !== "high" && item.priority !== "medium",
      ),
    };
  }, [actions]);

  return {
    projectId,
    dashboardContext,
    historyRows,
    actions,
    actionsVersion,
    actionsCapturedAt,
    loading,
    refreshing,
    error,
    latestRow,
    authorityRead,
    authorityTrend,
    primaryAction,
    groupedActions,
    refreshPage,
  };
}