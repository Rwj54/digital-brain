import { NextResponse } from "next/server";
import { cleanupLegacyCompetitorDuplicates } from "@/lib/competitors/cleanupLegacyCompetitorDuplicates";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    const result = await cleanupLegacyCompetitorDuplicates({ projectId });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}