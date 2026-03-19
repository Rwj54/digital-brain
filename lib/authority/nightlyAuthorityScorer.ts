import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { runAuthorityBaseline } from "@/lib/authority/runAuthorityBaseline";

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export interface NightlyAuthorityRunResult {
  captured_at: string;
  version: string;
  projects_total: number;
  projects_scored: number;
  projects_skipped: number;
  errors: Array<{ project_id?: string; message: string }>;
}

export async function runNightlyAuthorityScorer(): Promise<NightlyAuthorityRunResult> {
  const supabase = supabaseAdmin();
  const captured_at = todayDateUTC();
  const version = "v1.1";

  const result: NightlyAuthorityRunResult = {
    captured_at,
    version,
    projects_total: 0,
    projects_scored: 0,
    projects_skipped: 0,
    errors: [],
  };

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id")
    .order("id", { ascending: true });

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`);
  }

  const projectRows = (projects ?? []) as Array<{ id: string }>;
  result.projects_total = projectRows.length;

  if (projectRows.length === 0) {
    return result;
  }

  for (const project of projectRows) {
    try {
      const baseline = await runAuthorityBaseline({
        projectId: project.id,
        capturedAt: captured_at,
        version,
      });

      if (baseline.executed) {
        result.projects_scored += 1;
      } else {
        result.projects_skipped += 1;

        if (baseline.skippedReason) {
          result.errors.push({
            project_id: project.id,
            message: baseline.skippedReason,
          });
        }
      }
    } catch (error: unknown) {
      result.projects_skipped += 1;
      result.errors.push({
        project_id: project.id,
        message: getErrorMessage(error, "Unknown scorer error"),
      });
    }
  }

  return result;
}
