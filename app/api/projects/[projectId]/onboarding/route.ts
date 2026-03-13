import { NextRequest, NextResponse } from "next/server";
import { runProjectOnboarding } from "@/lib/onboarding/runProjectOnboarding";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type RequestBody = {
  seedKeywords?: Array<{
    keyword?: string;
    metro?: string;
    priority?: number;
    isActive?: boolean;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as RequestBody;

    const result = await runProjectOnboarding({
      projectId,
      mode: "manual",
      userAgent: request.headers.get("user-agent"),
      seedKeywords: Array.isArray(body.seedKeywords) ? body.seedKeywords : [],
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : result.status,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding route error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}