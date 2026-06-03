import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
};

type OwnerTaskRow = {
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

type OwnerTaskStatusRow = {
  id: string;
  status: string;
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

const TASK_SELECT = [
  "id",
  "project_id",
  "priority_snapshot_id",
  "title",
  "plain_language_reason",
  "why_now",
  "expected_benefit",
  "who_should_do_it",
  "difficulty",
  "time_to_complete_estimate",
  "proof_of_completion",
  "confidence_level",
  "status",
  "sort_order",
  "task_type",
  "task_data",
  "created_at",
  "completed_at",
].join(",");

function buildStatusSummary(task: Pick<OwnerTaskRow, "status" | "completed_at">) {
  return {
    isOpen: task.status === "open",
    isCompleted: task.status === "completed",
    completedAt: task.completed_at,
  };
}

function buildTaskCounts(tasks: OwnerTaskStatusRow[] | null) {
  const totalTasks = tasks?.length ?? 0;
  const openTasks = tasks?.filter((task) => task.status === "open").length ?? 0;
  const completedTasks =
    tasks?.filter((task) => task.status === "completed").length ?? 0;

  return {
    totalTasks,
    openTasks,
    completedTasks,
  };
}

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTaskDataValue(taskData: Record<string, unknown>, key: string): string | null {
  const value = taskData[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function upsertOwnerTaskImpact(params: {
  supabase: ReturnType<typeof getServiceRoleSupabase>;
  projectId: string;
  task: OwnerTaskRow;
  completedAt: string;
}) {
  const impactWindowDays = 30;
  const capturedAt = todayDateUTC();

  const baselineMetrics = {
    task_title: params.task.title,
    task_type: params.task.task_type,
    task_priority: getTaskDataValue(params.task.task_data, "priority"),
    task_category: getTaskDataValue(params.task.task_data, "category"),
    inferred_intent: getTaskDataValue(params.task.task_data, "inferred_intent"),
    completion_proof_present: Boolean(
      getTaskDataValue(params.task.task_data, "completion_proof_note"),
    ),
    completed_at: params.completedAt,
    baseline_captured_at: new Date().toISOString(),
  };

  const { error } = await params.supabase.from("owner_task_impacts").upsert(
    {
      project_id: params.projectId,
      owner_task_id: params.task.id,
      captured_at: capturedAt,
      impact_window_days: impactWindowDays,
      status: "waiting_for_window",
      source: "owner_task_completion",
      baseline_metrics: baselineMetrics,
      comparison_metrics: {},
      impact_summary: null,
      confidence_level: null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "owner_task_id,captured_at,impact_window_days",
    },
  );

  if (error) {
    throw new Error(`Failed to create owner task impact row: ${error.message}`);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId, taskId } = await context.params;

    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId or taskId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const [{ data: taskData, error: taskError }, { data: allTasks, error: allTasksError }] =
      await Promise.all([
        supabase
          .from("owner_tasks")
          .select(TASK_SELECT)
          .eq("project_id", projectId)
          .eq("id", taskId)
          .single<OwnerTaskRow>(),
        supabase
          .from("owner_tasks")
          .select("id, status")
          .eq("project_id", projectId)
          .returns<OwnerTaskStatusRow[]>(),
      ]);

    if (taskError) {
      throw new Error(`Failed to load owner task: ${taskError.message}`);
    }

    if (allTasksError) {
      throw new Error(`Failed to load owner task counts: ${allTasksError.message}`);
    }

    return NextResponse.json({
      ok: true,
      projectId,
      taskId,
      task: taskData,
      statusSummary: buildStatusSummary(taskData),
      taskCounts: buildTaskCounts(allTasks),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner task.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { projectId, taskId } = await context.params;

    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId or taskId.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
      completionProofNote?: string;
    };

    const nextStatus = body.status === "completed" ? "completed" : "open";
    const completedAt =
      nextStatus === "completed" ? new Date().toISOString() : null;
    const completionProofNote =
      typeof body.completionProofNote === "string"
        ? body.completionProofNote.trim().slice(0, 500)
        : "";

    const supabase = getServiceRoleSupabase();

    const { data: existingTask, error: existingTaskError } = await supabase
      .from("owner_tasks")
      .select("task_data")
      .eq("project_id", projectId)
      .eq("id", taskId)
      .single<Pick<OwnerTaskRow, "task_data">>();

    if (existingTaskError) {
      throw new Error(`Failed to load owner task proof data: ${existingTaskError.message}`);
    }

    const existingTaskData =
      existingTask.task_data && typeof existingTask.task_data === "object"
        ? existingTask.task_data
        : {};

    const nextTaskData =
      nextStatus === "completed" && completionProofNote
        ? {
            ...existingTaskData,
            completion_proof_note: completionProofNote,
            completion_proof_captured_at: completedAt,
          }
        : nextStatus === "open"
          ? {
              ...existingTaskData,
              completion_proof_note: null,
              completion_proof_captured_at: null,
            }
          : existingTaskData;

    const { data: taskData, error: taskError } = await supabase
      .from("owner_tasks")
      .update({
        status: nextStatus,
        completed_at: completedAt,
        task_data: nextTaskData,
      })
      .eq("project_id", projectId)
      .eq("id", taskId)
      .select(TASK_SELECT)
      .single<OwnerTaskRow>();

    if (taskError) {
      throw new Error(`Failed to update owner task: ${taskError.message}`);
    }

    if (nextStatus === "completed" && completedAt) {
      await upsertOwnerTaskImpact({
        supabase,
        projectId,
        task: taskData,
        completedAt,
      });
    }

    const { data: allTasks, error: allTasksError } = await supabase
      .from("owner_tasks")
      .select("id, status")
      .eq("project_id", projectId)
      .returns<OwnerTaskStatusRow[]>();

    if (allTasksError) {
      throw new Error(`Failed to load owner task counts: ${allTasksError.message}`);
    }

    return NextResponse.json({
      ok: true,
      projectId,
      taskId,
      task: taskData,
      statusSummary: buildStatusSummary(taskData),
      taskCounts: buildTaskCounts(allTasks),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update owner task.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
