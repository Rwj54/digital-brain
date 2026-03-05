import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthorityHistory } from "@/lib/domain/authority/getAuthorityHistory";

export const runtime = "nodejs";

function getProjectIdFromUrl(req: Request): string {
  // Expected path: /api/projects/<projectId>/authority-history
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
      typeof (paramsMaybe as any)?.then === "function" ? await paramsMaybe : paramsMaybe;

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest, context: any) {
  const paramProjectId = await readProjectIdFromContext(context);
  const projectId = paramProjectId || getProjectIdFromUrl(req);

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limitRaw = limitParam ? Number(limitParam) : 30;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 30;

  const result = await getAuthorityHistory({ projectId, limit });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    limit: result.limit,
    rows: result.rows,
  });
}