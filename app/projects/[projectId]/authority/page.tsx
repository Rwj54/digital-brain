"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerDashboardResponse = {
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

type AuthorityHistoryRow = {
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

type AuthorityHistoryResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  limit: number;
  rows: AuthorityHistoryRow[];
};

type ActionItem = {
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

type ActionsSuccessResponse = {
  ok: true;
  projectId: string;
  capturedAt: string | null;
  version: string;
  actions: ActionItem[];
  authorityScore?: number | null;
  authorityTier?: string | null;
  momentumScore?: number | null;
  momentumLabel?: string | null;
};

type ActionsErrorResponse = {
  ok: false;
  error: string;
};

type ActionsResponse = ActionsSuccessResponse | ActionsErrorResponse;

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatScore(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toFixed(1);
}

function formatTier(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value;
}

function formatMomentumLabel(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return value;
}

function formatPriority(priority: string) {
  if (!priority) {
    return "Unknown";
  }

  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function categoryLabel(category: string) {
  if (category === "reviews") return "Reviews";
  if (category === "photos") return "Photos";
  if (category === "posts") return "Posts";
  if (category === "categories") return "Categories";
  if (category === "citations") return "Citations";
  if (category === "general") return "General";
  return category;
}

function getPriorityTone(priority: string) {
  if (priority === "high") {
    return {
      tone: "var(--danger)",
      bg: "var(--danger-soft)",
      border: "var(--danger)",
    };
  }

  if (priority === "medium") {
    return {
      tone: "var(--warning)",
      bg: "var(--warning-soft)",
      border: "var(--warning)",
    };
  }

  return {
    tone: "var(--text-body)",
    bg: "var(--reference-soft)",
    border: "var(--border-strong)",
  };
}

function buildAuthorityRead(row: AuthorityHistoryRow | null) {
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

function buildAuthorityTrend(rows: AuthorityHistoryRow[]) {
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

function pickPrimaryAction(actions: ActionItem[]) {
  const rank = (priority: string) => {
    if (priority === "high") return 0;
    if (priority === "medium") return 1;
    return 2;
  };

  return [...actions].sort((a, b) => rank(a.priority) - rank(b.priority))[0] ?? null;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function HeaderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">
        {value}
      </p>
    </div>
  );
}

function MetricStripItem({
  label,
  value,
  bg,
  tone,
}: {
  label: string;
  value: string;
  bg: string;
  tone: string;
}) {
  return (
    <div className="px-4 py-4" style={{ backgroundColor: bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

function InlineTag({
  children,
  tone,
  bg,
  border,
}: {
  children: ReactNode;
  tone?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: tone ?? "var(--text-body)",
        backgroundColor: bg ?? "transparent",
        borderColor: border ?? "var(--border)",
      }}
    >
      {children}
    </span>
  );
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p> : null}
    </div>
  );
}

export default function ProjectAuthorityPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState("");
  const [dashboardContext, setDashboardContext] = useState<OwnerDashboardResponse | null>(null);
  const [historyRows, setHistoryRows] = useState<AuthorityHistoryRow[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [actionsVersion, setActionsVersion] = useState<string | null>(null);
  const [actionsCapturedAt, setActionsCapturedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestRow = historyRows[0] ?? null;
  const authorityRead = useMemo(() => buildAuthorityRead(latestRow), [latestRow]);
  const authorityTrend = useMemo(() => buildAuthorityTrend(historyRows), [historyRows]);
  const primaryAction = useMemo(() => pickPrimaryAction(actions), [actions]);

  const groupedActions = useMemo(() => {
    return {
      high: actions.filter((item) => item.priority === "high"),
      medium: actions.filter((item) => item.priority === "medium"),
      low: actions.filter((item) => item.priority !== "high" && item.priority !== "medium"),
    };
  }, [actions]);

  async function loadPageData(resolvedProjectId: string) {
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
      throw new Error(dashboardJson.error ?? "Failed to load owner dashboard context.");
    }

    if (!historyResponse.ok || !historyJson.ok) {
      throw new Error(historyJson.error ?? "Failed to load authority history.");
    }

    if (!actionsResponse.ok || !actionsJson.ok) {
      throw new Error(actionsJson.ok ? "Failed to load actions." : actionsJson.error);
    }

    setDashboardContext(dashboardJson);
    setHistoryRows(Array.isArray(historyJson.rows) ? historyJson.rows : []);
    setActions(Array.isArray(actionsJson.actions) ? actionsJson.actions : []);
    setActionsVersion(actionsJson.version ?? null);
    setActionsCapturedAt(actionsJson.capturedAt ?? null);
  }

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

        setError(err instanceof Error ? err.message : "Failed to load authority page.");
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

  async function refreshPage() {
    if (!projectId) {
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      await loadPageData(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh authority page.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">Loading authority page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Authority center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See how strong this business looks to Google right now.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                Authority shows how much trust, completeness, and competitive strength this business
                has in the local market. Use this page to see where the business stands and what to
                improve next.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <InlineTag tone="var(--brand-600)" bg="var(--brand-100)" border="var(--brand-600)">
                  Tier: {formatTier(latestRow?.authority_tier ?? null)}
                </InlineTag>
                <InlineTag>
                  Momentum: {formatMomentumLabel(latestRow?.momentum_label ?? null)}
                </InlineTag>
                <InlineTag>Score: {formatScore(latestRow?.authority_score ?? null)}</InlineTag>
              </div>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {primaryAction?.title ?? authorityRead.headline}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {primaryAction?.detail ?? authorityRead.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {primaryAction ? (
                  <>
                    <InlineTag
                      tone={getPriorityTone(primaryAction.priority).tone}
                      bg={getPriorityTone(primaryAction.priority).bg}
                      border={getPriorityTone(primaryAction.priority).border}
                    >
                      {formatPriority(primaryAction.priority)}
                    </InlineTag>
                    <InlineTag>{categoryLabel(primaryAction.category)}</InlineTag>
                  </>
                ) : (
                  <InlineTag>Waiting for the first authority action set</InlineTag>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta
              label="Business"
              value={dashboardContext?.projectDisplayName ?? "Not set"}
            />
            <HeaderMeta
              label="Domain"
              value={dashboardContext?.domainDisplayValue ?? "Not set"}
            />
            <HeaderMeta
              label="Location / Market"
              value={
                dashboardContext?.projectLocationLabel ??
                dashboardContext?.projectMetro ??
                "Not set"
              }
            />
            <HeaderMeta label="Scope" value={dashboardContext?.pageScopeLabel ?? "Not set"} />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(latestRow?.captured_at ?? dashboardContext?.capturedAt ?? null)}
            />
          </div>
        </section>

        {error ? (
          <section className="border-b border-[var(--danger)] py-5">
            <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          </section>
        ) : null}

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Authority markers</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="Authority"
              value={formatScore(latestRow?.authority_score ?? null)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Market strength"
              value={formatScore(latestRow?.competitive_strength ?? null)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Profile strength"
              value={formatScore(latestRow?.structural_optimization ?? null)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Momentum"
              value={formatScore(latestRow?.momentum_score ?? null)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>Recommended next actions</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              Start with the strongest next moves
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Begin with the high-priority work first. These are the actions most likely to improve
              how strong and trustworthy this business looks in its market.
            </p>

            <div className="mt-6">
              {[
                {
                  key: "high",
                  label: "High priority",
                  helper: "Do these first because they carry the most weight right now.",
                  items: groupedActions.high,
                },
                {
                  key: "medium",
                  label: "Medium priority",
                  helper: "Do these after the highest-impact gaps are covered.",
                  items: groupedActions.medium,
                },
                {
                  key: "low",
                  label: "Lower priority",
                  helper: "These still help, but they matter less than the top items above.",
                  items: groupedActions.low,
                },
              ]
                .filter((group) => group.items.length > 0)
                .map((group, groupIndex) => (
                  <div
                    key={group.key}
                    className={`py-6 ${groupIndex === 0 ? "" : "border-t border-[var(--border)]"}`}
                  >
                    <p className="text-lg font-semibold text-[var(--text-strong)]">{group.label}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                      {group.helper}
                    </p>

                    <div className="mt-5">
                      {group.items.map((action, index) => {
                        const priorityTone = getPriorityTone(action.priority);

                        return (
                          <article
                            key={`${group.key}-${index}-${action.title}`}
                            className={`grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-start ${
                              index === group.items.length - 1
                                ? ""
                                : "border-b border-[var(--border)]"
                            }`}
                          >
                            <div className="max-w-3xl">
                              <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                                {action.title}
                              </p>
                              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                                {action.detail}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <InlineTag
                                  tone={priorityTone.tone}
                                  bg={priorityTone.bg}
                                  border={priorityTone.border}
                                >
                                  {formatPriority(action.priority)}
                                </InlineTag>
                                <InlineTag>{categoryLabel(action.category)}</InlineTag>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {actions.length === 0 ? (
                <div className="border-t border-[var(--border)] pt-5 text-sm text-[var(--text-body)]">
                  No authority-driven actions are available yet for this project.
                </div>
              ) : null}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Authority navigation</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/owner`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Back to owner page
                </Link>
                <Link
                  href={`/projects/${projectId}/actions`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View actions page
                </Link>
                <Link
                  href={`/projects/${projectId}/rank`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  View rank page
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void refreshPage();
                  }}
                  disabled={refreshing}
                  className="px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--text-strong)",
                    border: "1px solid var(--text-strong)",
                  }}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>Recent authority checkpoints</SectionLabel>

              <div className="mt-4">
                {historyRows.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--text-body)]">
                    No authority checkpoints are available yet for this project.
                  </p>
                ) : (
                  historyRows.slice(0, 6).map((row, index) => (
                    <div
                      key={`${row.captured_at}-${index}`}
                      className={`border-t border-[var(--border)] py-4 ${
                        index === 0 ? "border-t-0 pt-0" : ""
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {formatDate(row.captured_at)}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                        Score: {formatScore(row.authority_score)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                        Tier: {formatTier(row.authority_tier)} • Momentum:{" "}
                        {formatMomentumLabel(row.momentum_label)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Plain-English read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Current read"
                  value={authorityRead.headline}
                  helper="This is the plain-language read for the latest authority snapshot."
                />
                <DetailRow
                  label="Trend line"
                  value={authorityTrend}
                  helper="This compares the latest authority checkpoint to the one before it."
                />
                <DetailRow
                  label="Action version"
                  value={actionsVersion ?? "Not set"}
                  helper="This is the stored action-engine version behind the current recommendations."
                />
                <DetailRow
                  label="Actions captured"
                  value={formatDate(actionsCapturedAt)}
                  helper="This is when the current recommended actions were captured."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress and proof</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {historyRows.length}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  authority checkpoints currently available for this project
                </p>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Latest tier"
                    value={formatTier(latestRow?.authority_tier ?? null)}
                  />
                  <HeaderMeta
                    label="Momentum"
                    value={formatMomentumLabel(latestRow?.momentum_label ?? null)}
                  />
                  <HeaderMeta label="Stored actions" value={String(actions.length)} />
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
