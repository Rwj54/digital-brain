import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { discoverCompetitorsForProject } from "@/lib/domain/competitors/discoverCompetitorsForProject";

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

export async function POST(req: NextRequest, context: RouteContext) {
  const paramProjectId = await readProjectIdFromContext(context);
  const projectId = paramProjectId || getProjectIdFromUrl(req);

  const result = await discoverCompetitorsForProject({
    projectId,
    mode: "manual",
    userAgent: req.headers.get("user-agent") ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, jobId: result.jobId, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    jobId: result.jobId,
    result: result.result,
  });
}