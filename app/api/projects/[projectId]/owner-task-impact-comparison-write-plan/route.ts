import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildOwnerTaskImpactComparisonWritePlanPreview,
  loadOwnerTaskCurrentReviewMetrics,
  OWNER_TASK_IMPACT_SELECT,
  type OwnerTaskImpactRow,
} from "@/lib/owner/taskImpactComparisonMetadata";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type SupabaseServiceRoleClient = ReturnType<typeof getServiceRoleSupabase>;

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

async function loadImpact(params: {
  supabase: SupabaseServiceRoleClient;
  projectId: string;
  impactId: string | null;
  ownerTaskId: string | null;
}): Promise<OwnerTaskImpactRow | null> {
  let query = params.supabase
    .from("owner_task_impacts")
    .select(OWNER_TASK_IMPACT_SELECT)
    .eq("project_id", params.projectId)
    .order("captured_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.impactId) {
    query = query.eq("id", params.impactId);
  } else if (params.ownerTaskId) {
    query = query.eq("owner_task_id", params.ownerTaskId);
  }

  const { data, error } = await query.returns<OwnerTaskImpactRow[]>();

  if (error) {
    throw new Error(`Failed to load owner task impact: ${error.message}`);
  }

  return data?.[0] ?? null;
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
    const impactId = searchParams.get("impactId");
    const ownerTaskId =
      searchParams.get("ownerTaskId") ?? searchParams.get("taskId");

    if (!impactId && !ownerTaskId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing impactId or ownerTaskId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();
    const generatedAt = new Date().toISOString();

    const [impact, currentReviewMetrics] = await Promise.all([
      loadImpact({
        supabase,
        projectId,
        impactId,
        ownerTaskId,
      }),
      loadOwnerTaskCurrentReviewMetrics({
        supabase,
        projectId,
      }),
    ]);

    if (!impact) {
      return NextResponse.json(
        {
          ok: false,
          error: "Owner task impact not found.",
          projectId,
          filters: {
            impactId,
            ownerTaskId,
          },
        },
        { status: 404 },
      );
    }

    const preview = buildOwnerTaskImpactComparisonWritePlanPreview({
      impact,
      currentReviewMetrics,
      generatedAt,
    });

    return NextResponse.json({
      ok: true,
      mode: "preview_only_no_write",
      projectId,
      filters: {
        impactId,
        ownerTaskId,
      },
      writeBoundary: {
        databaseWritesPerformed: false,
        shouldWriteComparisonMetrics:
          preview.comparisonWritePlan.shouldWriteComparisonMetrics,
        shouldWriteImpactSummary: false,
        shouldWriteConfidenceLevel: false,
        shouldPromoteStoredStatus: false,
        attributionClaimAllowed: false,
      },
      impact: preview,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to preview owner task impact comparison write plan.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
