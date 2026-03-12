"use client";

import { useEffect, useMemo, useState } from "react";
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

function priorityClasses(priority: string) {
  if (priority === "high") {
    return "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
  }

  if (priority === "medium") {
    return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  }

  return "border-neutral-300 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
}

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

export default function ActionsPage({ params }: PageProps) {
  const [projectId, setProjectId] = useState("");
  const [actionsRow, setActionsRow] = useState<ProjectActionsRow | null>(null);
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

        const response = await fetch(`/api/projects/${resolvedProjectId}/actions`, {
          cache: "no-store",
        });

        const json = (await response.json()) as ProjectActionsResponse;

        if (!response.ok || !json.ok) {
          throw new Error(json.error ?? "Failed to load project actions.");
        }

        if (!isMounted) {
          return;
        }

        setActionsRow(json.actionsRow);
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

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-neutral-700 dark:text-neutral-400">
            Loading action intelligence…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-500">
              Digital Brain
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950 dark:text-white">
              Growth Actions
            </h1>
            <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-400">
              Recommended next actions generated from authority, rank, and competitive
              pressure signals.
            </p>
            <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-500">
              Latest capture: {actionsRow?.captured_at ?? "—"} • Version:{" "}
              {actionsRow?.version ?? "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Back to Authority
            </Link>
            <Link
              href={`/projects/${projectId}/rank`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              View Rank Intelligence
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!error && actions.length === 0 ? (
          <div className="rounded-2xl border border-neutral-300 bg-white p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
            No stored growth actions found for this project yet.
          </div>
        ) : null}

        {groupedActions.high.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                High Priority
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
                Immediate actions with the strongest strategic impact.
              </p>
            </div>

            <div className="space-y-4">
              {groupedActions.high.map((action, index) => (
                <div
                  key={`high-${index}-${action.title}`}
                  className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="text-sm leading-6 text-neutral-800 dark:text-neutral-300">
                        {action.detail}
                      </p>
                    </div>

                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${priorityClasses(
                        action.priority
                      )}`}
                    >
                      {formatPriority(action.priority)}
                    </div>
                  </div>

                  <p className="mt-3 text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
                    {categoryLabel(action.category)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {groupedActions.medium.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Medium Priority
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
                Important actions that strengthen visibility and competitiveness.
              </p>
            </div>

            <div className="space-y-4">
              {groupedActions.medium.map((action, index) => (
                <div
                  key={`medium-${index}-${action.title}`}
                  className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="text-sm leading-6 text-neutral-800 dark:text-neutral-300">
                        {action.detail}
                      </p>
                    </div>

                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${priorityClasses(
                        action.priority
                      )}`}
                    >
                      {formatPriority(action.priority)}
                    </div>
                  </div>

                  <p className="mt-3 text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
                    {categoryLabel(action.category)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {groupedActions.low.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
                Lower Priority
              </h2>
              <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
                Useful follow-up actions once high-priority gaps are being addressed.
              </p>
            </div>

            <div className="space-y-4">
              {groupedActions.low.map((action, index) => (
                <div
                  key={`low-${index}-${action.title}`}
                  className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                        {action.title}
                      </h3>
                      <p className="text-sm leading-6 text-neutral-800 dark:text-neutral-300">
                        {action.detail}
                      </p>
                    </div>

                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${priorityClasses(
                        action.priority
                      )}`}
                    >
                      {formatPriority(action.priority)}
                    </div>
                  </div>

                  <p className="mt-3 text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
                    {categoryLabel(action.category)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}