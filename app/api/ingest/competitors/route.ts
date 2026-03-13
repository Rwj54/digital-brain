import { NextResponse } from "next/server";
import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export const runtime = "nodejs";

type IngestCompetitorsRequestBody = {
  projectId?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

/**
 * Legacy ingest route kept for compatibility.
 * POST body: { "projectId": "<uuid>" }
 */
export async function POST(req: Request) {
  try {
    const body = (await req
      .json()
      .catch(() => ({}))) as IngestCompetitorsRequestBody;

    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId in JSON body" },
        { status: 400 }
      );
    }

    const job = await createProjectJob({
      projectId,
      jobType: "discover_competitors_maps",
      metadata: {
        provider: "dataforseo",
        source: "maps",
        mode: "legacy_ingest_route",
      },
    });

    try {
      const result = await discoverMapsCompetitorsForProject({
        projectId,
        includeRawProvider: false,
      });

      await finishProjectJobSuccess({
        jobId: job.jobId,
        resultSummary: result,
      });

      return NextResponse.json({ ok: true, jobId: job.jobId, result });
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Unknown discovery error");
      console.error("[ingest/competitors] discovery error:", error);

      await finishProjectJobFailed({
        jobId: job.jobId,
        errorMessage: message,
        resultSummary: { projectId },
      });

      return NextResponse.json(
        { ok: false, jobId: job.jobId, error: message },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[ingest/competitors] route crash:", error);

    return NextResponse.json(
      { ok: false, error: getErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}