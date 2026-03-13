import type {
  CompetitorMetric,
  GbpProfile,
  Project,
  VolumePresetOption,
} from "@/components/projects/dashboard/types";

type DashboardDerivedArgs = {
  project: Project | null;
  gbp: GbpProfile | null;
  competitors: CompetitorMetric[];
  eventLabelSingular: string;
  eventLabelPlural: string;
  preset: VolumePresetOption;
};

export type DashboardDerivedValues = {
  labelSingular: string;
  labelPlural: string;
  topCompetitor: CompetitorMetric | null;
  gapReviews: number | null;
  desiredTarget90d: number | null;
  maxReviews90d: number | null;
  realisticTarget90d: number | null;
  perWeek: number | null;
  monthsToCloseGap: number | null;
  hasCapacity: boolean;
  hasGbp: boolean;
  hasCompetitors: boolean;
  setupDoneCount: number;
};

export function computeDashboardDerived({
  project,
  gbp,
  competitors,
  eventLabelSingular,
  eventLabelPlural,
  preset,
}: DashboardDerivedArgs): DashboardDerivedValues {
  const labelSingular =
    project?.event_label_singular || eventLabelSingular || preset.singular;
  const labelPlural =
    project?.event_label_plural || eventLabelPlural || preset.plural;

  const topCompetitor = competitors.length > 0 ? competitors[0] : null;
  const yourReviews = gbp?.total_reviews ?? null;

  const gapReviews =
    yourReviews === null ||
    topCompetitor?.total_reviews === null ||
    topCompetitor?.total_reviews === undefined
      ? null
      : Math.max(0, Number(topCompetitor.total_reviews) - Number(yourReviews));

  const desiredTarget90d =
    gapReviews === null
      ? null
      : gapReviews > 100
        ? Math.ceil(gapReviews * 0.25)
        : Math.ceil(gapReviews * 0.5);

  const monthly = project?.monthly_customer_events ?? null;
  const conversion = project?.review_conversion_rate ?? null;

  const maxReviews90d =
    monthly === null || conversion === null
      ? null
      : Math.floor(monthly * (conversion / 100) * 3);

  const realisticTarget90d =
    desiredTarget90d === null
      ? null
      : maxReviews90d === null
        ? desiredTarget90d
        : Math.min(desiredTarget90d, maxReviews90d);

  const perWeek =
    realisticTarget90d === null
      ? null
      : Math.max(0, Math.ceil(realisticTarget90d / 13));

  const monthsToCloseGap =
    gapReviews === null || monthly === null || conversion === null
      ? null
      : monthly * (conversion / 100) <= 0
        ? null
        : Math.ceil(gapReviews / (monthly * (conversion / 100)));

  const hasCapacity =
    project?.monthly_customer_events !== null &&
    project?.review_conversion_rate !== null;

  const hasGbp =
    !!gbp?.gbp_name &&
    gbp?.total_reviews !== null &&
    gbp?.total_reviews !== undefined;

  const hasCompetitors = competitors.length > 0;
  const setupDoneCount = [hasGbp, hasCompetitors, hasCapacity].filter(Boolean).length;

  return {
    labelSingular,
    labelPlural,
    topCompetitor,
    gapReviews,
    desiredTarget90d,
    maxReviews90d,
    realisticTarget90d,
    perWeek,
    monthsToCloseGap,
    hasCapacity,
    hasGbp,
    hasCompetitors,
    setupDoneCount,
  };
}