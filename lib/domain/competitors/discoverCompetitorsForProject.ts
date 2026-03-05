import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

export type DiscoverCompetitorsForProjectResult =
  | {
      ok: true;
      projectId: string;
      jobId: string;
      result: any;
    }
  | {
      ok: false;
      projectId: string;
      jobId?: string;
      error: string;
      status: number;
    };

export async function discoverCompetitorsForProject(input: {
  projectId: string;
  mode: "manual" | "nightly";
  userAgent?: string | null;
}): Promise<DiscoverCompetitorsForProjectResult> {
  const projectId = typeof input.projectId === "string" ? input.projectId.trim() : "";
  if (!projectId) {
    return { ok: false, projectId: "", error: "Missing projectId", status: 400 };
  }

  const job = await createProjectJob({
    projectId,
    jobType: "discover_competitors_maps",
    metadata: {
      provider: "dataforseo",
      source: "maps",
      mode: input.mode,
      userAgent: input.userAgent ?? null,
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

    return { ok: true, projectId, jobId: job.jobId, result };
  } catch (inner: any) {
    const msg = inner?.message ?? "Unknown discovery error";
    console.error("[discoverCompetitorsForProject] discovery error:", inner);

    await finishProjectJobFailed({
      jobId: job.jobId,
      errorMessage: msg,
      resultSummary: { projectId },
    });

    return { ok: false, projectId, jobId: job.jobId, error: msg, status: 500 };
  }
}