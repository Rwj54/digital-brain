import { NextResponse } from "next/server";
import { buildOwnerPriorityQueue } from "@/lib/owner/buildOwnerPriorityQueue";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

    const priorities = await buildOwnerPriorityQueue(projectId);

    return NextResponse.json({
      ok: true,
      projectId,
      capturedAt: new Date().toISOString().slice(0, 10),
      priorities,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build owner priorities.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
