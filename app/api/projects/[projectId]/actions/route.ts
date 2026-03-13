import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteParams = {
  projectId?: string;
};

type RouteContext = {
  params?: RouteParams | Promise<RouteParams>;
};

function getProjectIdFromUrl(req: Request): string {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("projects");

  if (idx >= 0 && parts[idx + 1]) {
    return parts[idx + 1];
  }

  return "";
}

async function readProjectIdFromContext(context: RouteContext): Promise<string> {
  const paramsMaybe = context?.params;

  if (!paramsMaybe) {
    return "";
  }

  try {
    const params =
      typeof (paramsMaybe as Promise<RouteParams>)?.then === "function"
        ? await (paramsMaybe as Promise<RouteParams>)
        : (paramsMaybe as RouteParams);

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown error";
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const paramProjectId = await readProjectIdFromContext(context);
    const projectId = paramProjectId || getProjectIdFromUrl(req);

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const { data, error } = await admin
      .from("project_actions")
      .select("id, project_id, captured_at, version, actions_json, created_at")
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Failed to load project actions: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      projectId,
      actionsRow: data ?? null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}