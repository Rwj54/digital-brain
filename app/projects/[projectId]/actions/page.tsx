"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import {
  type ProjectActionItem,
  useProjectActionsPageState,
} from "@/lib/actions/useProjectActionsPageState";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
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

function getActionDestinationHref(projectId: string, category: string) {
  if (category === "reviews") {
    return `/projects/${projectId}/reviews`;
  }

  if (category === "competition" || category === "rank") {
    return `/projects/${projectId}/visibility`;
  }

  return `/projects/${projectId}/owner`;
}

function getActionDestinationLabel(category: string) {
  if (category === "reviews") {
    return "Open reviews page";
  }

  if (category === "competition" || category === "rank") {
    return "Open visibility page";
  }

  return "Open owner page";
}

function getActionDestinationHelper(category: string) {
  if (category === "reviews") {
    return "This action is most closely connected to the Reviews and Reputation Center.";
  }

  if (category === "competition" || category === "rank") {
    return "This action is most closely connected to the Local Visibility Center.";
  }

  return "This action is best reviewed from the main owner dashboard first.";
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
      <p
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ color: tone }}
      >
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
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ActionGroup({
  projectId,
  label,
  helper,
  groupKey,
  items,
}: {
  projectId: string;
  label: string;
  helper: string;
  groupKey: string;
  items: ProjectActionItem[];
}) {
  return (
    <div className="py-6 first:pt-0">
      <p className="text-lg font-semibold text-[var(--text-strong)]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">{helper}</p>

      <div className="mt-5">
        {items.map((action, index) => {
          const priorityTone = getPriorityTone(action.priority);
          const categoryTone = getCategoryTone(action.category);

          return (
            <article
              key={`${groupKey}-${index}-${action.title}`}
              className={`grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-start ${
                index === items.length - 1
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
                <p className="mt-3 text-sm leading-6 text-[var(--text-body)]">
                  {getActionDestinationHelper(action.category)}
                </p>
              </div>

              <div className="md:pl-6">
                <Link
                  href={getActionDestinationHref(projectId, action.category)}
                  className="inline-flex px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  {getActionDestinationLabel(action.category)}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ActionsPage({ params }: PageProps) {
  const {
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
  } = useProjectActionsPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading your action plan...
          </p>
        </div>
      </main>
    );
  }

  const snapshotValue = formatDate(
    actionsRow?.captured_at ?? dashboardContext?.capturedAt ?? null,
  );

  const nextMoves =
    actionRead.nextMoves.length > 0
      ? actionRead.nextMoves
      : leadAction
        ? [leadAction.title]
        : [];

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Guided action center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                See what to work on next for this business.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page turns the current action plan into a plain-English
                working order so the owner can see what matters now, where to
                start, and which center to open next.
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
                  <InlineTag>No action plan yet</InlineTag>
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
            <HeaderMeta label="Snapshot" value={snapshotValue} />
          </div>
        </section>

        {error ? (
          <section className="border-b border-[var(--danger)] py-5">
            <p className="text-sm font-medium text-[var(--danger)]">{error}</p>
          </section>
        ) : null}

        {!error && actions.length === 0 ? (
          <section className="border-b border-[var(--border)] py-6">
            <SectionLabel>Your first action plan is not ready yet</SectionLabel>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--text-body)]">
              No saved action plan was found for this project yet. Once the
              next refresh completes, this page will become a clearer working
              order for what to do first. Until then, use the centers below to
              check identity clarity, reviews, local visibility, website and
              domain footing, AI visibility readiness, and early outcomes.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
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
                href={`/projects/${projectId}/identity`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open identity page
              </Link>
              <Link
                href={`/projects/${projectId}/reviews`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open reviews page
              </Link>
              <Link
                href={`/projects/${projectId}/visibility`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open visibility page
              </Link>
              <Link
                href={`/projects/${projectId}/website`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open website page
              </Link>
              <Link
                href={`/projects/${projectId}/ai`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open AI page
              </Link>
              <Link
                href={`/projects/${projectId}/outcomes`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open outcomes page
              </Link>
            </div>
          </section>
        ) : null}

        {actions.length > 0 ? (
          <>
            <section className="border-b border-[var(--border)] py-6">
              <SectionLabel>Current action summary</SectionLabel>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricStripItem
                  label="Actions ready now"
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
                  Actions are grouped by priority so the page stays easy to
                  scan. Start with the highest-priority move first, then work
                  down the list.
                </p>

                <div className="mt-6">
                  {nextMoves.map((item, index) => (
                    <article
                      key={item}
                      className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                        index === nextMoves.length - 1
                          ? ""
                          : "border-b border-[var(--border)]"
                      }`}
                    >
                      <div className="flex items-center md:justify-center">
                        <div
                          className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                          style={{
                            backgroundColor:
                              index === 0
                                ? "var(--brand-700)"
                                : "var(--reference-soft)",
                            color:
                              index === 0 ? "#ffffff" : "var(--text-strong)",
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
                            ? "This is the first move most likely to help you make progress with the current action plan."
                            : "This supports the main action plan and helps you work through the current priorities in order."}
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
                      label: "Do these first",
                      helper:
                        "These carry the strongest weight right now and should be handled before the rest.",
                      items: groupedActions.high,
                    },
                    {
                      key: "medium",
                      label: "Do these next",
                      helper:
                        "Move to these after the highest-priority work is underway.",
                      items: groupedActions.medium,
                    },
                    {
                      key: "low",
                      label: "Do these after that",
                      helper:
                        "These still help, but they matter less than the work above.",
                      items: groupedActions.low,
                    },
                  ]
                    .filter((group) => group.items.length > 0)
                    .map((group, groupIndex) => (
                      <div
                        key={group.key}
                        className={`py-6 ${
                          groupIndex === 0
                            ? ""
                            : "border-t border-[var(--border)]"
                        }`}
                      >
                        <ActionGroup
                          projectId={projectId}
                          label={group.label}
                          helper={group.helper}
                          groupKey={group.key}
                          items={group.items}
                        />
                      </div>
                    ))}
                </div>
              </section>

              <aside className="space-y-8">
                <section>
                  <SectionLabel>Open another center</SectionLabel>
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
                      href={`/projects/${projectId}/identity`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open identity page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/reviews`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open reviews page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/visibility`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open visibility page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/website`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open website page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/ai`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open AI page
                    </Link>
                    <Link
                      href={`/projects/${projectId}/outcomes`}
                      className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Open outcomes page
                    </Link>
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <SectionLabel>What this tells you</SectionLabel>

                  <div className="mt-4">
                    <DetailRow
                      label="Latest capture"
                      value={formatDate(actionsRow?.captured_at ?? null)}
                      helper="This is the most recent action snapshot currently available."
                    />
                    <DetailRow
                      label="Version"
                      value={actionsRow?.version ?? "Not set"}
                      helper="This is the version label attached to the current action plan."
                    />
                    <DetailRow
                      label="Primary action"
                      value={leadAction?.title ?? "Not set"}
                      helper="This is the first action currently shown on the page."
                    />
                    <DetailRow
                      label="Primary category"
                      value={
                        leadAction ? categoryLabel(leadAction.category) : "Not set"
                      }
                      helper="This tells you which owner center is most likely to help with the first action."
                    />
                  </div>
                </section>

                <section className="border-t border-[var(--border)] pt-6">
                  <SectionLabel>Progress so far</SectionLabel>

                  <div className="mt-4">
                    <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                      {totalActions}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                      actions currently available for this project
                    </p>

                    <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                      <HeaderMeta label="High priority" value={String(highCount)} />
                      <HeaderMeta
                        label="Medium priority"
                        value={String(mediumCount)}
                      />
                      <HeaderMeta
                        label="Lower priority"
                        value={String(lowCount)}
                      />
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
