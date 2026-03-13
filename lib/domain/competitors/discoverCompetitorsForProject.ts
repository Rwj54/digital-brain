import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { discoverMapsCompetitorsForProject } from "@/lib/competitors/discoverCompetitors";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

function toJsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as JsonObject;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown discovery error";
}

export type DiscoverCompetitorsForProjectResult =
  | {
      ok: true;
      projectId: string;
      jobId: string;
      result: JsonObject;
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
  const projectId =
    typeof input.projectId === "string" ? input.projectId.trim() : "";

  if (!projectId) {
    return {
      ok: false,
      projectId: "",
      error: "Missing projectId",
      status: 400,
    };
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
    const rawResult = await discoverMapsCompetitorsForProject({
      projectId,
      includeRawProvider: false,
    });

    const result = toJsonObject(rawResult);

    await finishProjectJobSuccess({
      jobId: job.jobId,
      resultSummary: result,
    });

    return { ok: true, projectId, jobId: job.jobId, result };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[discoverCompetitorsForProject] discovery error:", error);

    await finishProjectJobFailed({
      jobId: job.jobId,
      errorMessage: message,
      resultSummary: { projectId },
    });

    return {
      ok: false,
      projectId,
      jobId: job.jobId,
      error: message,
      status: 500,
    };
  }
}