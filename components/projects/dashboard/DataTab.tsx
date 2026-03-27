import { Card } from "@/components/projects/dashboard/Card";
import type { CompetitorMetric } from "@/components/projects/dashboard/types";

type DataTabProps = {
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  competitors: CompetitorMetric[];
};

type DataCheck = {
  label: string;
  value: string;
  isComplete: boolean;
  help: string;
};

function buildChecks({
  hasGbp,
  hasCompetitors,
  hasCapacity,
  competitors,
}: DataTabProps): DataCheck[] {
  return [
    {
      label: "Business profile snapshot",
      value: hasGbp ? "Saved" : "Missing",
      isComplete: hasGbp,
      help: hasGbp
        ? "Your current Google Business Profile details are on file."
        : "Add the current Google Business Profile details so the project has a trustworthy starting point.",
    },
    {
      label: "Competitor set",
      value: hasCompetitors ? `${competitors.length} saved` : "Missing",
      isComplete: hasCompetitors,
      help: hasCompetitors
        ? "You already have a comparison set to measure against."
        : "Save at least one competitor so the project can compare your current position against the local market.",
    },
    {
      label: "Capacity model",
      value: hasCapacity ? "Saved" : "Missing",
      isComplete: hasCapacity,
      help: hasCapacity
        ? "Your review / activity assumptions are saved for action planning."
        : "Save your capacity assumptions so the project can turn gaps into realistic next actions.",
    },
  ];
}

function getSummaryText(completedCount: number): {
  eyebrow: string;
  headline: string;
  body: string;
} {
  if (completedCount === 3) {
    return {
      eyebrow: "Ready for stronger recommendations",
      headline: "This project has the core data inputs it needs right now.",
      body: "You have the minimum foundation in place for better comparisons, clearer actions, and stronger automation later.",
    };
  }

  if (completedCount === 2) {
    return {
      eyebrow: "Almost ready",
      headline: "One core input is still missing from this project.",
      body: "The foundation is mostly there, but one missing input can still weaken recommendations and slow down better automation.",
    };
  }

  if (completedCount === 1) {
    return {
      eyebrow: "Foundation still thin",
      headline: "This project needs a little more setup before the data becomes trustworthy.",
      body: "Right now, the project has only part of the baseline needed for strong comparisons and actionable recommendations.",
    };
  }

  return {
    eyebrow: "Setup still incomplete",
    headline: "This project is missing the core inputs needed for reliable guidance.",
    body: "Before this surface can produce stronger recommendations, the project needs the basic business profile, competitor, and capacity foundation saved.",
  };
}

function StatusPill({ complete }: { complete: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{
        backgroundColor: complete ? "var(--success-soft)" : "var(--warning-soft)",
        color: complete ? "var(--success)" : "var(--warning)",
      }}
    >
      {complete ? "Ready" : "Needs setup"}
    </span>
  );
}

function DataCheckRow({ check }: { check: DataCheck }) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {check.label}
          </div>
          <div className="mt-1 text-base font-semibold text-[var(--text-strong)]">
            {check.value}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-body)]">
            {check.help}
          </p>
        </div>

        <div className="shrink-0">
          <StatusPill complete={check.isComplete} />
        </div>
      </div>
    </div>
  );
}

export function DataTab(props: DataTabProps) {
  const checks = buildChecks(props);
  const completedCount = checks.filter((check) => check.isComplete).length;
  const missingChecks = checks.filter((check) => !check.isComplete);
  const summary = getSummaryText(completedCount);

  return (
    <div className="grid gap-4">
      <Card
        title="Data status"
        subtitle="This shows whether the project has the core inputs needed for stronger recommendations."
      >
        <div className="grid gap-6">
          <section className="border border-[var(--border)] bg-white px-5 py-5 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
              {summary.eyebrow}
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-strong)]">
              {summary.headline}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              {summary.body}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
              <div className="text-sm font-semibold text-[var(--text-strong)]">
                {completedCount} of 3 core inputs saved
              </div>
              <div className="text-sm text-[var(--text-body)]">
                GBP snapshot, competitors, and capacity model
              </div>
            </div>
          </section>

          <section className="border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-5 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Current footing
            </div>

            <div className="mt-4 grid gap-4">
              {checks.map((check) => (
                <DataCheckRow key={check.label} check={check} />
              ))}
            </div>
          </section>

          <section className="border-l-2 border-[var(--brand-600)] pl-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
              What to do next
            </div>

            {missingChecks.length > 0 ? (
              <div className="mt-2 grid gap-2">
                {missingChecks.map((check) => (
                  <p
                    key={check.label}
                    className="text-sm leading-6 text-[var(--text-body)]"
                  >
                    <span className="font-semibold text-[var(--text-strong)]">
                      {check.label}:
                    </span>{" "}
                    {check.help}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                The basic setup is in place. The next product step is stronger
                automated pulls, better change tracking, and clearer action generation
                from this saved foundation.
              </p>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}