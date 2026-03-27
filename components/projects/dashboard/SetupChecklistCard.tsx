type SetupChecklistCardProps = {
  setupDoneCount: number;
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  labelPlural: string;
  onGoToSettings: () => void;
};

function StepStatus({ ok }: { ok: boolean }) {
  return (
    <span
      className="border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{
        borderColor: ok ? "var(--success)" : "var(--warning)",
        color: ok ? "var(--success)" : "var(--warning)",
        backgroundColor: ok ? "var(--success-soft)" : "var(--warning-soft)",
      }}
    >
      {ok ? "Done" : "Next"}
    </span>
  );
}

function SetupStep({
  ok,
  title,
  desc,
  onGoToSettings,
}: {
  ok: boolean;
  title: string;
  desc: string;
  onGoToSettings: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGoToSettings}
      className="w-full border-t border-[var(--border)] py-4 text-left transition hover:opacity-100 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-[var(--text-strong)]">{title}</p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
            {desc}
          </p>
        </div>

        <div className="shrink-0">
          <StepStatus ok={ok} />
        </div>
      </div>
    </button>
  );
}

export function SetupChecklistCard({
  setupDoneCount,
  hasGbp,
  hasCompetitors,
  hasCapacity,
  labelPlural,
  onGoToSettings,
}: SetupChecklistCardProps) {
  return (
    <section className="border-t border-[var(--border)] py-6">
      <div className="grid gap-4 border-b border-[var(--border)] pb-5 lg:grid-cols-[minmax(0,1fr)_120px] lg:items-start">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Setup checklist
          </p>

          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
            Complete these once, then the project gets much more useful.
          </h3>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
            This is the minimum setup layer that helps Digital Brain produce more
            grounded recommendations and better targets.
          </p>
        </div>

        <div className="border-l border-[var(--border)] pl-4 lg:justify-self-end">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Progress
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
            {setupDoneCount}/3 complete
          </div>
        </div>
      </div>

      <div className="pt-5">
        <SetupStep
          ok={hasGbp}
          title="1) Add your GBP snapshot"
          desc="Business name, category, rating, and total reviews. This gives the project a real starting point."
          onGoToSettings={onGoToSettings}
        />

        <SetupStep
          ok={hasCompetitors}
          title="2) Add 3–4 competitors"
          desc="Start with the businesses you see most often in Google Maps for this category and metro."
          onGoToSettings={onGoToSettings}
        />

        <SetupStep
          ok={hasCapacity}
          title="3) Set monthly volume + review rate"
          desc={`Tell Digital Brain how many ${labelPlural} you handle and what percent typically leave a review when asked.`}
          onGoToSettings={onGoToSettings}
        />
      </div>
    </section>
  );
}