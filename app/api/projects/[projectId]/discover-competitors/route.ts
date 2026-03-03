import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export const runtime = "nodejs";

function getProjectIdFromUrl(req: Request): string {
  // Expected path: /api/projects/<projectId>/discover-competitors
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("projects");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "";
}

async function readProjectIdFromContext(context: any): Promise<string> {
  // Next.js can provide params as an object or as a Promise (depending on version/runtime)
  const paramsMaybe = context?.params;

  if (!paramsMaybe) return "";

  try {
    const params =
      typeof (paramsMaybe as any)?.then === "function" ? await paramsMaybe : paramsMaybe;

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const paramProjectId = await readProjectIdFromContext(context);

    const projectId = paramProjectId || getProjectIdFromUrl(req);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId" },
        { status: 400 }
      );
    }

    const job = await createProjectJob({
      projectId,
      jobType: "discover_competitors_maps",
      metadata: {
        provider: "dataforseo",
        source: "maps",
        mode: "manual",
        userAgent: req.headers.get("user-agent") ?? null,
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
      console.error("[discover-competitors] discovery error:", inner);

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
  } catch (outer: any) {
    const msg = outer?.message ?? "Unknown route crash";
    console.error("[discover-competitors] route crash:", outer);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}