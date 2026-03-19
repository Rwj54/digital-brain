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

function mapActionToOwnerPriority(
  action: ProjectAction,
  sortOrder: number,
): OwnerPriority | null {
  const title = asText(action.title);
  const detail = asText(action.detail);
  const category = asText(action.category, "general");
  const priority = asText(action.priority, "medium");

  if (!title) {
    return null;
  }

  let whoShouldDoIt: OwnerPriorityWho = "owner";
  let difficulty: OwnerPriorityDifficulty = "medium";
  let timeToCompleteEstimate = "1 to 2 hours";
  let confidenceLevel = 0.72;

  if (category === "reviews") {
    whoShouldDoIt = "owner";
    difficulty = "medium";
    timeToCompleteEstimate = "1 hour";
    confidenceLevel = 0.86;
  } else if (category === "competition") {
    whoShouldDoIt = "owner";
    difficulty = "easy";
    timeToCompleteEstimate = "30 to 60 minutes";
    confidenceLevel = 0.74;
  } else if (category === "website" || category === "technical") {
    whoShouldDoIt = "developer";
    difficulty = "hard";
    timeToCompleteEstimate = "2 to 4 hours";
    confidenceLevel = 0.68;
  }

  if (priority === "high") {
    confidenceLevel += 0.08;
  } else if (priority === "low") {
    confidenceLevel -= 0.08;
  }

  return {
    title,
    plain_language_reason:
      detail || "This is one of the most important next actions for improving local visibility.",
    why_now:
      priority === "high"
        ? "This is a high-priority issue and should be handled first."
        : "This is worth addressing soon to support stronger local visibility.",
    expected_benefit:
      category === "reviews"
        ? "Stronger local trust and better authority signals."
        : category === "competition"
          ? "A better chance to hold or improve your local position."
          : "A stronger local SEO foundation.",
    who_should_do_it: whoShouldDoIt,
    difficulty,
    time_to_complete_estimate: timeToCompleteEstimate,
    proof_of_completion:
      category === "reviews"
        ? "New reviews have been requested and recent review growth is visible."
        : category === "competition"
          ? "The business profile or page was updated and the change is live."
          : "The recommended improvement was completed and verified live.",
    confidence_level: clampConfidence(confidenceLevel),
    source: "project_actions",
    sort_order: sortOrder,
    task_type: category || "general",
    task_data: {
      category,
      priority,
      original_detail: detail,
    },
  };
}

function buildAuthorityFallback(authority: AuthorityRow | null): OwnerPriority[] {
  if (!authority) {
    return [
      {
        title: "Review your top local SEO priorities",
        plain_language_reason:
          "Digital Brain does not yet have enough owner-ready task data for this project.",
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
      why_now: "Authority and momentum directly affect how competitive the business appears locally.",
      expected_benefit: "A stronger competitive position and better priority clarity.",
      who_should_do_it: "owner",
      difficulty: "medium",
      time_to_complete_estimate: "1 to 2 hours",
      proof_of_completion: "The next authority snapshot shows improved supporting signals.",
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
    .filter((item): item is OwnerPriority => item !== null)
    .slice(0, 3);

  const authorityRow: AuthorityRow | null = authorityResult.data
    ? {
        authority_score: authorityResult.data.authority_score,
        authority_tier: authorityResult.data.authority_tier,
        momentum_label: authorityResult.data.momentum_label,
      }
    : null;

  return prioritiesFromActions.length > 0
    ? prioritiesFromActions
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
    id: existingByTitle.get(priority.title),
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
