import { type OwnerPageDashboard } from "@/lib/owner/types";
import {
  HealthMarkerItem,
  SectionLabel,
  SummaryStat,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
};

export function OwnerHealthMarkersSection({ dashboard }: Props) {
  const outcomesSummary = dashboard.dashboard.outcomesSummary;
  const hasOutcomeSnapshot =
    outcomesSummary.realisticTarget90d !== null ||
    outcomesSummary.perWeek !== null ||
    outcomesSummary.gapReviews !== null;

  return (
    <section className="border-b border-[var(--border)] py-6">
      <SectionLabel>Health markers</SectionLabel>
      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {dashboard.dashboard.healthMarkers.map((marker) => (
          <HealthMarkerItem key={marker.label} marker={marker} />
        ))}
      </div>

      {hasOutcomeSnapshot ? (
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <SectionLabel>Outcomes snapshot</SectionLabel>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
            The owner now has a simple business-impact pace tied to current visibility work.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <SummaryStat
              label="90-day goal"
              value={
                outcomesSummary.realisticTarget90d !== null
                  ? `${outcomesSummary.realisticTarget90d} reviews`
                  : "Not set"
              }
            />
            <SummaryStat
              label="Weekly pace"
              value={
                outcomesSummary.perWeek !== null
                  ? `${outcomesSummary.perWeek} per week`
                  : "Not set"
              }
            />
            <SummaryStat
              label="Review gap"
              value={
                outcomesSummary.gapReviews !== null
                  ? `${outcomesSummary.gapReviews}`
                  : "Not set"
              }
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}