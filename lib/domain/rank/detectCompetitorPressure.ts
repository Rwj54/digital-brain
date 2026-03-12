import { createClient } from "@supabase/supabase-js";

type DetectCompetitorPressureInput = {
  projectId: string;
  keyword: string;
  metro: string;
};

type MarketResultRow = {
  id: string;
  captured_at: string;
  position: number;
  result_name: string;
  result_place_id: string | null;
  result_domain: string | null;
  rating: number | null;
  review_count: number | null;
  photo_count: number | null;
  matched_competitor_id: string | null;
};

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

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCompetitorKey(row: MarketResultRow) {
  if (row.matched_competitor_id) {
    return `competitor:${row.matched_competitor_id}`;
  }

  if (row.result_place_id) {
    return `place:${row.result_place_id}`;
  }

  if (row.result_domain) {
    return `domain:${row.result_domain.toLowerCase()}`;
  }

  return `name:${normalizeName(row.result_name)}`;
}

function buildPressureScore(params: {
  currentRank: number;
  previousRank: number | null;
  reviewChange: number | null;
  enteredTop3: boolean;
  enteredTop10: boolean;
  enteredTop20: boolean;
  isNewlyObserved: boolean;
}) {
  const {
    currentRank,
    previousRank,
    reviewChange,
    enteredTop3,
    enteredTop10,
    enteredTop20,
    isNewlyObserved,
  } = params;

  let score = 0;

  if (previousRank != null && previousRank > currentRank) {
    score += previousRank - currentRank;
  }

  if (typeof reviewChange === "number" && reviewChange > 0) {
    score += Math.min(reviewChange, 20) * 0.5;
  }

  if (enteredTop3) {
    score += 10;
  } else if (enteredTop10) {
    score += 6;
  } else if (enteredTop20) {
    score += 3;
  }

  if (isNewlyObserved) {
    score += 4;
  }

  if (currentRank <= 3) {
    score += 5;
  } else if (currentRank <= 10) {
    score += 3;
  } else if (currentRank <= 20) {
    score += 1;
  }

  return Math.round(score * 10) / 10;
}

export async function detectCompetitorPressure(
  input: DetectCompetitorPressureInput
): Promise<CompetitorPressureSummary> {
  const supabase = getSupabaseAdminClient();
  const { projectId, keyword, metro } = input;

  const { data: captureRows, error: captureError } = await supabase
    .from("gbp_rank_market_results")
    .select("captured_at")
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .order("captured_at", { ascending: false });

  if (captureError) {
    throw new Error(
      `Failed to load competitor pressure capture dates: ${captureError.message}`
    );
  }

  const orderedUniqueDates = Array.from(
    new Set((captureRows ?? []).map((row) => row.captured_at as string))
  );

  const latestCapturedAt = orderedUniqueDates[0] ?? null;
  const previousCapturedAt = orderedUniqueDates[1] ?? null;

  if (!latestCapturedAt) {
    return {
      latestCapturedAt: null,
      previousCapturedAt: null,
      itemCount: 0,
      strongestPressure: null,
      items: [],
    };
  }

  const datesToLoad = previousCapturedAt
    ? [latestCapturedAt, previousCapturedAt]
    : [latestCapturedAt];

  const { data: marketRows, error: marketError } = await supabase
    .from("gbp_rank_market_results")
    .select(
      `
      id,
      captured_at,
      position,
      result_name,
      result_place_id,
      result_domain,
      rating,
      review_count,
      photo_count,
      matched_competitor_id
      `
    )
    .eq("project_id", projectId)
    .eq("keyword", keyword)
    .eq("metro", metro)
    .in("captured_at", datesToLoad)
    .order("captured_at", { ascending: false })
    .order("position", { ascending: true });

  if (marketError) {
    throw new Error(
      `Failed to load competitor pressure market results: ${marketError.message}`
    );
  }

  const rows = (marketRows ?? []) as MarketResultRow[];
  const latestRows = rows.filter((row) => row.captured_at === latestCapturedAt);
  const previousRows = previousCapturedAt
    ? rows.filter((row) => row.captured_at === previousCapturedAt)
    : [];

  const previousMap = new Map<string, MarketResultRow>();

  for (const row of previousRows) {
    previousMap.set(buildCompetitorKey(row), row);
  }

  const items: CompetitorPressureItem[] = latestRows.map((currentRow) => {
    const competitorKey = buildCompetitorKey(currentRow);
    const previousRow = previousMap.get(competitorKey) ?? null;

    const currentRank = currentRow.position;
    const previousRank = previousRow?.position ?? null;

    const currentReviewCount = currentRow.review_count ?? null;
    const previousReviewCount = previousRow?.review_count ?? null;

    const reviewChange =
      currentReviewCount != null && previousReviewCount != null
        ? currentReviewCount - previousReviewCount
        : currentReviewCount != null && previousReviewCount == null
          ? currentReviewCount
          : null;

    const enteredTop3 =
      currentRank <= 3 && (previousRank == null || previousRank > 3);

    const enteredTop10 =
      currentRank <= 10 && (previousRank == null || previousRank > 10);

    const enteredTop20 =
      currentRank <= 20 && (previousRank == null || previousRank > 20);

    const isNewlyObserved = previousRow == null;

    const rankChange =
      previousRank != null ? previousRank - currentRank : null;

    const pressureScore = buildPressureScore({
      currentRank,
      previousRank,
      reviewChange,
      enteredTop3,
      enteredTop10,
      enteredTop20,
      isNewlyObserved,
    });

    return {
      competitorKey,
      competitorName: currentRow.result_name,
      currentRank,
      previousRank,
      rankChange,
      currentReviewCount,
      previousReviewCount,
      reviewChange,
      enteredTop3,
      enteredTop10,
      enteredTop20,
      isNewlyObserved,
      pressureScore,
    };
  });

  items.sort((a, b) => {
    if (b.pressureScore !== a.pressureScore) {
      return b.pressureScore - a.pressureScore;
    }

    return a.currentRank - b.currentRank;
  });

  return {
    latestCapturedAt,
    previousCapturedAt,
    itemCount: items.length,
    strongestPressure: items[0] ?? null,
    items,
  };
}