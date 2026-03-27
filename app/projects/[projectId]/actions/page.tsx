"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectActionsRow = {
  id: string;
  project_id: string;
  captured_at: string;
  version: string;
  actions_json: ProjectActionItem[] | null;
  created_at: string;
};

type ProjectActionItem = {
  title: string;
  detail: string;
  priority: "low" | "medium" | "high" | string;
  category: "reviews" | "competition" | "rank" | "general" | string;
};

type ProjectActionsResponse = {
  ok: boolean;
  error?: string;
  projectId: string;
  actionsRow: ProjectActionsRow | null;
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

function categoryLabel(category: string) {
  if (category === "reviews") return "Reviews";
  if (category === "competition") return "Competition";
  if (category === "rank") return "Rank";
  if (category === "general") return "General";
  return category;
}

function formatPriority(priority: string) {
  if (!priority) return "Unknown";
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

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

function getCategoryTone(category: string) {
  if (category === "reviews") {
    return {
      tone: "var(--success)",
      bg: "var(--success-soft)",
      border: "var(--success)",
    };
  }

  if (category === "competition") {
    return {
      tone: "var(--accent-blue-600)",
      bg: "var(--accent-blue-100)",
      border: "var(--accent-blue-600)",
    };
  }

  if (category === "rank") {
    return {
      tone: "var(--brand-600)",
      bg: "var(--brand-100)",
      border: "var(--brand-600)",
    };
  }

  return {
    tone: "var(--text-body)",
    bg: "var(--reference-soft)",
    border: "var(--border-strong)",
  };
}

function buildActionRead(leadAction: ProjectActionItem | null, totalActions: number) {
  if (!leadAction || totalActions === 0) {
    return {
      headline: "Get your first action set",
      reason:
        "This project does not yet have stored action guidance. Once the next action-generation cycle completes, the clearest next steps will appear here.",
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
        "Return to authority, rank, or competitors pages when you need more context.",
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
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">{value}</p>
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

export default function ActionsPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState("");
  const [actionsRow, setActionsRow] = useState<ProjectActionsRow | null>(null);
  const [dashboardContext, setDashboardContext] = useState<OwnerDashboardResponse | null>(null);
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

        const actionsJson = (await actionsResponse.json()) as ProjectActionsResponse;
        const dashboardJson = (await dashboardResponse.json()) as OwnerDashboardResponse;

        if (!actionsResponse.ok || !actionsJson.ok) {
          throw new Error(actionsJson.error ?? "Failed to load project actions.");
        }

        if (!dashboardResponse.ok || !dashboardJson.ok) {
          throw new Error(dashboardJson.error ?? "Failed to load owner dashboard context.");
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

        setError(err instanceof Error ? err.message : "Failed to load actions page.");
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

  const actions = useMemo(() => {
    return Array.isArray(actionsRow?.actions_json) ? actionsRow.actions_json : [];
  }, [actionsRow]);

  const groupedActions = useMemo(() => {
    return {
      high: actions.filter((item) => item.priority === "high"),
      medium: actions.filter((item) => item.priority === "medium"),
      low: actions.filter((item) => item.priority !== "high" && item.priority !== "medium"),
    };
  }, [actions]);

  const totalActions = actions.length;
  const highCount = groupedActions.high.length;
  const mediumCount = groupedActions.medium.length;
  const lowCount = groupedActions.low.length;
  const leadAction = actions[0] ?? null;
  const actionRead = useMemo(
    () => buildActionRead(leadAction, totalActions),
    [leadAction, totalActions]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">Loading actions page...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Action center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See the next actions to work on for this project.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page organizes the current stored action set into a clear working order so you
                can see what matters most right now without digging through raw system output.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                {actionRead.headline}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                {actionRead.reason}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {leadAction ? (
                  <>
                    <InlineTag
                      tone={getPriorityTone(leadAction.priority).tone}
                      bg={getPriorityTone(leadAction.priority).bg}
                      border={getPriorityTone(leadAction.priority).border}
                    >
                      {formatPriority(leadAction.priority)}
                    </InlineTag>
                    <InlineTag
                      tone={getCategoryTone(leadAction.category).tone}
                      bg={getCategoryTone(leadAction.category).bg}
                      border={getCategoryTone(leadAction.category).border}
                    >
                      {categoryLabel(leadAction.category)}
                    </InlineTag>
                  </>
                ) : (
                  <InlineTag>No stored actions</InlineTag>
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
            <HeaderMeta
              label="Scope"
              value={dashboardContext?.pageScopeLabel ?? "Not set"}
            />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(actionsRow?.captured_at ?? dashboardContext?.capturedAt ?? null)}
            />
          </div>
        </section>

        {error ? (
          <section className="border-b border-[var(--danger)] py-5">
            <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          </section>
        ) : null}

        {!error && actions.length === 0 ? (
          <section className="border-b border-[var(--border)] py-6">
            <SectionLabel>No action set yet</SectionLabel>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-body)]">
              No stored growth actions were found for this project yet. This page will become more
              useful after the next successful action-generation cycle.
            </p>
          </section>
        ) : null}

        {actions.length > 0 ? (
          <>
            <section className="border-b border-[var(--border)] py-6">
              <SectionLabel>Action markers</SectionLabel>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricStripItem
                  label="Total actions"
                  value={String(totalActions)}
                  bg="var(--reference-soft)"
                  tone="var(--text-strong)"
                />
                <MetricStripItem
                  label="High priority"
                  value={String(highCount)}
                  bg="var(--danger-soft)"
                  tone="var(--danger)"
                />
                <MetricStripItem
                  label="Medium priority"
                  value={String(mediumCount)}
                  bg="var(--warning-soft)"
                  tone="var(--warning)"
                />
                <MetricStripItem
                  label="Lower priority"
                  value={String(lowCount)}
                  bg="var(--brand-100)"
                  tone="var(--brand-700)"
                />
              </div>
            </section>

            <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
              <section>
                <SectionLabel>Your next actions</SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Start with these actions
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                  Actions are grouped by priority so the page stays easy to scan. Start with high
                  priority work first, then move down the list.
                </p>

                <div className="mt-6">
                  {actionRead.nextMoves.map((item, index) => (
                    <article
                      key={item}
                      className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                        index === actionRead.nextMoves.length - 1
                          ? ""
                          : "border-b border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center md:justify-center">
                        <div
                          className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                          style={{
                            backgroundColor:
                              index === 0 ? "var(--brand-700)" : "var(--reference-soft)",
                            color: index === 0 ? "#ffffff" : "var(--text-strong)",
                          }}
                        >
                          {index + 1}
                        </div>
                      </div>

                      <div className="max-w-3xl">
                        <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                          {item}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                          {index === 0
                            ? "This is the first move most likely to help you make progress with the current action set."
                            : "This supports the main action plan and helps you work through the stored priorities in order."}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-8 border-t border-[var(--border)] pt-6">
                  <SectionLabel>Working order</SectionLabel>

                  {[
                    {
                      key: "high",
                      label: "High priority",
                      helper: "Do these first because they carry the strongest weight right now.",
                      items: groupedActions.high,
                    },
                    {
                      key: "medium",
                      label: "Medium priority",
                      helper: "Move to these after the highest-priority work is underway.",
                      items: groupedActions.medium,
                    },
                    {
                      key: "low",
                      label: "Lower priority",
                      helper: "These still help, but they matter less than the higher-priority items above.",
                      items: groupedActions.low,
                    },
                  ]
                    .filter((group) => group.items.length > 0)
                    .map((group, groupIndex) => (
                      <div
                        key={group.key}
                        className={`py-6 ${
                          groupIndex === 0 ? "" : "border-t border-[var(--border)]"
                        }`}
                      >
                        <p className="text-lg font-semibold text-[var(--text-strong)]">
                          {group.label}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                          {group.helper}
                        </p>

                        <div className="mt-5">
                          {group.items.map((action, index) => {
                            const priorityTone = getPriorityTone(action.priority);
                            const categoryTone = getCategoryTone(action.category);

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
                                    <InlineTag
                                      tone={categoryTone.tone}
                                      bg={categoryTone.bg}
                                      border={categoryTone.border}
                                    >
                                      {categoryLabel(action.category)}
                                    </InlineTag>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </section>

              <aside className="space-y-8">
                <section>
                  <SectionLabel>Navigation</SectionLabel>
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
                      href={`/projects/${projectId}/rank`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      View rank page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/authority`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      View authority page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/competitors`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      View competitors page
                    </Link>
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <SectionLabel>What this means</SectionLabel>

                  <div className="mt-4">
                    <DetailRow
                      label="Latest capture"
                      value={formatDate(actionsRow?.captured_at ?? null)}
                      helper="This is the most recent action snapshot currently stored."
                    />
                    <DetailRow
                      label="Version"
                      value={actionsRow?.version ?? "Not set"}
                      helper="This is the stored version label attached to the current action set."
                    />
                    <DetailRow
                      label="Primary action"
                      value={leadAction?.title ?? "Not set"}
                      helper="This is the first stored action currently shown on the page."
                    />
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <SectionLabel>Progress and proof</SectionLabel>

                  <div className="mt-4">
                    <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                      {totalActions}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                      stored actions currently available for this project
                    </p>

                    <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                      <HeaderMeta label="High priority" value={String(highCount)} />
                      <HeaderMeta label="Medium priority" value={String(mediumCount)} />
                      <HeaderMeta label="Lower priority" value={String(lowCount)} />
                    </div>
                  </div>
                </section>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
