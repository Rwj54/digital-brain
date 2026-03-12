import { NextResponse } from "next/server";
import { detectCompetitorPressure } from "@/lib/domain/rank/detectCompetitorPressure";
import { buildPressureActions } from "@/lib/domain/rank/buildPressureActions";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const { searchParams } = new URL(request.url);

    const keyword = searchParams.get("keyword")?.trim() ?? "";
    const metro = searchParams.get("metro")?.trim() ?? "";

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    if (!keyword) {
      return NextResponse.json(
        { ok: false, error: "Missing keyword." },
        { status: 400 }
      );
    }

    if (!metro) {
      return NextResponse.json(
        { ok: false, error: "Missing metro." },
        { status: 400 }
      );
    }

    const pressure = await detectCompetitorPressure({
      projectId,
      keyword,
      metro,
    });

    const actions = buildPressureActions(pressure);

    return NextResponse.json({
      ok: true,
      projectId,
      keyword,
      metro,
      pressure,
      actions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}