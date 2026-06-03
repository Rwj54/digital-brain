export type OwnerTaskImpactIntent =
  | "reviews"
  | "activity"
  | "profile"
  | "visibility"
  | "website"
  | "competition"
  | "authority"
  | "outcomes"
  | "general";

export type OwnerTaskImpactSourceStatus =
  | "available_now"
  | "context_only"
  | "future_required";

export type OwnerTaskImpactComparisonDirection =
  | "higher_is_better"
  | "lower_is_better"
  | "presence_is_better"
  | "changed_is_context";

export type OwnerTaskImpactClaimPolicy =
  | "compare_only_no_attribution"
  | "context_only_no_claim"
  | "future_required_no_claim";

export type OwnerTaskImpactComparisonSource = {
  key: string;
  ownerLabel: string;
  sourceTable: string;
  sourceFields: string[];
  comparisonDirection: OwnerTaskImpactComparisonDirection;
  status: OwnerTaskImpactSourceStatus;
  whyAllowed: string;
  noClaimLanguage: string;
};

export type OwnerTaskImpactComparisonPlan = {
  intent: OwnerTaskImpactIntent;
  canCompareNow: boolean;
  claimPolicy: OwnerTaskImpactClaimPolicy;
  ownerSummary: string;
  blockedReason: string | null;
  allowedSources: OwnerTaskImpactComparisonSource[];
  contextSources: OwnerTaskImpactComparisonSource[];
  futureSources: OwnerTaskImpactComparisonSource[];
};

const NO_IMPACT_CLAIM_LANGUAGE =
  "Digital Brain can compare signals after the watch window, but it should not claim this action caused the change without stronger proof.";

const CONTEXT_ONLY_LANGUAGE =
  "Digital Brain can show this as context, but it should not present it as proof that the action worked.";

const FUTURE_REQUIRED_LANGUAGE =
  "Digital Brain should wait for a stronger source before making even a comparison-style read.";

const REVIEW_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "business_total_reviews",
    ownerLabel: "Business review count",
    sourceTable: "gbp_profiles",
    sourceFields: ["total_reviews", "rating", "last_fetched_at"],
    comparisonDirection: "higher_is_better",
    status: "available_now",
    whyAllowed:
      "The current business review count is already stored as a Google Business Profile signal.",
    noClaimLanguage: NO_IMPACT_CLAIM_LANGUAGE,
  },
  {
    key: "top_competitor_review_gap",
    ownerLabel: "Review gap versus strongest visible competitor",
    sourceTable: "gbp_competitor_metrics",
    sourceFields: ["business_name", "total_reviews", "raw_provider"],
    comparisonDirection: "lower_is_better",
    status: "available_now",
    whyAllowed:
      "Competitor review counts are already stored and used by the owner outcomes summary.",
    noClaimLanguage: NO_IMPACT_CLAIM_LANGUAGE,
  },
];

const VISIBILITY_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "latest_rank_position",
    ownerLabel: "Latest Google ranking position",
    sourceTable: "gbp_rank_snapshots",
    sourceFields: ["keyword", "metro", "rank_position", "captured_at"],
    comparisonDirection: "lower_is_better",
    status: "available_now",
    whyAllowed:
      "Rank snapshots are already stored for the active keyword and market frame.",
    noClaimLanguage: NO_IMPACT_CLAIM_LANGUAGE,
  },
  {
    key: "rank_presence",
    ownerLabel: "Whether the business is still found in tracked ranking results",
    sourceTable: "gbp_rank_snapshots",
    sourceFields: ["keyword", "metro", "rank_position", "captured_at"],
    comparisonDirection: "presence_is_better",
    status: "available_now",
    whyAllowed:
      "Existing rank snapshots can show whether the business is visible in the tracked search frame.",
    noClaimLanguage: NO_IMPACT_CLAIM_LANGUAGE,
  },
];

const AUTHORITY_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "authority_score",
    ownerLabel: "Authority score",
    sourceTable: "project_authority_scores",
    sourceFields: [
      "authority_score",
      "authority_tier",
      "competitive_strength",
      "structural_optimization",
      "momentum_score",
      "captured_at",
    ],
    comparisonDirection: "higher_is_better",
    status: "available_now",
    whyAllowed:
      "Authority score history is already stored and can be compared after the watch window.",
    noClaimLanguage: NO_IMPACT_CLAIM_LANGUAGE,
  },
];

const PROFILE_CONTEXT_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "profile_completeness_context",
    ownerLabel: "Google profile completeness context",
    sourceTable: "gbp_profiles",
    sourceFields: [
      "primary_category",
      "additional_categories",
      "photos_count",
      "posts_30d",
      "qa_count",
      "last_fetched_at",
    ],
    comparisonDirection: "changed_is_context",
    status: "context_only",
    whyAllowed:
      "Google Business Profile fields can help explain profile progress, but they do not prove impact by themselves.",
    noClaimLanguage: CONTEXT_ONLY_LANGUAGE,
  },
];

const WEBSITE_CONTEXT_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "website_identity_context",
    ownerLabel: "Website identity and alignment context",
    sourceTable: "projects",
    sourceFields: [
      "site_url",
      "target_domain",
      "target_brand_name",
      "primary_category",
      "target_metro",
    ],
    comparisonDirection: "presence_is_better",
    status: "context_only",
    whyAllowed:
      "Saved project identity fields can show whether the basic website connection is present, but they are not a time-series website audit.",
    noClaimLanguage: CONTEXT_ONLY_LANGUAGE,
  },
];

const OUTCOME_FUTURE_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "lead_and_revenue_outcomes",
    ownerLabel: "Lead and revenue outcome movement",
    sourceTable: "future outcome tables",
    sourceFields: [
      "project_outcome_signals",
      "lead_volume_snapshots",
      "call_tracking_snapshots",
      "revenue_outcome_snapshots",
      "action_outcome_links",
    ],
    comparisonDirection: "higher_is_better",
    status: "future_required",
    whyAllowed:
      "True business outcome attribution needs durable outcome snapshots that are not built yet.",
    noClaimLanguage: FUTURE_REQUIRED_LANGUAGE,
  },
];

const COMPETITION_CONTEXT_SOURCES: OwnerTaskImpactComparisonSource[] = [
  {
    key: "competitor_market_context",
    ownerLabel: "Competitor market context",
    sourceTable: "gbp_competitor_metrics",
    sourceFields: ["business_name", "total_reviews", "rating", "raw_provider"],
    comparisonDirection: "changed_is_context",
    status: "context_only",
    whyAllowed:
      "Competitor metrics can explain the market around the business, but they should not be treated as proof that one owner task caused a competitor change.",
    noClaimLanguage: CONTEXT_ONLY_LANGUAGE,
  },
];

function readStringMetric(
  metrics: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = metrics?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeIntent(value: string | null): OwnerTaskImpactIntent | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim();

  if (normalized.includes("review")) {
    return "reviews";
  }

  if (
    normalized.includes("post") ||
    normalized.includes("activity") ||
    normalized.includes("freshness")
  ) {
    return "activity";
  }

  if (
    normalized.includes("profile") ||
    normalized.includes("gbp") ||
    normalized.includes("business hours") ||
    normalized.includes("hours") ||
    normalized.includes("photo") ||
    normalized.includes("q&a") ||
    normalized.includes("qa") ||
    normalized.includes("category")
  ) {
    return "profile";
  }

  if (
    normalized.includes("rank") ||
    normalized.includes("visibility") ||
    normalized.includes("keyword") ||
    normalized.includes("search")
  ) {
    return "visibility";
  }

  if (
    normalized.includes("website") ||
    normalized.includes("domain") ||
    normalized.includes("page")
  ) {
    return "website";
  }

  if (
    normalized.includes("competitor") ||
    normalized.includes("competition") ||
    normalized.includes("market")
  ) {
    return "competition";
  }

  if (
    normalized.includes("authority") ||
    normalized.includes("strength") ||
    normalized.includes("trust")
  ) {
    return "authority";
  }

  if (
    normalized.includes("lead") ||
    normalized.includes("call") ||
    normalized.includes("revenue") ||
    normalized.includes("sale") ||
    normalized.includes("order") ||
    normalized.includes("outcome")
  ) {
    return "outcomes";
  }

  return null;
}

export function resolveOwnerTaskImpactIntent(
  baselineMetrics: Record<string, unknown> | null | undefined,
): OwnerTaskImpactIntent {
  return (
    normalizeIntent(readStringMetric(baselineMetrics, "inferred_intent")) ??
    normalizeIntent(readStringMetric(baselineMetrics, "task_category")) ??
    normalizeIntent(readStringMetric(baselineMetrics, "task_type")) ??
    normalizeIntent(readStringMetric(baselineMetrics, "task_title")) ??
    "general"
  );
}

export function getOwnerTaskImpactComparisonPlan(
  intent: OwnerTaskImpactIntent,
): OwnerTaskImpactComparisonPlan {
  if (intent === "reviews") {
    return {
      intent,
      canCompareNow: true,
      claimPolicy: "compare_only_no_attribution",
      ownerSummary:
        "After the watch window, Digital Brain can compare review movement and review gap context, but it should not claim the task caused the change.",
      blockedReason: null,
      allowedSources: REVIEW_SOURCES,
      contextSources: COMPETITION_CONTEXT_SOURCES,
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "visibility") {
    return {
      intent,
      canCompareNow: true,
      claimPolicy: "compare_only_no_attribution",
      ownerSummary:
        "After the watch window, Digital Brain can compare ranking visibility movement for the tracked keyword and market, but it should not claim direct cause.",
      blockedReason: null,
      allowedSources: VISIBILITY_SOURCES,
      contextSources: [],
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "authority" || intent === "activity") {
    return {
      intent,
      canCompareNow: true,
      claimPolicy: "compare_only_no_attribution",
      ownerSummary:
        "After the watch window, Digital Brain can compare authority and momentum movement, but it should keep the language conservative.",
      blockedReason: null,
      allowedSources: AUTHORITY_SOURCES,
      contextSources: PROFILE_CONTEXT_SOURCES,
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "profile") {
    return {
      intent,
      canCompareNow: false,
      claimPolicy: "context_only_no_claim",
      ownerSummary:
        "Digital Brain can show Google profile context for this task, but the current system does not yet have a strong profile-change comparison path.",
      blockedReason:
        "Profile fields are useful context, but they are not yet a dedicated before-and-after task impact measurement.",
      allowedSources: [],
      contextSources: PROFILE_CONTEXT_SOURCES,
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "website") {
    return {
      intent,
      canCompareNow: false,
      claimPolicy: "context_only_no_claim",
      ownerSummary:
        "Digital Brain can show website identity and alignment context, but website impact comparison needs future website audit history.",
      blockedReason:
        "Website summary fields are currently identity/alignment evidence, not a time-series website impact measurement.",
      allowedSources: [],
      contextSources: WEBSITE_CONTEXT_SOURCES,
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "competition") {
    return {
      intent,
      canCompareNow: false,
      claimPolicy: "context_only_no_claim",
      ownerSummary:
        "Digital Brain can show competitor context, but it should not claim a completed owner task caused competitor movement.",
      blockedReason:
        "Competitor signals are market context, not direct proof that this owner task created impact.",
      allowedSources: [],
      contextSources: COMPETITION_CONTEXT_SOURCES,
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  if (intent === "outcomes") {
    return {
      intent,
      canCompareNow: false,
      claimPolicy: "future_required_no_claim",
      ownerSummary:
        "Business outcome impact comparison should wait until durable lead, call, order, or revenue snapshots exist.",
      blockedReason:
        "The current system has basic outcome settings and payoff math, but not durable outcome time-series attribution data.",
      allowedSources: [],
      contextSources: [],
      futureSources: OUTCOME_FUTURE_SOURCES,
    };
  }

  return {
    intent,
    canCompareNow: false,
    claimPolicy: "context_only_no_claim",
    ownerSummary:
      "Digital Brain does not yet have a safe comparison path for this task type.",
    blockedReason:
      "The task intent is too general to map to a trustworthy impact comparison source.",
    allowedSources: [],
    contextSources: [
      ...PROFILE_CONTEXT_SOURCES,
      ...WEBSITE_CONTEXT_SOURCES,
      ...COMPETITION_CONTEXT_SOURCES,
    ],
    futureSources: OUTCOME_FUTURE_SOURCES,
  };
}

export function buildOwnerTaskImpactComparisonPlanFromBaseline(
  baselineMetrics: Record<string, unknown> | null | undefined,
): OwnerTaskImpactComparisonPlan {
  return getOwnerTaskImpactComparisonPlan(
    resolveOwnerTaskImpactIntent(baselineMetrics),
  );
}
