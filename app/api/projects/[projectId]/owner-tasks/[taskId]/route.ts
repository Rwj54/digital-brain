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
    };

    const nextStatus = body.status === "completed" ? "completed" : "open";
    const completedAt =
      nextStatus === "completed" ? new Date().toISOString() : null;

    const supabase = getServiceRoleSupabase();

    const [{ data: taskData, error: taskError }, { data: allTasks, error: allTasksError }] =
      await Promise.all([
        supabase
          .from("owner_tasks")
          .update({
            status: nextStatus,
            completed_at: completedAt,
          })
          .eq("project_id", projectId)
          .eq("id", taskId)
          .select(TASK_SELECT)
          .single<OwnerTaskRow>(),
        supabase
          .from("owner_tasks")
          .select("id, status")
          .eq("project_id", projectId)
          .returns<OwnerTaskStatusRow[]>(),
      ]);

    if (taskError) {
      throw new Error(`Failed to update owner task: ${taskError.message}`);
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
