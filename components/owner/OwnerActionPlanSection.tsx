import {
  formatPercent,
  formatStatus,
  getStepNumberTone,
  getStepTone,
} from "@/lib/owner/formatters";
import {
  type OwnerPageDashboard,
  type OwnerTask,
  type OwnerTasksResponse,
  type RenderStep,
} from "@/lib/owner/types";
import {
  InlineTag,
  SectionLabel,
  SummaryStat,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
  steps: RenderStep[];
  tasksSummary: OwnerTasksResponse["summary"];
  savingTaskId: string | null;
  onToggleTask: (task: OwnerTask) => void;
};

export function OwnerActionPlanSection({
  dashboard,
  steps,
  tasksSummary,
  savingTaskId,
  onToggleTask,
}: Props) {
  return (
    <section className="grid gap-10 py-8 xl:grid-cols-[1.22fr_0.78fr]">
      <section id="next-steps">
        <SectionLabel>Your next 3 steps</SectionLabel>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
          Follow these in order
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
          This is the guided action flow that should give the clearest next wins
          without making the owner learn SEO or AI visibility jargon.
        </p>

        <div className="mt-6">
          {steps.map((step, index) => {
            const tone = getStepTone(step.status);
            const numberTone = getStepNumberTone(step.index);
            const isTask = step.kind === "task";
            const isSaving = isTask && savingTaskId === step.task.id;
            const isCompleted = step.status === "completed";
            const isLast = index === steps.length - 1;

            return (
              <article
                key={step.key}
                className={`grid gap-4 py-6 md:grid-cols-[56px_1fr_auto] md:items-start ${
                  isLast ? "" : "border-b border-[var(--border)]"
                }`}
              >
                <div className="flex items-center md:justify-center">
                  <div
                    className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                    style={{
                      backgroundColor: numberTone.soft,
                      color: numberTone.solid,
                    }}
                  >
                    {step.index}
                  </div>
                </div>

                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-tight text-[var(--text-strong)]">
                      {step.title}
                    </h3>
                    <InlineTag tone={tone}>{formatStatus(step.status)}</InlineTag>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                    {step.reason}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <InlineTag>Who: {step.who}</InlineTag>
                    <InlineTag>Time: {step.time}</InlineTag>
                    <InlineTag>Difficulty: {step.difficulty}</InlineTag>
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Expected benefit
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                        {step.expectedBenefit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        What success looks like
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                        {step.proofOfCompletion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Confidence
                      </dt>
                      <dd className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                        {step.confidenceLabel}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="md:min-w-[148px]">
                  {isTask ? (
                    <button
                      type="button"
                      onClick={() => onToggleTask(step.task)}
                      disabled={isSaving}
                      className="inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        backgroundColor: isCompleted
                          ? "var(--reference-soft)"
                          : "var(--text-strong)",
                        color: isCompleted ? "var(--text-strong)" : "#ffffff",
                        border: isCompleted
                          ? "1px solid var(--border)"
                          : "1px solid var(--text-strong)",
                      }}
                    >
                      {isSaving
                        ? "Saving..."
                        : isCompleted
                          ? "Reopen task"
                          : "Mark complete"}
                    </button>
                  ) : (
                    <div className="pt-2 text-sm font-semibold text-[var(--accent-blue-600)]">
                      Suggested next action
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {steps.length === 0 ? (
            <div className="border-t border-[var(--border)] pt-5 text-sm text-[var(--text-body)]">
              No task or priority steps are available yet.
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-8">
        <section>
          <SectionLabel>What Google wants next</SectionLabel>

          <div className="mt-4">
            <div>
              <p className="text-sm font-semibold text-[var(--brand-700)]">
                Helping now
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {dashboard.dashboard.guidance.helpingNow.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[var(--brand-600)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Google still wants
              </p>
              <ul className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {dashboard.dashboard.guidance.googleStillWants.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[var(--warning)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)] pt-6">
          <SectionLabel>Progress and proof</SectionLabel>

          <div className="mt-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {formatPercent(dashboard.dashboard.summary.completedTaskRate)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  completion rate across current owner tasks
                </p>
              </div>

              <InlineTag
                tone={{ solid: "var(--success)", soft: "var(--success-soft)" }}
              >
                {tasksSummary.completedTasks} completed
              </InlineTag>
            </div>

            <div className="mt-4 h-2 bg-[var(--reference-soft)]">
              <div
                className="h-2 bg-[var(--success)]"
                style={{
                  width: formatPercent(dashboard.dashboard.summary.completedTaskRate),
                }}
              />
            </div>

            <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
              <SummaryStat
                label="Open now"
                value={String(tasksSummary.openTasks)}
              />
              <SummaryStat
                label="Current priorities"
                value={String(dashboard.dashboard.summary.priorityCount)}
              />
              <SummaryStat
                label="Last updated"
                value={dashboard.dashboard.progress.lastUpdated}
              />
            </div>
          </div>
        </section>
      </aside>
    </section>
  );
}