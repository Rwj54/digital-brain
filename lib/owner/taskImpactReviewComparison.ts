export type OwnerTaskReviewComparisonClaimPolicy =
  "compare_only_no_attribution";

export type OwnerTaskReviewComparisonDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "changed_is_context";

export type OwnerTaskReviewBaseline = {
  baselineReviewDataAvailable: boolean;
  baselineCurrentReviews: number | null;
  baselineCurrentRating: number | null;
  baselineProfileLastFetchedAt: string | null;
  baselineTopCompetitorName: string | null;
  baselineTopCompetitorReviews: number | null;
  baselineReviewGap: number | null;
};

export type OwnerTaskReviewCurrentMetrics = {
  currentReviews: number | null;
  currentRating: number | null;
  currentProfileLastFetchedAt: string | null;
  currentTopCompetitorName: string | null;
  currentTopCompetitorReviews: number | null;
  currentReviewGap: number | null;
};

export type OwnerTaskReviewComparisonSignal = {
  key: string;
  ownerLabel: string;
  baselineValue: number | null;
  currentValue: number | null;
  changeValue: number | null;
  comparisonDirection: OwnerTaskReviewComparisonDirection;
  hasComparableValues: boolean;
  ownerRead: string;
};

export type OwnerTaskReviewComparison = {
  comparisonType: "reviews";
  isWindowReady: boolean;
  canCompare: boolean;
  claimPolicy: OwnerTaskReviewComparisonClaimPolicy;
  ownerSummary: string;
  blockedReason: string | null;
  baseline: OwnerTaskReviewBaseline;
  current: OwnerTaskReviewCurrentMetrics;
  signals: OwnerTaskReviewComparisonSignal[];
  noClaimLanguage: string;
};

const NO_ATTRIBUTION_LANGUAGE =
  "Digital Brain can compare review signals after the watch window, but it should not claim this task caused the change without stronger proof.";

function readNumberMetric(
  metrics: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = metrics?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readStringMetric(
  metrics: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metrics?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBooleanMetric(
  metrics: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  const value = metrics?.[key];

  return value === true;
}

function roundNumber(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatChange(value: number): string {
  const rounded = roundNumber(Math.abs(value));

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function calculateReviewGap(
  currentReviews: number | null,
  topCompetitorReviews: number | null,
): number | null {
  if (currentReviews === null || topCompetitorReviews === null) {
    return null;
  }

  return Math.max(0, topCompetitorReviews - currentReviews);
}

function buildHigherIsBetterRead(params: {
  label: string;
  changeValue: number | null;
  hasComparableValues: boolean;
}): string {
  if (!params.hasComparableValues || params.changeValue === null) {
    return `${params.label} cannot be compared yet.`;
  }

  if (params.changeValue > 0) {
    return `${params.label} increased by ${formatChange(params.changeValue)}.`;
  }

  if (params.changeValue < 0) {
    return `${params.label} decreased by ${formatChange(params.changeValue)}.`;
  }

  return `${params.label} stayed the same.`;
}

function buildLowerIsBetterRead(params: {
  label: string;
  changeValue: number | null;
  hasComparableValues: boolean;
}): string {
  if (!params.hasComparableValues || params.changeValue === null) {
    return `${params.label} cannot be compared yet.`;
  }

  if (params.changeValue < 0) {
    return `${params.label} improved by ${formatChange(params.changeValue)}.`;
  }

  if (params.changeValue > 0) {
    return `${params.label} increased by ${formatChange(params.changeValue)}.`;
  }

  return `${params.label} stayed the same.`;
}

function buildSignal(params: {
  key: string;
  ownerLabel: string;
  baselineValue: number | null;
  currentValue: number | null;
  comparisonDirection: OwnerTaskReviewComparisonDirection;
}): OwnerTaskReviewComparisonSignal {
  const hasComparableValues =
    params.baselineValue !== null && params.currentValue !== null;
  const changeValue = hasComparableValues
    ? roundNumber(Number(params.currentValue) - Number(params.baselineValue))
    : null;

  const ownerRead =
    params.comparisonDirection === "lower_is_better"
      ? buildLowerIsBetterRead({
          label: params.ownerLabel,
          changeValue,
          hasComparableValues,
        })
      : buildHigherIsBetterRead({
          label: params.ownerLabel,
          changeValue,
          hasComparableValues,
        });

  return {
    key: params.key,
    ownerLabel: params.ownerLabel,
    baselineValue: params.baselineValue,
    currentValue: params.currentValue,
    changeValue,
    comparisonDirection: params.comparisonDirection,
    hasComparableValues,
    ownerRead,
  };
}

function buildOwnerSummary(params: {
  isWindowReady: boolean;
  canCompare: boolean;
  comparableSignalCount: number;
}): string {
  if (!params.isWindowReady) {
    return "The watch window is still open, so Digital Brain should wait before comparing review movement.";
  }

  if (!params.canCompare) {
    return "The watch window is ready, but Digital Brain does not yet have enough review data to compare safely.";
  }

  return `${params.comparableSignalCount} review signal(s) can be compared now. This is a conservative comparison, not proof that the task caused the change.`;
}

function buildBlockedReason(params: {
  isWindowReady: boolean;
  canCompare: boolean;
}): string | null {
  if (!params.isWindowReady) {
    return "The impact watch window has not elapsed yet.";
  }

  if (!params.canCompare) {
    return "Review baseline or current review data is missing.";
  }

  return null;
}

export function extractOwnerTaskReviewBaseline(
  baselineMetrics: Record<string, unknown> | null | undefined,
): OwnerTaskReviewBaseline {
  return {
    baselineReviewDataAvailable: readBooleanMetric(
      baselineMetrics,
      "baseline_review_data_available",
    ),
    baselineCurrentReviews: readNumberMetric(
      baselineMetrics,
      "baseline_current_reviews",
    ),
    baselineCurrentRating: readNumberMetric(
      baselineMetrics,
      "baseline_current_rating",
    ),
    baselineProfileLastFetchedAt: readStringMetric(
      baselineMetrics,
      "baseline_profile_last_fetched_at",
    ),
    baselineTopCompetitorName: readStringMetric(
      baselineMetrics,
      "baseline_top_competitor_name",
    ),
    baselineTopCompetitorReviews: readNumberMetric(
      baselineMetrics,
      "baseline_top_competitor_reviews",
    ),
    baselineReviewGap: readNumberMetric(
      baselineMetrics,
      "baseline_review_gap",
    ),
  };
}

export function normalizeOwnerTaskReviewCurrentMetrics(
  currentMetrics: Partial<OwnerTaskReviewCurrentMetrics>,
): OwnerTaskReviewCurrentMetrics {
  const currentReviews =
    typeof currentMetrics.currentReviews === "number" &&
    Number.isFinite(currentMetrics.currentReviews)
      ? currentMetrics.currentReviews
      : null;
  const currentRating =
    typeof currentMetrics.currentRating === "number" &&
    Number.isFinite(currentMetrics.currentRating)
      ? currentMetrics.currentRating
      : null;
  const currentTopCompetitorReviews =
    typeof currentMetrics.currentTopCompetitorReviews === "number" &&
    Number.isFinite(currentMetrics.currentTopCompetitorReviews)
      ? currentMetrics.currentTopCompetitorReviews
      : null;
  const providedReviewGap =
    typeof currentMetrics.currentReviewGap === "number" &&
    Number.isFinite(currentMetrics.currentReviewGap)
      ? currentMetrics.currentReviewGap
      : null;

  return {
    currentReviews,
    currentRating,
    currentProfileLastFetchedAt:
      currentMetrics.currentProfileLastFetchedAt ?? null,
    currentTopCompetitorName: currentMetrics.currentTopCompetitorName ?? null,
    currentTopCompetitorReviews,
    currentReviewGap:
      providedReviewGap ??
      calculateReviewGap(currentReviews, currentTopCompetitorReviews),
  };
}

export function buildOwnerTaskReviewComparison(params: {
  baselineMetrics: Record<string, unknown> | null | undefined;
  currentMetrics: Partial<OwnerTaskReviewCurrentMetrics>;
  isWindowReady: boolean;
}): OwnerTaskReviewComparison {
  const baseline = extractOwnerTaskReviewBaseline(params.baselineMetrics);
  const current = normalizeOwnerTaskReviewCurrentMetrics(params.currentMetrics);

  const signals = [
    buildSignal({
      key: "business_total_reviews",
      ownerLabel: "Business review count",
      baselineValue: baseline.baselineCurrentReviews,
      currentValue: current.currentReviews,
      comparisonDirection: "higher_is_better",
    }),
    buildSignal({
      key: "business_rating",
      ownerLabel: "Business rating",
      baselineValue: baseline.baselineCurrentRating,
      currentValue: current.currentRating,
      comparisonDirection: "higher_is_better",
    }),
    buildSignal({
      key: "review_gap",
      ownerLabel: "Review gap versus strongest visible competitor",
      baselineValue: baseline.baselineReviewGap,
      currentValue: current.currentReviewGap,
      comparisonDirection: "lower_is_better",
    }),
  ];
  const comparableSignalCount = signals.filter(
    (signal) => signal.hasComparableValues,
  ).length;
  const canCompare = params.isWindowReady && comparableSignalCount > 0;

  return {
    comparisonType: "reviews",
    isWindowReady: params.isWindowReady,
    canCompare,
    claimPolicy: "compare_only_no_attribution",
    ownerSummary: buildOwnerSummary({
      isWindowReady: params.isWindowReady,
      canCompare,
      comparableSignalCount,
    }),
    blockedReason: buildBlockedReason({
      isWindowReady: params.isWindowReady,
      canCompare,
    }),
    baseline,
    current,
    signals,
    noClaimLanguage: NO_ATTRIBUTION_LANGUAGE,
  };
}
