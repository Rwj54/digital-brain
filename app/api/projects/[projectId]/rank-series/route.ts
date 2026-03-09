import { NextResponse } from "next/server";
import { getRankSeries } from "@/lib/domain/rank/getRankSeries";

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

    const series = await getRankSeries({
      projectId,
      keyword,
      metro,
    });

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      pointCount: series.length,
      series,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}