type SetupChecklistCardProps = {
  setupDoneCount: number;
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  labelPlural: string;
  onGoToSettings: () => void;
};

function StepStatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: ok ? "var(--success-soft)" : "var(--warning-soft)",
        color: ok ? "var(--success)" : "var(--warning)",
      }}
    >
      {ok ? "Done" : "Next"}
    </span>
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
  function renderSetupStep(ok: boolean, title: string, desc: string) {
    return (
      <button
        type="button"
        onClick={onGoToSettings}
        className="w-full border-t border-[var(--border)] px-0 py-4 text-left transition hover:opacity-100"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-strong)]">{title}</p>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--text-body)]">
              {desc}
            </p>
          </div>

          <div className="shrink-0 pt-0.5">
            <StepStatusPill ok={ok} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <section className="grid gap-5 border-b border-[var(--border)] pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

        <div className="rounded-full bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)] ring-1 ring-inset ring-[var(--border)]/60">
          {setupDoneCount}/3 done
        </div>
      </div>

      <div>
        {renderSetupStep(
          hasGbp,
          "1) Add your GBP snapshot",
          "Business name, category, rating, and total reviews. This gives the project a real starting point.",
        )}
        {renderSetupStep(
          hasCompetitors,
          "2) Add 3–4 competitors",
          "Start with the businesses you see most often in Google Maps for this category and metro.",
        )}
        {renderSetupStep(
          hasCapacity,
          "3) Set monthly volume + review rate",
          `Tell Digital Brain how many ${labelPlural} you handle and what percent typically leave a review when asked.`,
        )}
      </div>
    </section>
  );
}
