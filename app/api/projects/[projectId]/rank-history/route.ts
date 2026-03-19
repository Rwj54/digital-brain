import { NextResponse } from "next/server";
import { getRankHistory } from "@/lib/domain/rank/getRankHistory";
import { getActiveRankContext } from "@/lib/domain/rank/getActiveRankContext";

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
    const requestedKeyword = url.searchParams.get("keyword")?.trim() ?? "";
    const requestedMetro = url.searchParams.get("metro")?.trim() ?? "";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 100;

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid limit query param." },
        { status: 400 }
      );
    }

    const activeRankContext = await getActiveRankContext(projectId);

    if (!activeRankContext) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const keyword = requestedKeyword || activeRankContext.keyword || "";
    const metro = requestedMetro || activeRankContext.metro || "";

    if (!keyword) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project has no active rank keyword.",
        },
        { status: 400 }
      );
    }

    if (!metro) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project has no active rank metro.",
        },
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
      resolvedFromActiveConfig: !requestedKeyword || !requestedMetro,
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
