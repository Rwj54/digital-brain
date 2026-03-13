import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthorityChartPoint = {
  date: string;
  authority: number | null;
  momentum: number | null;
};

type AuthorityChartRow = {
  captured_at: string | null;
  authority_score: number | string | null;
  momentum_score: number | string | null;
};

export type GetAuthorityChartResult =
  | {
      ok: true;
      projectId: string;
      series: AuthorityChartPoint[];
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown error";
}

export async function getAuthorityChart(input: {
  projectId: string;
}): Promise<GetAuthorityChartResult> {
  try {
    const projectId =
      typeof input.projectId === "string" ? input.projectId.trim() : "";

    if (!projectId) {
      return { ok: false, error: "Missing projectId", status: 400 };
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("project_authority_scores")
      .select("captured_at,authority_score,momentum_score")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: true });

    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }

    const rows = (data ?? []) as AuthorityChartRow[];

    const series: AuthorityChartPoint[] = rows.map((row) => ({
      date: String(row.captured_at ?? ""),
      authority: toNullableNumber(row.authority_score),
      momentum: toNullableNumber(row.momentum_score),
    }));

    return { ok: true, projectId, series };
  } catch (error: unknown) {
    return { ok: false, error: getErrorMessage(error), status: 500 };
  }
}