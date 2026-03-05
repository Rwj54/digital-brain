import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthorityChart } from "@/lib/domain/authority/getAuthorityChart";

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
      typeof (paramsMaybe as any)?.then === "function"
        ? await paramsMaybe
        : paramsMaybe;

    const projectId = params?.projectId;
    return typeof projectId === "string" ? projectId.trim() : "";
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest, context: any) {
  const paramProjectId = await readProjectIdFromContext(context);
  const projectId = paramProjectId || getProjectIdFromUrl(req);

  const result = await getAuthorityChart({ projectId });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    series: result.series,
  });
}