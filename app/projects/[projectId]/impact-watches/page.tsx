"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  type OwnerTask,
  type OwnerTaskImpact,
  type OwnerTaskImpactsResponse,
  type OwnerTasksResponse,
} from "@/lib/owner/types";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

type LoadState = {
  projectId: string;
  impactsData: OwnerTaskImpactsResponse | null;
  tasksData: OwnerTasksResponse | null;
  loading: boolean;
  error: string;
};

function formatCount(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : "Not set";
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year && month && day) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
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

function formatDateTime(value: string | null | undefined): string {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function boolLabel(value: boolean | null | undefined): string {
  return value ? "Yes" : "No";
}

function formatDaysRemaining(value: number | null): string {
  if (value === null) {
    return "Timing not available";
  }

  if (value === 0) {
    return "Ready now";
  }

  if (value === 1) {
    return "1 day left";
  }

  return `${value} days left`;
}

function statusLabel(impact: OwnerTaskImpact): string {
  const computedStatus = impact.readiness.computedStatus || impact.status;

  if (computedStatus === "waiting_for_window") return "Watching";
  if (computedStatus === "window_ready") return "Window ready";
  if (computedStatus === "completed") return "Completed";
  return "Tracked";
}

function eligibilityLabel(impact: OwnerTaskImpact): string {
  const eligibility = impact.comparisonEligibility;

  if (eligibility.isEligibleForComparisonMetricsWrite) {
    return "Metrics dry-run candidate";
  }

  if (eligibility.isEligibleForComparisonRead) {
    return "Read eligible";
  }

  if (eligibility.decision === "waiting_for_watch_window") {
    return "Waiting for window";
  }

  if (eligibility.decision === "future_source_required") {
    return "Future source needed";
  }

  if (eligibility.decision === "context_only_no_write") {
    return "Context only";
  }

  return "Not ready";
}

function writeGuardLabel(impact: OwnerTaskImpact): string {
  const eligibility = impact.comparisonEligibility;

  if (
    eligibility.canWriteImpactSummary ||
    eligibility.canWriteConfidenceLevel ||
    eligibility.canPromoteStoredStatus
  ) {
    return "Unsafe write gate detected";
  }

  if (eligibility.isEligibleForComparisonMetricsWrite) {
    return "Dry-run only";
  }

  return "Writes disabled";
}

function getImpactTaskTitle(
  impact: OwnerTaskImpact,
  taskMap: Map<string, OwnerTask>,
): string {
  return taskMap.get(impact.owner_task_id)?.title ?? "Unknown owner task";
}

function getImpactRead(impact: OwnerTaskImpact): string {
  if (!impact.readiness.isWindowReady) {
    return "The watch window is still open. Digital Brain should keep this as timing metadata only.";
  }

  if (impact.comparisonEligibility.isEligibleForComparisonMetricsWrite) {
    return "This impact passes the conservative metrics gate for a future dry run only. Database writes are still disabled.";
  }

  if (impact.comparisonEligibility.isEligibleForComparisonRead) {
    return "This impact can support a read-only comparison, but it should not write stronger impact claims.";
  }

  return impact.comparisonEligibility.ownerSummary;
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

function MetricBlock({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p>
    </div>
  );
}

function InlineTag({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold text-[var(--text-body)]"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="border-t border-[var(--border)] py-6">
      <p className="text-lg font-semibold text-[var(--text-strong)]">
        No impact watches yet
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
        Complete an owner task to create a read-only impact watch. Digital Brain
        will preserve timing and baseline metadata before any future comparison.
      </p>
    </div>
  );
}

function ImpactWatchRow({
  impact,
  taskTitle,
}: {
  impact: OwnerTaskImpact;
  taskTitle: string;
}) {
  const reviewComparison = impact.reviewComparison;
  const comparisonMetricsKeys = Object.keys(impact.comparison_metrics ?? {});

  return (
    <article className="border-t border-[var(--border)] py-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-semibold text-[var(--text-strong)]">
          {taskTitle}
        </p>
        <InlineTag>{statusLabel(impact)}</InlineTag>
        <InlineTag>{formatDaysRemaining(impact.readiness.daysRemaining)}</InlineTag>
        <InlineTag>{eligibilityLabel(impact)}</InlineTag>
        <InlineTag>{writeGuardLabel(impact)}</InlineTag>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
        {getImpactRead(impact)}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Timing
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            Eligible on {formatDate(impact.readiness.eligibleOn)}. Captured{" "}
            {formatDateTime(impact.captured_at)}.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Comparison gate
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            Read eligible:{" "}
            {boolLabel(impact.comparisonEligibility.isEligibleForComparisonRead)}
            . Metrics-write eligible:{" "}
            {boolLabel(
              impact.comparisonEligibility.isEligibleForComparisonMetricsWrite,
            )}
            .
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Write safety
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            Summary write:{" "}
            {boolLabel(impact.comparisonEligibility.canWriteImpactSummary)}.
            Confidence write:{" "}
            {boolLabel(impact.comparisonEligibility.canWriteConfidenceLevel)}.
            Status promotion:{" "}
            {boolLabel(impact.comparisonEligibility.canPromoteStoredStatus)}.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <InlineTag>Impact ID: {impact.id}</InlineTag>
        <InlineTag>Task ID: {impact.owner_task_id}</InlineTag>
        <InlineTag>Stored status: {impact.status}</InlineTag>
        <InlineTag>Computed status: {impact.readiness.computedStatus}</InlineTag>
        <InlineTag>
          comparison_metrics keys:{" "}
          {comparisonMetricsKeys.length > 0
            ? comparisonMetricsKeys.join(", ")
            : "none"}
        </InlineTag>
      </div>

      {reviewComparison ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Review read
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            Baseline reviews:{" "}
            {formatCount(reviewComparison.baseline.baselineCurrentReviews)}.
            Current reviews: {formatCount(reviewComparison.current.currentReviews)}.
            Baseline gap:{" "}
            {formatCount(reviewComparison.baseline.baselineReviewGap)}. Current
            gap: {formatCount(reviewComparison.current.currentReviewGap)}.
          </p>
          <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
            {reviewComparison.noClaimLanguage}
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
        This inspection row is read-only. It does not write comparison_metrics,
        impact_summary, confidence_level, or promote stored impact status.
      </p>
    </article>
  );
}

export default function ImpactWatchesPage({ params }: PageProps) {
  const [state, setState] = useState<LoadState>({
    projectId: "",
    impactsData: null,
    tasksData: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const resolved = await params;
        const [impactsResponse, tasksResponse] = await Promise.all([
          fetch(`/api/projects/${resolved.projectId}/owner-task-impacts`, {
            cache: "no-store",
          }),
          fetch(`/api/projects/${resolved.projectId}/owner-tasks`, {
            cache: "no-store",
          }),
        ]);

        if (!impactsResponse.ok || !tasksResponse.ok) {
          throw new Error("Failed to load impact watches.");
        }

        const [impactsJson, tasksJson] = await Promise.all([
          impactsResponse.json() as Promise<OwnerTaskImpactsResponse>,
          tasksResponse.json() as Promise<OwnerTasksResponse>,
        ]);

        if (!cancelled) {
          setState({
            projectId: resolved.projectId,
            impactsData: impactsJson,
            tasksData: tasksJson,
            loading: false,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load impact watches.",
          }));
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params]);

  const taskMap = useMemo(() => {
    const map = new Map<string, OwnerTask>();

    for (const task of state.tasksData?.tasks ?? []) {
      map.set(task.id, task);
    }

    return map;
  }, [state.tasksData]);

  const sortedImpacts = useMemo(() => {
    return [...(state.impactsData?.impacts ?? [])].sort((first, second) => {
      const firstDays = first.readiness.daysRemaining ?? Number.MAX_SAFE_INTEGER;
      const secondDays =
        second.readiness.daysRemaining ?? Number.MAX_SAFE_INTEGER;

      if (first.readiness.isWindowReady !== second.readiness.isWindowReady) {
        return first.readiness.isWindowReady ? 1 : -1;
      }

      if (firstDays !== secondDays) {
        return firstDays - secondDays;
      }

      return String(second.captured_at).localeCompare(String(first.captured_at));
    });
  }, [state.impactsData]);

  if (state.loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading impact watches...
          </p>
        </div>
      </main>
    );
  }

  if (state.error || !state.impactsData || !state.tasksData) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {state.error || "Failed to load impact watches."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const summary = state.impactsData.summary;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[var(--brand-700)]">
                Developer inspection
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">
                Impact watch timing and write gate
              </h1>
              <p className="mt-4 text-base leading-8 text-[var(--text-body)]">
                This page lists completed owner action records being watched for
                future comparison. It is intentionally read-only and keeps
                outcome claims disabled.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/projects/${state.projectId}/owner`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Back to owner page
              </Link>
              <Link
                href={`/projects/${state.projectId}/actions`}
                className="px-4 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: "var(--brand-700)",
                }}
              >
                Open action center
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <HeaderMeta label="Project" value={state.projectId} />
            <HeaderMeta
              label="Impact records"
              value={formatCount(summary.totalImpacts)}
            />
            <HeaderMeta
              label="Being watched"
              value={formatCount(summary.waitingForWindow)}
            />
            <HeaderMeta
              label="Ready to compare"
              value={formatCount(summary.computedWindowReady)}
            />
          </div>
        </section>

        <section className="grid gap-8 py-8 xl:grid-cols-[1fr_0.48fr]">
          <div>
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Impact watch rows
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                Real records, conservative status
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                Rows are sorted by watch timing first, then most recent capture.
                This keeps upcoming comparison windows visible without turning on
                any write path.
              </p>
            </div>

            <div className="mt-6">
              {sortedImpacts.length > 0 ? (
                sortedImpacts.map((impact) => (
                  <ImpactWatchRow
                    key={impact.id}
                    impact={impact}
                    taskTitle={getImpactTaskTitle(impact, taskMap)}
                  />
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>

          <aside>
            <MetricBlock
              label="Metrics-write eligible"
              value={formatCount(summary.comparisonMetricsWriteEligible)}
              helper="Future comparison_metrics candidates only. A separate accepted boundary is required before writes."
            />
            <MetricBlock
              label="Comparison reads eligible"
              value={formatCount(summary.comparisonReadsEligible)}
              helper="Rows that can support a read-only comparison read without writing outcome claims."
            />
            <MetricBlock
              label="Review reads"
              value={formatCount(summary.reviewComparisons)}
              helper="Impact watches with saved review baseline and current review data."
            />
            <MetricBlock
              label="Review reads ready"
              value={formatCount(summary.reviewComparisonsReady)}
              helper="Review reads whose watch window has elapsed and can be compared conservatively."
            />
            <MetricBlock
              label="Impact-summary writes"
              value={formatCount(summary.impactSummaryWriteEligible)}
              helper="This should remain zero until impact_summary writes are explicitly accepted."
            />
            <MetricBlock
              label="Confidence writes"
              value={formatCount(summary.confidenceWriteEligible)}
              helper="This should remain zero until confidence_level writes are explicitly accepted."
            />
            <MetricBlock
              label="Status promotions"
              value={formatCount(summary.statusPromotionEligible)}
              helper="This should remain zero until stored status promotion is explicitly accepted."
            />

            <div className="border-t border-[var(--border)] py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                No-write boundary
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                <li>No comparison_metrics database update.</li>
                <li>No impact_summary write.</li>
                <li>No confidence_level write.</li>
                <li>No owner_task_impacts.status promotion.</li>
                <li>No attribution claim.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
