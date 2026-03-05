import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthorityChartPoint = {
  date: string;
  authority: number | null;
  momentum: number | null;
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

export async function getAuthorityChart(input: {
  projectId: string;
}): Promise<GetAuthorityChartResult> {
  try {
    const projectId = typeof input.projectId === "string" ? input.projectId.trim() : "";
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

    const series: AuthorityChartPoint[] =
      data?.map((row: any) => ({
        date: String(row?.captured_at ?? ""),
        authority:
          row?.authority_score === null || row?.authority_score === undefined
            ? null
            : Number(row.authority_score),
        momentum:
          row?.momentum_score === null || row?.momentum_score === undefined
            ? null
            : Number(row.momentum_score),
      })) ?? [];

    return { ok: true, projectId, series };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unknown error", status: 500 };
  }
}