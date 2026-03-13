import { supabaseServer } from "../supabase/server";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = {
  [key: string]: JsonValue;
};

export async function createProjectJob(args: {
  projectId: string;
  jobType: string;
  metadata?: JsonObject | null;
}) {
  const supabase = supabaseServer();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_jobs")
    .insert({
      project_id: args.projectId,
      job_type: args.jobType,
      status: "running",
      started_at: now,
      metadata: args.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create project_jobs row: ${error.message}`);
  }

  return { jobId: data.id as string, startedAt: now };
}

export async function finishProjectJobSuccess(args: {
  jobId: string;
  resultSummary?: JsonObject | null;
}) {
  const supabase = supabaseServer();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("project_jobs")
    .update({
      status: "success",
      finished_at: now,
      result_summary: args.resultSummary ?? null,
    })
    .eq("id", args.jobId);

  if (error) {
    throw new Error(`Failed to update project_jobs success: ${error.message}`);
  }
}

export async function finishProjectJobFailed(args: {
  jobId: string;
  errorMessage: string;
  resultSummary?: JsonObject | null;
}) {
  const supabase = supabaseServer();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("project_jobs")
    .update({
      status: "failed",
      finished_at: now,
      error_message: args.errorMessage,
      result_summary: args.resultSummary ?? null,
    })
    .eq("id", args.jobId);

  if (error) {
    throw new Error(`Failed to update project_jobs failed: ${error.message}`);
  }
}