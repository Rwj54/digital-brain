type CompetitorPressureItem = {
  competitorKey: string;
  competitorName: string;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  currentReviewCount: number | null;
  previousReviewCount: number | null;
  reviewChange: number | null;
  enteredTop3: boolean;
  enteredTop10: boolean;
  enteredTop20: boolean;
  isNewlyObserved: boolean;
  pressureScore: number;
};

type CompetitorPressureSummary = {
  latestCapturedAt: string | null;
  previousCapturedAt: string | null;
  itemCount: number;
  strongestPressure: CompetitorPressureItem | null;
  items: CompetitorPressureItem[];
};

type PressureAction = {
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
  category: "rank" | "reviews" | "competition";
};

function buildPressureActionForItem(item: CompetitorPressureItem): PressureAction | null {
  if (item.enteredTop3) {
    return {
      title: `Monitor ${item.competitorName} in top 3`,
      detail: `${item.competitorName} entered the top 3 at rank ${item.currentRank}. Review their GBP, categories, reviews, and landing page signals for this keyword.`,
      priority: "high",
      category: "competition",
    };
  }

  if (item.enteredTop10) {
    return {
      title: `Track rising competitor ${item.competitorName}`,
      detail: `${item.competitorName} entered the top 10 at rank ${item.currentRank}. Compare their authority, review growth, and service positioning against the project.`,
      priority: "medium",
      category: "competition",
    };
  }

  if ((item.reviewChange ?? 0) >= 3) {
    return {
      title: `Respond to review growth from ${item.competitorName}`,
      detail: `${item.competitorName} gained ${item.reviewChange} reviews between captures. Increase review acquisition velocity to reduce competitive pressure.`,
      priority: "high",
      category: "reviews",
    };
  }

  if ((item.rankChange ?? 0) >= 3) {
    return {
      title: `Investigate ranking jump from ${item.competitorName}`,
      detail: `${item.competitorName} improved by ${item.rankChange} positions and now ranks ${item.currentRank}. Review their market signals and recent changes.`,
      priority: "high",
      category: "rank",
    };
  }

  if (item.pressureScore >= 5 && item.currentRank <= 3) {
    return {
      title: `Study stable market leader ${item.competitorName}`,
      detail: `${item.competitorName} is holding a top-${item.currentRank} position and continues to apply market pressure for this keyword.`,
      priority: "medium",
      category: "competition",
    };
  }

  return null;
}

export function buildPressureActions(
  pressure: CompetitorPressureSummary
): PressureAction[] {
  const actions: PressureAction[] = [];
  const seen = new Set<string>();

  for (const item of pressure.items) {
    const action = buildPressureActionForItem(item);

    if (!action) {
      continue;
    }

    const key = `${action.title}::${action.category}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    actions.push(action);
  }

  return actions.slice(0, 5);
}