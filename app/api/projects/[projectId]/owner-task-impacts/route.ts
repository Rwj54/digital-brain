import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type OwnerTaskImpactStatus =
  | "waiting_for_window"
  | "window_ready"
  | "completed"
  | string;

type OwnerTaskImpactRow = {
  id: string;
  project_id: string;
  owner_task_id: string;
  captured_at: string;
  impact_window_days: number;
  status: OwnerTaskImpactStatus;
  source: string;
  baseline_metrics: Record<string, unknown>;
  comparison_metrics: Record<string, unknown>;
  impact_summary: string | null;
  confidence_level: number | null;
  created_at: string;
  updated_at: string;
};

type OwnerTaskImpactReadiness = {
  eligibleOn: string | null;
  daysRemaining: number | null;
  isWindowReady: boolean;
  computedStatus: "waiting_for_window" | "window_ready" | "completed" | "tracked";
};

type OwnerTaskImpactResponseRow = OwnerTaskImpactRow & {
  readiness: OwnerTaskImpactReadiness;
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

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseCapturedAtDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function addUtcDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate;
}

function calculateDaysRemaining(today: Date, eligibleDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const difference = eligibleDate.getTime() - today.getTime();

  return Math.max(0, Math.ceil(difference / millisecondsPerDay));
}

function buildImpactReadiness(impact: OwnerTaskImpactRow): OwnerTaskImpactReadiness {
  if (impact.status === "completed") {
    return {
      eligibleOn: null,
      daysRemaining: 0,
      isWindowReady: true,
      computedStatus: "completed",
    };
  }

  const capturedAtDate = parseCapturedAtDate(impact.captured_at);

  if (!capturedAtDate) {
    return {
      eligibleOn: null,
      daysRemaining: null,
      isWindowReady: false,
      computedStatus:
        impact.status === "window_ready" ? "window_ready" : "tracked",
    };
  }

  const impactWindowDays = Math.max(impact.impact_window_days, 1);
  const today = startOfUtcDay(new Date());
  const eligibleDate = addUtcDays(capturedAtDate, impactWindowDays);
  const isWindowReady = eligibleDate.getTime() <= today.getTime();

  if (impact.status === "window_ready" || isWindowReady) {
    return {
      eligibleOn: formatUtcDate(eligibleDate),
      daysRemaining: 0,
      isWindowReady: true,
      computedStatus: "window_ready",
    };
  }

  return {
    eligibleOn: formatUtcDate(eligibleDate),
    daysRemaining: calculateDaysRemaining(today, eligibleDate),
    isWindowReady: false,
    computedStatus: "waiting_for_window",
  };
}

function withReadiness(
  impact: OwnerTaskImpactRow,
): OwnerTaskImpactResponseRow {
  return {
    ...impact,
    readiness: buildImpactReadiness(impact),
  };
}

function buildImpactSummary(impacts: OwnerTaskImpactResponseRow[]) {
  const waitingForWindow = impacts.filter(
    (impact) => impact.status === "waiting_for_window",
  ).length;
  const windowReady = impacts.filter(
    (impact) => impact.status === "window_ready",
  ).length;
  const completed = impacts.filter(
    (impact) => impact.status === "completed",
  ).length;
  const computedWindowReady = impacts.filter(
    (impact) => impact.readiness.computedStatus === "window_ready",
  ).length;

  return {
    totalImpacts: impacts.length,
    waitingForWindow,
    windowReady,
    completed,
    computedWindowReady,
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

    const impacts = (data ?? []).map(withReadiness);

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
