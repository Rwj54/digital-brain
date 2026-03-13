import { SetupChecklistCard } from "@/components/projects/dashboard/SetupChecklistCard";
import { OverviewSummaryCards } from "@/components/projects/dashboard/OverviewSummaryCards";
import { WhyThisMattersCard } from "@/components/projects/dashboard/WhyThisMattersCard";
import type {
  CompetitorMetric,
  GbpProfile,
  Project,
} from "@/components/projects/dashboard/types";

type OverviewTabProps = {
  gbp: GbpProfile | null;
  competitors: CompetitorMetric[];
  project: Project | null;
  labelPlural: string;
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  setupDoneCount: number;
  gapReviews: number | null;
  desiredTarget90d: number | null;
  maxReviews90d: number | null;
  realisticTarget90d: number | null;
  perWeek: number | null;
  monthsToCloseGap: number | null;
  onGoToSettings: () => void;
};

export function OverviewTab({
  gbp,
  competitors,
  project,
  labelPlural,
  hasGbp,
  hasCompetitors,
  hasCapacity,
  setupDoneCount,
  gapReviews,
  desiredTarget90d,
  maxReviews90d,
  realisticTarget90d,
  perWeek,
  monthsToCloseGap,
  onGoToSettings,
}: OverviewTabProps) {
  return (
    <div className="grid gap-4">
      <SetupChecklistCard
        setupDoneCount={setupDoneCount}
        hasGbp={hasGbp}
        hasCompetitors={hasCompetitors}
        hasCapacity={hasCapacity}
        labelPlural={labelPlural}
        onGoToSettings={onGoToSettings}
      />

      <OverviewSummaryCards
        gbp={gbp}
        competitors={competitors}
        hasGbp={hasGbp}
        hasCompetitors={hasCompetitors}
        gapReviews={gapReviews}
        desiredTarget90d={desiredTarget90d}
        maxReviews90d={maxReviews90d}
        realisticTarget90d={realisticTarget90d}
        perWeek={perWeek}
      />

      <WhyThisMattersCard
        hasCapacity={hasCapacity}
        labelPlural={labelPlural}
        project={project}
        monthsToCloseGap={monthsToCloseGap}
        gapReviews={gapReviews}
      />
    </div>
  );
}