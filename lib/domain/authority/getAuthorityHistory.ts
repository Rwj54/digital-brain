import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AuthorityHistoryRow = {
  project_id: string;
  captured_at: string;
  version: string | null;
  authority_score: number | null;
  authority_tier: string | null;
  competitive_strength: number | null;
  structural_optimization: number | null;
  momentum_score: number | null;
  momentum_label: string | null;
  created_at: string;
};

export type GetAuthorityHistoryResult =
  | {
      ok: true;
      projectId: string;
      limit: number;
      rows: AuthorityHistoryRow[];
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function getAuthorityHistory(input: {
  projectId: string;
  limit?: number;
}): Promise<GetAuthorityHistoryResult> {
  try {
    const projectId = typeof input.projectId === "string" ? input.projectId.trim() : "";
    if (!projectId) {
      return { ok: false, error: "Missing projectId", status: 400 };
    }

    const limitRaw = typeof input.limit === "number" ? input.limit : 30;
    const limit = clampInt(Number.isFinite(limitRaw) ? limitRaw : 30, 1, 365);

    // NOTE: In this codebase, supabaseAdmin is a factory function.
    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("project_authority_scores")
      .select(
        "project_id,captured_at,version,authority_score,authority_tier,competitive_strength,structural_optimization,momentum_score,momentum_label,created_at"
      )
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        ok: false,
        error: `Failed to load authority history: ${error.message}`,
        status: 500,
      };
    }

    return {
      ok: true,
      projectId,
      limit,
      rows: (data ?? []) as AuthorityHistoryRow[],
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error",
      status: 500,
    };
  }
}