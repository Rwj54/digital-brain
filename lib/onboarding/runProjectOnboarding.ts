import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadProjectOnboardingContext } from "@/lib/onboarding/loadProjectOnboardingContext";

export type SeedRankKeywordInput = {
  keyword: string;
  metro: string;
  priority?: number;
  isActive?: boolean;
};

export type RunProjectOnboardingInput = {
  projectId: string;
  mode?: "manual" | "nightly";
  userAgent?: string | null;
  seedKeywords?: SeedRankKeywordInput[];
};

export type RunProjectOnboardingResult =
  | {
      ok: true;
      projectId: string;
      jobId: string;
      mode: "manual" | "nightly";
      capturedAt: string;
      seededKeywordCount: number;
      activeKeywordCount: number;
      steps: {
        projectValidated: boolean;
        rankInputsValidated: boolean;
        keywordSeeded: boolean;
        competitorDiscoveryStarted: boolean;
        baselineRankPlanned: boolean;
        authorityBaselinePlanned: boolean;
      };
      notes: string[];
    }
  | {
      ok: false;
      projectId: string;
      jobId?: string;
      mode: "manual" | "nightly";
      status: number;
      error: string;
    };

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function upsertSeedKeywords(params: {
  projectId: string;
  seedKeywords: SeedRankKeywordInput[];
}): Promise<number> {
  const supabase = supabaseAdmin();

  const rows = params.seedKeywords
    .map((row, index) => {
      const keyword = typeof row.keyword === "string" ? row.keyword.trim() : "";
      const metro = typeof row.metro === "string" ? row.metro.trim() : "";

      if (!keyword || !metro) {
        return null;
      }

      return {
        project_id: params.projectId,
        keyword,
        metro,
        is_active: row.isActive ?? true,
        priority:
          typeof row.priority === "number" && Number.isFinite(row.priority)
            ? Math.round(row.priority)
            : index + 1,
      };
    })
    .filter(
      (
        row
      ): row is {
        project_id: string;
        keyword: string;
        metro: string;
        is_active: boolean;
        priority: number;
      } => row !== null
    );

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("project_rank_keywords")
    .upsert(rows, { onConflict: "project_id,keyword,metro" });

  if (error) {
    throw new Error(`Failed to upsert project_rank_keywords: ${error.message}`);
  }

  return rows.length;
}

export async function runProjectOnboarding(
  input: RunProjectOnboardingInput
): Promise<RunProjectOnboardingResult> {
  const projectId =
    typeof input.projectId === "string" ? input.projectId.trim() : "";
  const mode = input.mode === "nightly" ? "nightly" : "manual";
  const capturedAt = todayDateUTC();

  if (!projectId) {
    return {
      ok: false,
      projectId: "",
      mode,
      status: 400,
      error: "Missing projectId.",
    };
  }

  const job = await createProjectJob({
    projectId,
    jobType: "project_onboarding_v1",
    metadata: {
      mode,
      userAgent: input.userAgent ?? null,
      seedKeywordCount: Array.isArray(input.seedKeywords)
        ? input.seedKeywords.length
        : 0,
    },
  });

  try {
    const seededKeywordCount = await upsertSeedKeywords({
      projectId,
      seedKeywords: input.seedKeywords ?? [],
    });

    const { project, activeKeywords } =
      await loadProjectOnboardingContext(projectId);

    const hasRankInputs =
      typeof project.rank_lat === "number" &&
      Number.isFinite(project.rank_lat) &&
      typeof project.rank_lng === "number" &&
      Number.isFinite(project.rank_lng);

    const hasActiveKeywords = activeKeywords.length > 0;

    const notes: string[] = [
      "Phase 3D onboarding route is now live.",
      "Project and keyword loading run through a dedicated onboarding context module.",
    ];

    if (!hasRankInputs) {
      notes.push(
        "Project is missing rank_lat or rank_lng, so baseline rank discovery is not started yet."
      );
    }

    if (!hasActiveKeywords) {
      notes.push(
        "Project has no active rank keywords yet, so rank baseline planning remains blocked."
      );
    }

    if (seededKeywordCount > 0) {
      notes.push(
        `Seeded ${seededKeywordCount} keyword(s) during onboarding startup.`
      );
    }

    notes.push(
      "Competitor discovery and authority baseline should move into dedicated onboarding modules next."
    );

    const result: RunProjectOnboardingResult = {
      ok: true,
      projectId,
      jobId: job.jobId,
      mode,
      capturedAt,
      seededKeywordCount,
      activeKeywordCount: activeKeywords.length,
      steps: {
        projectValidated: true,
        rankInputsValidated: hasRankInputs,
        keywordSeeded: seededKeywordCount > 0,
        competitorDiscoveryStarted: false,
        baselineRankPlanned: hasRankInputs && hasActiveKeywords,
        authorityBaselinePlanned: hasRankInputs && hasActiveKeywords,
      },
      notes,
    };

    await finishProjectJobSuccess({
      jobId: job.jobId,
      resultSummary: result,
    });

    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding error.";

    await finishProjectJobFailed({
      jobId: job.jobId,
      errorMessage: message,
      resultSummary: { projectId },
    });

    return {
      ok: false,
      projectId,
      jobId: job.jobId,
      mode,
      status: 500,
      error: message,
    };
  }
}