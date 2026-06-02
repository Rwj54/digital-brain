import { createClient } from "@supabase/supabase-js";

type OwnerPriorityWho = "owner" | "staff" | "developer" | "optional_expert_help";
type OwnerPriorityDifficulty = "easy" | "medium" | "hard";

export type OwnerPriority = {
  title: string;
  plain_language_reason: string;
  why_now: string;
  expected_benefit: string;
  who_should_do_it: OwnerPriorityWho;
  difficulty: OwnerPriorityDifficulty;
  time_to_complete_estimate: string;
  proof_of_completion: string;
  confidence_level: number;
  source: "project_actions" | "project_authority_scores" | "fallback";
  sort_order: number;
  task_type: string;
  task_data: Record<string, unknown>;
};

type ProjectAction = {
  title?: unknown;
  detail?: unknown;
  category?: unknown;
  priority?: unknown;
};

type AuthorityRow = {
  authority_score: number | string;
  authority_tier: string;
  momentum_label: string;
};

type PrioritySnapshotRow = {
  id: string;
};

type ExistingOpenTaskRow = {
  id: string;
  title: string;
};

type ActionIntent =
  | "reviews"
  | "profile"
  | "website"
  | "competition"
  | "visibility"
  | "activity"
  | "general";

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;

  return Math.round(value * 100) / 100;
}

function normalizeSearchText(...values: string[]): string {
  return values.join(" ").trim().toLowerCase();
}

function classifyActionIntent(action: ProjectAction): ActionIntent {
  const category = asText(action.category).toLowerCase();
  const title = asText(action.title).toLowerCase();
  const detail = asText(action.detail).toLowerCase();
  const textOnlySearchText = normalizeSearchText(title, detail);
  const categorySearchText = normalizeSearchText(category, title, detail);

  if (
    category === "reviews" ||
    textOnlySearchText.includes("review") ||
    textOnlySearchText.includes("rating")
  ) {
    return "reviews";
  }

  if (
    category === "website" ||
    category === "technical" ||
    textOnlySearchText.includes("website") ||
    textOnlySearchText.includes("site") ||
    textOnlySearchText.includes("domain") ||
    textOnlySearchText.includes("page")
  ) {
    return "website";
  }

  if (
    textOnlySearchText.includes("post") ||
    textOnlySearchText.includes("update") ||
    textOnlySearchText.includes("activity") ||
    textOnlySearchText.includes("fresh")
  ) {
    return "activity";
  }

  if (
    textOnlySearchText.includes("profile") ||
    textOnlySearchText.includes("business profile") ||
    textOnlySearchText.includes("gbp") ||
    textOnlySearchText.includes("google business") ||
    textOnlySearchText.includes("category") ||
    textOnlySearchText.includes("description") ||
    textOnlySearchText.includes("photo") ||
    textOnlySearchText.includes("q&a") ||
    textOnlySearchText.includes("questions") ||
    textOnlySearchText.includes("hours") ||
    textOnlySearchText.includes("phone")
  ) {
    return "profile";
  }

  if (
    textOnlySearchText.includes("rank") ||
    textOnlySearchText.includes("ranking") ||
    textOnlySearchText.includes("visibility") ||
    textOnlySearchText.includes("keyword") ||
    textOnlySearchText.includes("search")
  ) {
    return "visibility";
  }

  if (
    category === "competition" ||
    categorySearchText.includes("competitor") ||
    categorySearchText.includes("competition") ||
    categorySearchText.includes("market")
  ) {
    return "competition";
  }

  return "general";
}

function normalizeActionPriority(value: string): "high" | "medium" | "low" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "high" || normalized === "urgent") return "high";
  if (normalized === "low") return "low";

  return "medium";
}

function actionIntentDefaults(intent: ActionIntent): {
  whoShouldDoIt: OwnerPriorityWho;
  difficulty: OwnerPriorityDifficulty;
  timeToCompleteEstimate: string;
  expectedBenefit: string;
  proofOfCompletion: string;
  confidenceLevel: number;
} {
  if (intent === "reviews") {
    return {
      whoShouldDoIt: "owner",
      difficulty: "medium",
      timeToCompleteEstimate: "30 to 60 minutes",
      expectedBenefit:
        "More trust signals for Google and more confidence for customers comparing the business.",
      proofOfCompletion:
        "A review request process is active and new review requests have been sent.",
      confidenceLevel: 0.88,
    };
  }

  if (intent === "profile") {
    return {
      whoShouldDoIt: "owner",
      difficulty: "easy",
      timeToCompleteEstimate: "30 to 60 minutes",
      expectedBenefit:
        "A clearer Google Business Profile that helps Google and customers understand the business.",
      proofOfCompletion:
        "The Google Business Profile change is live and visible to customers.",
      confidenceLevel: 0.84,
    };
  }

  if (intent === "website") {
    return {
      whoShouldDoIt: "developer",
      difficulty: "hard",
      timeToCompleteEstimate: "2 to 4 hours",
      expectedBenefit:
        "A stronger website foundation that supports Google trust, local relevance, and future visibility gains.",
      proofOfCompletion:
        "The website improvement is live and the business information is clear on the page.",
      confidenceLevel: 0.72,
    };
  }

  if (intent === "competition") {
    return {
      whoShouldDoIt: "owner",
      difficulty: "medium",
      timeToCompleteEstimate: "45 to 90 minutes",
      expectedBenefit:
        "A clearer plan for closing the gap with stronger local competitors.",
      proofOfCompletion:
        "The business has completed the recommended profile, review, or visibility improvement tied to the competitive gap.",
      confidenceLevel: 0.76,
    };
  }

  if (intent === "visibility") {
    return {
      whoShouldDoIt: "owner",
      difficulty: "medium",
      timeToCompleteEstimate: "45 to 90 minutes",
      expectedBenefit:
        "A better chance to protect or improve rankings for the searches that matter.",
      proofOfCompletion:
        "The visibility-related improvement is complete and the next rank snapshot can be compared against it.",
      confidenceLevel: 0.78,
    };
  }

  if (intent === "activity") {
    return {
      whoShouldDoIt: "staff",
      difficulty: "easy",
      timeToCompleteEstimate: "20 to 45 minutes",
      expectedBenefit:
        "Fresh business activity signals that show the profile is active and maintained.",
      proofOfCompletion:
        "The update, post, photo, or business activity item has been published.",
      confidenceLevel: 0.74,
    };
  }

  return {
    whoShouldDoIt: "owner",
    difficulty: "medium",
    timeToCompleteEstimate: "1 to 2 hours",
    expectedBenefit: "A stronger local SEO foundation and clearer next-step plan.",
    proofOfCompletion: "The recommended improvement was completed and verified live.",
    confidenceLevel: 0.68,
  };
}

function buildPlainLanguageReason(
  action: ProjectAction,
  intent: ActionIntent,
): string {
  const detail = asText(action.detail);

  if (detail) {
    return detail;
  }

  if (intent === "reviews") {
    return "Reviews are one of the clearest trust signals customers and Google can see. Improving review activity can make the business look more credible in local search.";
  }

  if (intent === "profile") {
    return "Google needs a clear, complete business profile before it can confidently match the business to the right local searches.";
  }

  if (intent === "website") {
    return "The website should clearly support the business identity, location, and services shown in Google.";
  }

  if (intent === "competition") {
    return "Competitors with stronger trust signals can make it harder to hold or improve local visibility.";
  }

  if (intent === "visibility") {
    return "This action is connected to the searches where the business needs to protect or improve visibility.";
  }

  if (intent === "activity") {
    return "Recent business activity helps show that the business is maintained and active.";
  }

  return "This is one of the most useful next actions for improving local visibility.";
}

function buildWhyNow(priority: "high" | "medium" | "low", intent: ActionIntent): string {
  if (priority === "high") {
    return "This should be handled first because it is one of the clearest current opportunities.";
  }

  if (intent === "reviews") {
    return "Review growth takes time, so starting now gives the business a better chance to build trust over the next few weeks.";
  }

  if (intent === "website" || intent === "profile") {
    return "Google works best when the business identity is clear and consistent, so this should be tightened before adding more advanced work.";
  }

  if (intent === "competition") {
    return "This helps focus effort where competitors are already creating pressure.";
  }

  if (priority === "low") {
    return "This is not the first emergency, but it is still worth completing after the higher-impact items.";
  }

  return "This is worth addressing soon because it supports stronger local visibility.";
}

function getPriorityWeight(priority: string): number {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  if (priority === "low") return 2;

  return 3;
}

function getIntentWeight(intent: string): number {
  if (intent === "reviews") return 0;
  if (intent === "activity") return 1;
  if (intent === "profile") return 2;
  if (intent === "visibility") return 3;
  if (intent === "website") return 4;
  if (intent === "competition") return 5;
  if (intent === "authority") return 6;

  return 7;
}

function getPriorityRanking(priority: OwnerPriority): {
  priorityWeight: number;
  intentWeight: number;
  confidenceWeight: number;
  originalSortOrder: number;
} {
  const rawPriority =
    typeof priority.task_data.priority === "string"
      ? priority.task_data.priority
      : "";

  return {
    priorityWeight: getPriorityWeight(rawPriority),
    intentWeight: getIntentWeight(priority.task_type),
    confidenceWeight: -priority.confidence_level,
    originalSortOrder: priority.sort_order,
  };
}

function compareOwnerPriorities(a: OwnerPriority, b: OwnerPriority): number {
  const left = getPriorityRanking(a);
  const right = getPriorityRanking(b);

  return (
    left.priorityWeight - right.priorityWeight ||
    left.intentWeight - right.intentWeight ||
    left.confidenceWeight - right.confidenceWeight ||
    left.originalSortOrder - right.originalSortOrder
  );
}

function mapActionToOwnerPriority(
  action: ProjectAction,
  sortOrder: number,
): OwnerPriority | null {
  const title = asText(action.title);
  const rawCategory = asText(action.category, "general");
  const rawPriority = asText(action.priority, "medium");
  const priority = normalizeActionPriority(rawPriority);
  const intent = classifyActionIntent(action);
  const defaults = actionIntentDefaults(intent);

  if (!title) {
    return null;
  }

  let confidenceLevel = defaults.confidenceLevel;

  if (priority === "high") {
    confidenceLevel += 0.08;
  } else if (priority === "low") {
    confidenceLevel -= 0.08;
  }

  return {
    title,
    plain_language_reason: buildPlainLanguageReason(action, intent),
    why_now: buildWhyNow(priority, intent),
    expected_benefit: defaults.expectedBenefit,
    who_should_do_it: defaults.whoShouldDoIt,
    difficulty: defaults.difficulty,
    time_to_complete_estimate: defaults.timeToCompleteEstimate,
    proof_of_completion: defaults.proofOfCompletion,
    confidence_level: clampConfidence(confidenceLevel),
    source: "project_actions",
    sort_order: sortOrder,
    task_type: intent,
    task_data: {
      category: rawCategory || "general",
      inferred_intent: intent,
      priority,
      original_detail: asText(action.detail),
    },
  };
}

function buildAuthorityFallback(authority: AuthorityRow | null): OwnerPriority[] {
  if (!authority) {
    return [
      {
        title: "Review your top local SEO priorities",
        plain_language_reason:
          "Digital Brain needs enough owner-ready task data for this project.",
        why_now: "This project needs an initial owner priority snapshot.",
        expected_benefit: "A clearer next-step plan for improving local visibility.",
        who_should_do_it: "owner",
        difficulty: "easy",
        time_to_complete_estimate: "20 minutes",
        proof_of_completion: "The first owner priority snapshot was generated.",
        confidence_level: 0.55,
        source: "fallback",
        sort_order: 1,
        task_type: "fallback",
        task_data: {},
      },
    ];
  }

  return [
    {
      title: `Improve authority from current ${authority.authority_tier} position`,
      plain_language_reason: `The project currently has an authority score of ${authority.authority_score} with momentum marked ${authority.momentum_label}.`,
      why_now:
        "Authority and momentum help show whether the business is gaining or losing strength in the local market.",
      expected_benefit:
        "A stronger competitive position and a clearer plan for what to improve next.",
      who_should_do_it: "owner",
      difficulty: "medium",
      time_to_complete_estimate: "1 to 2 hours",
      proof_of_completion:
        "The next authority snapshot shows stronger supporting signals or clearer momentum.",
      confidence_level: 0.7,
      source: "project_authority_scores",
      sort_order: 1,
      task_type: "authority",
      task_data: {
        authority_tier: authority.authority_tier,
        authority_score: authority.authority_score,
        momentum_label: authority.momentum_label,
      },
    },
  ];
}

function buildAuthoritySupportPriority(
  authority: AuthorityRow,
  sortOrder: number,
): OwnerPriority {
  return {
    title: `Strengthen the current ${authority.authority_tier} authority position`,
    plain_language_reason: `The latest authority snapshot is ${authority.authority_score}, with momentum marked ${authority.momentum_label}. This should be used as supporting context for the next owner action plan.`,
    why_now:
      "This helps keep the action plan tied to the business's current local strength instead of showing disconnected tasks.",
    expected_benefit:
      "A better ordered action plan that focuses on the work most likely to improve local trust and competitiveness.",
    who_should_do_it: "owner",
    difficulty: "medium",
    time_to_complete_estimate: "30 to 60 minutes",
    proof_of_completion:
      "The business has reviewed the current authority position and completed the highest-value supporting action.",
    confidence_level: 0.72,
    source: "project_authority_scores",
    sort_order: sortOrder,
    task_type: "authority",
    task_data: {
      authority_tier: authority.authority_tier,
      authority_score: authority.authority_score,
      momentum_label: authority.momentum_label,
      supplemental: true,
    },
  };
}

function hasPriorityWithTaskType(priorities: OwnerPriority[], taskType: string): boolean {
  return priorities.some((priority) => priority.task_type === taskType);
}

function buildBalancedPriorityQueue(
  prioritiesFromActions: OwnerPriority[],
  authorityRow: AuthorityRow | null,
): OwnerPriority[] {
  const balancedPriorities = [...prioritiesFromActions];

  if (
    authorityRow &&
    balancedPriorities.length > 0 &&
    balancedPriorities.length < 3 &&
    !hasPriorityWithTaskType(balancedPriorities, "authority")
  ) {
    balancedPriorities.push(
      buildAuthoritySupportPriority(authorityRow, balancedPriorities.length + 1),
    );
  }

  const uniquePriorities = new Map<string, OwnerPriority>();

  for (const priority of balancedPriorities) {
    const key = priority.title.trim().toLowerCase();

    if (!uniquePriorities.has(key)) {
      uniquePriorities.set(key, priority);
    }
  }

  return Array.from(uniquePriorities.values())
    .sort(compareOwnerPriorities)
    .slice(0, 3)
    .map((priority, index) => ({
      ...priority,
      sort_order: index + 1,
    }));
}

export async function generateOwnerPriorityQueue(projectId: string): Promise<OwnerPriority[]> {
  const supabase = getServiceRoleSupabase();

  const [actionsResult, authorityResult] = await Promise.all([
    supabase
      .from("project_actions")
      .select("actions_json, captured_at")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("project_authority_scores")
      .select("authority_score, authority_tier, momentum_label, captured_at")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (actionsResult.error) {
    throw new Error(`Failed to load project actions: ${actionsResult.error.message}`);
  }

  if (authorityResult.error) {
    throw new Error(`Failed to load authority snapshot: ${authorityResult.error.message}`);
  }

  const rawActions = Array.isArray(actionsResult.data?.actions_json)
    ? (actionsResult.data.actions_json as ProjectAction[])
    : [];

  const prioritiesFromActions = rawActions
    .map((action, index) => mapActionToOwnerPriority(action, index + 1))
    .filter((item): item is OwnerPriority => item !== null);

  const authorityRow: AuthorityRow | null = authorityResult.data
    ? {
        authority_score: authorityResult.data.authority_score,
        authority_tier: authorityResult.data.authority_tier,
        momentum_label: authorityResult.data.momentum_label,
      }
    : null;

  const balancedPriorities = buildBalancedPriorityQueue(
    prioritiesFromActions,
    authorityRow,
  );

  return balancedPriorities.length > 0
    ? balancedPriorities
    : buildAuthorityFallback(authorityRow).slice(0, 3);
}

export async function persistOwnerPriorities(
  projectId: string,
  priorities: OwnerPriority[],
): Promise<void> {
  const supabase = getServiceRoleSupabase();
  const capturedAt = new Date().toISOString().slice(0, 10);
  const version = "v1.0";

  const snapshotUpsert = await supabase
    .from("owner_priority_snapshots")
    .upsert(
      {
        project_id: projectId,
        captured_at: capturedAt,
        version,
        priorities_json: priorities,
      },
      {
        onConflict: "project_id,captured_at,version",
      },
    )
    .select("id")
    .single<PrioritySnapshotRow>();

  if (snapshotUpsert.error) {
    throw new Error(`Failed to persist owner priority snapshot: ${snapshotUpsert.error.message}`);
  }

  const snapshotId = snapshotUpsert.data.id;

  const { data: existingOpenTasks, error: existingOpenTasksError } = await supabase
    .from("owner_tasks")
    .select("id, title")
    .eq("project_id", projectId)
    .eq("status", "open");

  if (existingOpenTasksError) {
    throw new Error(
      `Failed to load existing open owner tasks: ${existingOpenTasksError.message}`,
    );
  }

  const existingByTitle = new Map(
    (existingOpenTasks ?? []).map((task: ExistingOpenTaskRow) => [task.title, task.id]),
  );

  const taskRows = priorities.map((priority) => ({
    id: existingByTitle.get(priority.title) ?? crypto.randomUUID(),
    project_id: projectId,
    priority_snapshot_id: snapshotId,
    title: priority.title,
    plain_language_reason: priority.plain_language_reason,
    why_now: priority.why_now,
    expected_benefit: priority.expected_benefit,
    who_should_do_it: priority.who_should_do_it,
    difficulty: priority.difficulty,
    time_to_complete_estimate: priority.time_to_complete_estimate,
    proof_of_completion: priority.proof_of_completion,
    confidence_level: priority.confidence_level,
    status: "open",
    sort_order: priority.sort_order,
    task_type: priority.task_type,
    task_data: priority.task_data,
    completed_at: null,
  }));

  if (taskRows.length > 0) {
    const upsertTasks = await supabase.from("owner_tasks").upsert(taskRows);

    if (upsertTasks.error) {
      throw new Error(`Failed to persist owner tasks: ${upsertTasks.error.message}`);
    }
  }

  const incomingTitles = new Set(priorities.map((priority) => priority.title));
  const staleOpenTaskIds = (existingOpenTasks ?? [])
    .filter((task: ExistingOpenTaskRow) => !incomingTitles.has(task.title))
    .map((task: ExistingOpenTaskRow) => task.id);

  if (staleOpenTaskIds.length > 0) {
    const deleteStaleOpenTasks = await supabase
      .from("owner_tasks")
      .delete()
      .in("id", staleOpenTaskIds);

    if (deleteStaleOpenTasks.error) {
      throw new Error(
        `Failed to delete stale open owner tasks: ${deleteStaleOpenTasks.error.message}`,
      );
    }
  }
}

export async function buildOwnerPriorityQueue(projectId: string): Promise<OwnerPriority[]> {
  const priorities = await generateOwnerPriorityQueue(projectId);
  await persistOwnerPriorities(projectId, priorities);

  return priorities;
}
