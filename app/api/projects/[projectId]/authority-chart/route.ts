import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getProjectIdFromUrl(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("projects");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return "";
}

async function readProjectIdFromContext(context: any): Promise<string> {
  const paramsMaybe = context?.params;
  if (!paramsMaybe) return "";

  try {
    const params =
      typeof paramsMaybe?.then === "function"
        ? await paramsMaybe
        : paramsMaybe;

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

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("project_authority_scores")
      .select("captured_at,authority_score,momentum_score")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const series =
      data?.map((row: any) => ({
        date: row.captured_at,
        authority: row.authority_score,
        momentum: row.momentum_score,
      })) ?? [];

    return NextResponse.json({
      ok: true,
      projectId,
      series,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}