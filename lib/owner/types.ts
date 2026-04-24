export type OwnerPriority = {
  title: string;
  plain_language_reason: string;
  why_now: string;
  expected_benefit: string;
  who_should_do_it: string;
  difficulty: string;
  time_to_complete_estimate: string;
  proof_of_completion: string;
  confidence_level: number;
  source: string;
  sort_order: number;
  task_type: string;
  task_data: Record<string, unknown>;
};

export type OwnerTask = {
  id: string;
  project_id: string;
  priority_snapshot_id: string | null;
  title: string;
  plain_language_reason: string | null;
  why_now: string | null;
  expected_benefit: string | null;
  who_should_do_it: string | null;
  difficulty: string | null;
  time_to_complete_estimate: string | null;
  proof_of_completion: string | null;
  confidence_level: number | null;
  status: string;
  sort_order: number;
  task_type: string | null;
  task_data: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

export type OwnerHealthMarker = {
  label: "Visibility" | "Trust" | "Clarity" | "Activity";
  score: number;
  statusLabel: string;
  explanation: string;
  nextActionHint: string;
};

export type OwnerDashboardVisibilitySummary = {
  hasActiveKeyword: boolean;
  keyword: string | null;
  metro: string | null;
  latestRank: number | null;
  bestRank: number | null;
  latestCapturedAt: string | null;
  visibilityLabel: string;
};

export type OwnerVisibilitySummary = OwnerDashboardVisibilitySummary & {
  previousRank: number | null;
  visibilityReadinessScore: number;
  plainLanguageSummary: string;
  topIssue: string;
  whyItMatters: string;
  nextAction: {
    title: string;
    whoShouldDoIt: string;
    difficulty: string;
    reason: string;
  };
  evidence: string[];
};

export type WebsiteSummary = {
  siteUrl: string | null;
  targetDomain: string | null;
  targetBrandName: string | null;
  category: string | null;
  metro: string | null;
  derivedSiteDomain: string | null;
  hasSiteUrl: boolean;
  hasTargetDomain: boolean;
  hasBrandName: boolean;
  hasDerivedSiteDomain: boolean;
  hasDomainAlignment: boolean;
  websiteReadinessLabel: string;
  websiteReadinessScore: number;
  plainLanguageSummary: string;
  topIssue: string;
  whyItMatters: string;
  nextAction: {
    title: string;
    whoShouldDoIt: string;
    difficulty: string;
    reason: string;
  };
  evidence: string[];
};

export type AiSummary = Record<string, unknown> & {
  gbpName?: string | null;
  primaryCategory?: string | null;
  totalReviews?: number | null;
  rating?: number | null;
  hasBusinessName?: boolean;
  hasPrimaryCategory?: boolean;
  hasReviewSignals?: boolean;
  aiReadinessLabel?: string;
  aiReadinessScore?: number | null;
  plainLanguageSummary?: string;
  topIssue?: string;
  whyItMatters?: string;
  nextAction?:
    | {
        title?: string;
        whoShouldDoIt?: string;
        who_should_do_it?: string;
        difficulty?: string;
        reason?: string;
      }
    | null;
  evidence?: string[] | null;
};

export type OwnerDashboardResponse = {
  ok: boolean;
  projectId: string;
  clientId: string | null;
  projectDisplayName: string | null;
  projectCategory: string | null;
  projectMetro: string | null;
  projectSiteUrl: string | null;
  projectTargetDomain: string | null;
  domainDisplayValue: string | null;
  projectLocationLabel: string | null;
  pageScopeLabel: string;
  capturedAt: string;
  dashboard: {
    hero: {
      headline: string;
      supportLine: string;
      primaryActionText: string;
    };
    healthMarkers: OwnerHealthMarker[];
    guidance: {
      helpingNow: string[];
      googleStillWants: string[];
    };
    progress: {
      nextLikelyImprovement: string;
      lastUpdated: string;
    };
    topPriorities: OwnerPriority[];
    summary: {
      priorityCount: number;
      hasPriorities: boolean;
      totalTasks: number;
      openTasks: number;
      completedTasks: number;
      completedTaskRate: number;
    };
    visibilitySummary: OwnerDashboardVisibilitySummary;
    aiSummary: AiSummary;
    websiteSummary: WebsiteSummary;
    outcomesSummary: {
      monthlyCustomerEvents: number | null;
      reviewConversionRate: number | null;
      eventLabelSingular: string | null;
      eventLabelPlural: string | null;
      hasMonthlyEvents: boolean;
      hasConversionRate: boolean;
      outcomesReadinessLabel: string;
      currentReviews: number | null;
      topCompetitorName: string | null;
      topCompetitorReviews: number | null;
      gapReviews: number | null;
      desiredTarget90d: number | null;
      maxReviews90d: number | null;
      realisticTarget90d: number | null;
      perWeek: number | null;
      monthsToCloseGap: number | null;
    };
  };
};

export type OwnerWebsiteSummaryResponse = {
  ok: boolean;
  projectId: string;
  summary: WebsiteSummary;
};

export type OwnerAiSummaryResponse = {
  ok: boolean;
  projectId: string;
  summary: AiSummary;
};

export type OwnerVisibilitySummaryResponse = {
  ok: boolean;
  projectId: string;
  summary: OwnerVisibilitySummary;
};

export type OwnerTasksResponse = {
  ok: boolean;
  projectId: string;
  statusFilter: string;
  count: number;
  summary: {
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
  };
  tasks: OwnerTask[];
};

export type OwnerPageDashboard = Omit<OwnerDashboardResponse, "dashboard"> & {
  dashboard: Omit<
    OwnerDashboardResponse["dashboard"],
    "visibilitySummary" | "aiSummary" | "websiteSummary"
  > & {
    visibilitySummary: OwnerVisibilitySummary;
    aiSummary: AiSummary;
    websiteSummary: WebsiteSummary;
  };
};

export type OwnerPageData = {
  dashboard: OwnerPageDashboard;
  tasksData: OwnerTasksResponse;
};

export type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export type RenderStep =
  | {
      key: string;
      kind: "task";
      index: number;
      title: string;
      reason: string;
      who: string;
      time: string;
      difficulty: string;
      expectedBenefit: string;
      proofOfCompletion: string;
      confidenceLabel: string;
      status: string;
      task: OwnerTask;
    }
  | {
      key: string;
      kind: "priority";
      index: number;
      title: string;
      reason: string;
      who: string;
      time: string;
      difficulty: string;
      expectedBenefit: string;
      proofOfCompletion: string;
      confidenceLabel: string;
      status: string;
    };

export type Tone = {
  solid: string;
  soft: string;
};

export type DetailTab = "visibility" | "ai" | "website" | "outcomes" | "tasks";

export type AiNextAction = {
  title: string;
  whoShouldDoIt: string;
  difficulty: string;
  reason: string;
};