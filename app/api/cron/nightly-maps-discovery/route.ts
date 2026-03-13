import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export const runtime = "nodejs";

type ProjectRow = {
  id: string;
};

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown error";
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = supabaseServer();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("id")
      .eq("auto_discover_competitors_enabled", true);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    let successCount = 0;
    let failCount = 0;

    const projectRows = (projects ?? []) as ProjectRow[];

    for (const project of projectRows) {
      const projectId = project.id;

      const job = await createProjectJob({
        projectId,
        jobType: "discover_competitors_maps",
        metadata: {
          provider: "dataforseo",
          source: "maps",
          mode: "nightly",
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

        successCount += 1;
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error(
          "[nightly-maps-discovery] project failed:",
          projectId,
          error
        );

        await finishProjectJobFailed({
          jobId: job.jobId,
          errorMessage: message,
          resultSummary: { projectId },
        });

        failCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      projectsProcessed: projectRows.length,
      successCount,
      failCount,
    });
  } catch (error: unknown) {
    console.error("[nightly-maps-discovery] route crash:", error);

    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}