import { NextResponse } from "next/server";
import { getRankHistory } from "@/lib/domain/rank/getRankHistory";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword");
    const metro = url.searchParams.get("metro");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;

    if (!keyword) {
      return NextResponse.json(
        { ok: false, error: "Missing keyword query param." },
        { status: 400 }
      );
    }

    if (!metro) {
      return NextResponse.json(
        { ok: false, error: "Missing metro query param." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid limit query param." },
        { status: 400 }
      );
    }

    const snapshots = await getRankHistory({
      projectId,
      keyword,
      metro,
      limit,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      count: snapshots.length,
      snapshots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}