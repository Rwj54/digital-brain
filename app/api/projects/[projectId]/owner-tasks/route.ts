import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerTaskListRow = {
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const supabase = getServiceRoleSupabase();

    const { data: allTasks, error: allTasksError } = await supabase
      .from("owner_tasks")
      .select("id, status")
      .eq("project_id", projectId)
      .returns<OwnerTaskStatusRow[]>();

    if (allTasksError) {
      throw new Error(`Failed to load owner task summary: ${allTasksError.message}`);
    }

    let query = supabase
      .from("owner_tasks")
      .select(TASK_SELECT)
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (statusFilter === "open" || statusFilter === "completed") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query.returns<OwnerTaskListRow[]>();

    if (error) {
      throw new Error(`Failed to load owner tasks: ${error.message}`);
    }

    const totalTasks = allTasks?.length ?? 0;
    const openTasks = allTasks?.filter((task) => task.status === "open").length ?? 0;
    const completedTasks =
      allTasks?.filter((task) => task.status === "completed").length ?? 0;

    return NextResponse.json({
      ok: true,
      projectId,
      statusFilter:
        statusFilter === "open" || statusFilter === "completed"
          ? statusFilter
          : "all",
      count: data?.length ?? 0,
      summary: {
        totalTasks,
        openTasks,
        completedTasks,
      },
      tasks: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner tasks.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
