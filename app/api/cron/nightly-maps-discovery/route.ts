import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow local testing if not set
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseServer();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("id")
      .eq("auto_discover_competitors_enabled", true);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const p of projects ?? []) {
      const projectId = p.id as string;

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
      } catch (e: any) {
        const msg = e?.message ?? "Unknown error";
        console.error("[nightly-maps-discovery] project failed:", projectId, e);

        await finishProjectJobFailed({
          jobId: job.jobId,
          errorMessage: msg,
          resultSummary: { projectId },
        });

        failCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      projectsProcessed: projects?.length ?? 0,
      successCount,
      failCount,
    });
  } catch (e: any) {
    console.error("[nightly-maps-discovery] route crash:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}