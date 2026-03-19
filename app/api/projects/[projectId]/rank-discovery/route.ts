import { NextResponse } from "next/server";
import { getActiveRankContext } from "@/lib/domain/rank/getActiveRankContext";
import { runBaselineRankDiscovery } from "@/lib/domain/rank/runBaselineRankDiscovery";

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

    const activeRankContext = await getActiveRankContext(projectId);

    if (!activeRankContext) {
      return NextResponse.json(
        { ok: false, error: "Project not found." },
        { status: 404 }
      );
    }

    const baselineRankDiscovery = await runBaselineRankDiscovery({
      projectId,
      activeKeywords:
        activeRankContext.keyword && activeRankContext.metro
          ? [
              {
                keyword: activeRankContext.keyword,
                metro: activeRankContext.metro,
                priority: 1,
              },
            ]
          : [],
      rankLat: activeRankContext.rankLat,
      rankLng: activeRankContext.rankLng,
      capturedAt: new Date().toISOString().slice(0, 10),
    });

    if (!baselineRankDiscovery.executed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            baselineRankDiscovery.skippedReason ??
            "Baseline rank discovery was not executed.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      phase: "phase_3_rank_intelligence",
      message: "Live rank discovery completed and snapshots stored.",
      project: {
        id: activeRankContext.projectId,
        keywordId: activeRankContext.keywordId,
        rankKeyword: baselineRankDiscovery.keyword,
        rankMetro: baselineRankDiscovery.metro,
        rankLat: activeRankContext.rankLat,
        rankLng: activeRankContext.rankLng,
      },
      candidateCount: baselineRankDiscovery.candidateCount,
      storedCount: baselineRankDiscovery.storedCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
