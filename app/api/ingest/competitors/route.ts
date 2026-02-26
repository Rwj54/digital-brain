import { NextResponse } from "next/server";
import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export const runtime = "nodejs";

/**
 * Legacy ingest route kept for compatibility.
 * POST body: { "projectId": "<uuid>" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";

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
    } catch (inner: any) {
      const msg = inner?.message ?? "Unknown discovery error";
      console.error("[ingest/competitors] discovery error:", inner);

      await finishProjectJobFailed({
        jobId: job.jobId,
        errorMessage: msg,
        resultSummary: { projectId },
      });

      return NextResponse.json(
        { ok: false, jobId: job.jobId, error: msg },
        { status: 500 }
      );
    }
  } catch (e: any) {
    console.error("[ingest/competitors] route crash:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}