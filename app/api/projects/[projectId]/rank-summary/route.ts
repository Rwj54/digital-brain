import { NextResponse } from "next/server";
import { getRankSummary } from "@/lib/domain/rank/getRankSummary";
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

    const summary = await getRankSummary({
      projectId,
      keyword,
      metro,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      resolvedFromActiveConfig: !requestedKeyword || !requestedMetro,
      summary,
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
