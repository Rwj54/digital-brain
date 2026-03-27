import type { Project } from "@/components/projects/dashboard/types";

type WhyThisMattersCardProps = {
  hasCapacity: boolean;
  labelPlural: string;
  project: Project | null;
  monthsToCloseGap: number | null;
  gapReviews: number | null;
};

function InfoBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-[var(--border)] pt-4">
      <p className="text-sm font-semibold text-[var(--text-strong)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">{body}</p>
    </div>
  );
}

export function WhyThisMattersCard({
  hasCapacity,
  labelPlural,
  project,
  monthsToCloseGap,
  gapReviews,
}: WhyThisMattersCardProps) {
  return (
    <section className="border-t border-[var(--border)] py-6">
      <div className="border-b border-[var(--border)] pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Why this matters
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
          Plain-English explanation of the target math
        </h3>
      </div>

      {!hasCapacity ? (
        <div className="grid gap-5 pt-5">
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-body)]">
            Digital Brain shows two targets because there is a difference between
            what would close the gap fastest and what your business can realistically
            produce in the near term.
          </p>

          <div className="grid gap-5 md:grid-cols-2 md:gap-8">
            <InfoBlock
              title="Gap-based ideal"
              body="Pure competitive math. This is the faster target if the goal is to close the review gap aggressively."
            />
            <InfoBlock
              title="Realistic target"
              body="Capacity-aware math. This reflects what the business can likely produce based on current customer volume."
            />
          </div>

          <div className="border-l-4 border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3">
            <p className="text-sm leading-7 text-[var(--warning)]">
              Next step: go to <span className="font-semibold">Settings</span> and
              enter monthly {labelPlural} plus the percent who leave a review when
              asked.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 pt-5">
          <p className="max-w-3xl text-sm leading-7 text-[var(--text-body)]">
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

          <div className="grid gap-5 md:grid-cols-2 md:gap-8">
            <InfoBlock
              title="What this means"
              body="That creates a realistic ceiling for what the business can probably achieve in the next 90 days without pretending capacity is unlimited."
            />

            {monthsToCloseGap !== null && gapReviews !== null ? (
              <InfoBlock
                title="Full-gap timeline"
                body={`At the current pace, closing the full review gap of about ${gapReviews} would take roughly ${monthsToCloseGap} months.`}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}