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
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
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
        className="w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition hover:translate-y-[-1px]"
        style={{
          borderColor: ok ? "rgba(21, 128, 61, 0.18)" : "var(--border)",
          backgroundColor: ok ? "var(--success-soft)" : "var(--reference-soft)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-strong)]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{desc}</p>
          </div>

          <StepStatusPill ok={ok} />
        </div>
      </button>
    );
  }

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
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

        <div className="rounded-full bg-[var(--reference-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)]">
          {setupDoneCount}/3 done
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
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