import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prepareOwnerTaskImpactComparisonMetricsUpdatePayload } from "@/lib/owner/taskImpactComparisonMetricsWrite";
import {
  buildOwnerTaskImpactComparisonWriteBoundary,
  buildOwnerTaskImpactComparisonWritePostResponse,
  type OwnerTaskImpactComparisonWriteRouteFilters,
} from "@/lib/owner/taskImpactComparisonWriteRouteResponse";
import {
  buildOwnerTaskImpactComparisonWritePlanPreview,
  loadOwnerTaskCurrentReviewMetrics,
  OWNER_TASK_IMPACT_SELECT,
  type OwnerTaskImpactRow,
  type OwnerTaskImpactWithComparisonWritePlan,
} from "@/lib/owner/taskImpactComparisonMetadata";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type SupabaseServiceRoleClient = ReturnType<typeof getServiceRoleSupabase>;

type ImpactFilters = OwnerTaskImpactComparisonWriteRouteFilters;

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

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getFiltersFromSearchParams(request: Request): ImpactFilters {
  const { searchParams } = new URL(request.url);

  return {
    impactId: searchParams.get("impactId"),
    ownerTaskId: searchParams.get("ownerTaskId") ?? searchParams.get("taskId"),
  };
}

async function getFiltersFromPostRequest(
  request: Request,
): Promise<ImpactFilters> {
  const searchFilters = getFiltersFromSearchParams(request);

  if (searchFilters.impactId || searchFilters.ownerTaskId) {
    return searchFilters;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      impactId: null,
      ownerTaskId: null,
    };
  }

  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      impactId: null,
      ownerTaskId: null,
    };
  }

  const bodyRecord = body as Record<string, unknown>;

  return {
    impactId: normalizeString(bodyRecord.impactId),
    ownerTaskId:
      normalizeString(bodyRecord.ownerTaskId) ??
      normalizeString(bodyRecord.taskId),
  };
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

async function buildPreview(params: {
  supabase: SupabaseServiceRoleClient;
  projectId: string;
  impactId: string | null;
  ownerTaskId: string | null;
  generatedAt: string;
}): Promise<OwnerTaskImpactWithComparisonWritePlan | null> {
  const [impact, currentReviewMetrics] = await Promise.all([
    loadImpact({
      supabase: params.supabase,
      projectId: params.projectId,
      impactId: params.impactId,
      ownerTaskId: params.ownerTaskId,
    }),
    loadOwnerTaskCurrentReviewMetrics({
      supabase: params.supabase,
      projectId: params.projectId,
    }),
  ]);

  if (!impact) {
    return null;
  }

  return buildOwnerTaskImpactComparisonWritePlanPreview({
    impact,
    currentReviewMetrics,
    generatedAt: params.generatedAt,
  });
}

function buildMissingImpactResponse(params: {
  projectId: string;
  filters: ImpactFilters;
}) {
  return NextResponse.json(
    {
      ok: false,
      error: "Owner task impact not found.",
      projectId: params.projectId,
      filters: params.filters,
    },
    { status: 404 },
  );
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

    const filters = getFiltersFromSearchParams(request);

    if (!filters.impactId && !filters.ownerTaskId) {
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

    const preview = await buildPreview({
      supabase,
      projectId,
      impactId: filters.impactId,
      ownerTaskId: filters.ownerTaskId,
      generatedAt,
    });

    if (!preview) {
      return buildMissingImpactResponse({
        projectId,
        filters,
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "preview_only_no_write",
      projectId,
      filters,
      writeBoundary: buildOwnerTaskImpactComparisonWriteBoundary(preview),
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          mode: "blocked_no_write",
          error: "Missing projectId.",
          writeBoundary: {
            databaseWritesPerformed: false,
            writeRouteEnabled: false,
            shouldWriteComparisonMetrics: false,
            shouldWriteImpactSummary: false,
            shouldWriteConfidenceLevel: false,
            shouldPromoteStoredStatus: false,
            attributionClaimAllowed: false,
          },
          comparisonMetricsPayloadPreparation: null,
        },
        { status: 400 },
      );
    }

    const filters = await getFiltersFromPostRequest(request);

    if (!filters.impactId && !filters.ownerTaskId) {
      return NextResponse.json(
        {
          ok: false,
          mode: "blocked_no_write",
          error: "Missing impactId or ownerTaskId.",
          projectId,
          filters,
          writeBoundary: {
            databaseWritesPerformed: false,
            writeRouteEnabled: false,
            shouldWriteComparisonMetrics: false,
            shouldWriteImpactSummary: false,
            shouldWriteConfidenceLevel: false,
            shouldPromoteStoredStatus: false,
            attributionClaimAllowed: false,
          },
          comparisonMetricsPayloadPreparation: null,
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();
    const generatedAt = new Date().toISOString();

    const preview = await buildPreview({
      supabase,
      projectId,
      impactId: filters.impactId,
      ownerTaskId: filters.ownerTaskId,
      generatedAt,
    });

    if (!preview) {
      return buildMissingImpactResponse({
        projectId,
        filters,
      });
    }

    const comparisonMetricsPayloadPreparation =
      prepareOwnerTaskImpactComparisonMetricsUpdatePayload(
        preview.comparisonWritePlan,
      );
    const response = buildOwnerTaskImpactComparisonWritePostResponse({
      projectId,
      filters,
      preview,
      comparisonMetricsPayloadPreparation,
    });

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run owner task impact comparison write skeleton.";

    return NextResponse.json(
      {
        ok: false,
        mode: "blocked_no_write",
        error: message,
        writeBoundary: {
          databaseWritesPerformed: false,
          writeRouteEnabled: false,
          shouldWriteComparisonMetrics: false,
          shouldWriteImpactSummary: false,
          shouldWriteConfidenceLevel: false,
          shouldPromoteStoredStatus: false,
          attributionClaimAllowed: false,
        },
        comparisonMetricsPayloadPreparation: null,
      },
      { status: 500 },
    );
  }
}
