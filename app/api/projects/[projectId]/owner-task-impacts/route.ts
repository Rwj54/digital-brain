import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerTaskImpactRow = {
  id: string;
  project_id: string;
  owner_task_id: string;
  captured_at: string;
  impact_window_days: number;
  status: string;
  source: string;
  baseline_metrics: Record<string, unknown>;
  comparison_metrics: Record<string, unknown>;
  impact_summary: string | null;
  confidence_level: number | null;
  created_at: string;
  updated_at: string;
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

const IMPACT_SELECT = [
  "id",
  "project_id",
  "owner_task_id",
  "captured_at",
  "impact_window_days",
  "status",
  "source",
  "baseline_metrics",
  "comparison_metrics",
  "impact_summary",
  "confidence_level",
  "created_at",
  "updated_at",
].join(",");

function normalizeLimit(value: string | null): number {
  if (!value) {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function buildImpactSummary(impacts: OwnerTaskImpactRow[]) {
  const waitingForWindow = impacts.filter(
    (impact) => impact.status === "waiting_for_window",
  ).length;
  const windowReady = impacts.filter(
    (impact) => impact.status === "window_ready",
  ).length;
  const completed = impacts.filter(
    (impact) => impact.status === "completed",
  ).length;

  return {
    totalImpacts: impacts.length,
    waitingForWindow,
    windowReady,
    completed,
  };
}

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
    const ownerTaskId =
      searchParams.get("ownerTaskId") ?? searchParams.get("taskId");
    const statusFilter = searchParams.get("status");
    const limit = normalizeLimit(searchParams.get("limit"));

    const supabase = getServiceRoleSupabase();

    let query = supabase
      .from("owner_task_impacts")
      .select(IMPACT_SELECT)
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (ownerTaskId) {
      query = query.eq("owner_task_id", ownerTaskId);
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query.returns<OwnerTaskImpactRow[]>();

    if (error) {
      throw new Error(`Failed to load owner task impacts: ${error.message}`);
    }

    const impacts = data ?? [];

    return NextResponse.json({
      ok: true,
      projectId,
      filters: {
        ownerTaskId: ownerTaskId ?? null,
        status: statusFilter ?? "all",
        limit,
      },
      count: impacts.length,
      summary: buildImpactSummary(impacts),
      impacts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner task impacts.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
