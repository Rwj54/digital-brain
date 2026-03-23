import type { Project } from "@/components/projects/dashboard/types";

type WhyThisMattersCardProps = {
  hasCapacity: boolean;
  labelPlural: string;
  project: Project | null;
  monthsToCloseGap: number | null;
  gapReviews: number | null;
};

export function WhyThisMattersCard({
  hasCapacity,
  labelPlural,
  project,
  monthsToCloseGap,
  gapReviews,
}: WhyThisMattersCardProps) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        Why this matters
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
        Plain-English explanation of the target math
      </h3>

      {!hasCapacity ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-7 text-[var(--text-body)]">
            Digital Brain shows two targets because there is a difference between
            what would close the gap fastest and what your business can realistically
            produce in the near term.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Gap-based ideal
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                Pure competitive math. This is the faster target if the goal is
                to close the review gap aggressively.
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                Realistic target
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                Capacity-aware math. This reflects what the business can likely
                produce based on current customer volume.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(194,65,12,0.16)] bg-[var(--warning-soft)] px-4 py-4">
            <p className="text-sm leading-7 text-[var(--warning)]">
              Next step: go to <span className="font-semibold">Settings</span> and
              enter monthly {labelPlural} plus the percent who leave a review when asked.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-7 text-[var(--text-body)]">
            You told us the business averages{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              {project?.monthly_customer_events}
            </span>{" "}
            {labelPlural} per month and converts about{" "}
            <span className="font-semibold text-[var(--text-strong)]">
              {project?.review_conversion_rate}%
            </span>{" "}
            into reviews when asked.
          </p>

          <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4">
            <p className="text-sm leading-7 text-[var(--text-body)]">
              That creates a realistic ceiling for what the business can probably
              achieve in the next 90 days without pretending capacity is unlimited.
            </p>
          </div>

          {monthsToCloseGap !== null && gapReviews !== null ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-4 text-sm leading-7 text-[var(--text-body)]">
              At the current pace, closing the full review gap of about{" "}
              <span className="font-semibold text-[var(--text-strong)]">{gapReviews}</span>{" "}
              would take roughly{" "}
              <span className="font-semibold text-[var(--text-strong)]">{monthsToCloseGap}</span>{" "}
              months.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}