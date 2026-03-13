import { Card } from "@/components/projects/dashboard/Card";
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
    <Card title="Why this matters" subtitle="Plain-English explanation of targets">
      {!hasCapacity ? (
        <div className="text-sm text-zinc-800">
          The tool shows two targets:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <span className="font-extrabold">Gap-based ideal</span> = SEO math (how many reviews to
              close the competitor gap fast).
            </li>
            <li>
              <span className="font-extrabold">Realistic target</span> = what your business can actually
              produce based on monthly volume.
            </li>
          </ul>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-800">
            Next step: go to <span className="font-extrabold">Settings</span> and enter monthly{" "}
            {labelPlural} + % who leave a review when asked.
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-800">
          You told us you average <span className="font-black">{project?.monthly_customer_events}</span>{" "}
          {labelPlural}/month and convert about{" "}
          <span className="font-black">{project?.review_conversion_rate}%</span> into reviews when you ask.
          <div className="mt-2">
            That sets a realistic ceiling for what you can accomplish in 90 days.
          </div>
          {monthsToCloseGap !== null && gapReviews !== null ? (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
              At your current pace, closing the full gap (~{gapReviews}) would take about{" "}
              <span className="font-extrabold">{monthsToCloseGap}</span> months.
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}