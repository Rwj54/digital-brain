import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getProjectIdFromUrl(req: Request): string {
  // Expected path: /api/projects/<projectId>/authority-history
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("projects");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "";
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function readProjectIdFromContext(context: any): Promise<string> {
  const paramsMaybe = context?.params;
  if (!paramsMaybe) return "";

  try {
    const params =
      typeof (paramsMaybe as any)?.then === "function" ? await paramsMaybe : paramsMaybe;

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest, context: any) {
  try {
    const paramProjectId = await readProjectIdFromContext(context);
    const projectId = paramProjectId || getProjectIdFromUrl(req);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limitRaw = limitParam ? Number(limitParam) : 30;
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
      return NextResponse.json(
        { ok: false, error: `Failed to load authority history: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      projectId,
      limit,
      rows: data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}