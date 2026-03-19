import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type ProjectRow = {
  site_url: string;
  target_domain: string | null;
  target_brand_name: string | null;
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleSupabase() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

function buildWebsiteReadinessLabel(input: {
  hasSiteUrl: boolean;
  hasTargetDomain: boolean;
  hasBrandName: boolean;
}): string {
  const score =
    (input.hasSiteUrl ? 1 : 0) +
    (input.hasTargetDomain ? 1 : 0) +
    (input.hasBrandName ? 1 : 0);

  if (score === 3) {
    return "Good website identity setup";
  }

  if (score === 2) {
    return "Moderate website identity setup";
  }

  if (score === 1) {
    return "Weak website identity setup";
  }

  return "Very limited website identity setup";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { projectId } = await context.params;

    if (!projectId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing projectId.",
        },
        { status: 400 },
      );
    }

    const supabase = getServiceRoleSupabase();

    const { data, error } = await supabase
      .from("projects")
      .select("site_url, target_domain, target_brand_name")
      .eq("id", projectId)
      .single<ProjectRow>();

    if (error) {
      throw new Error(`Failed to load project website summary: ${error.message}`);
    }

    const hasSiteUrl = Boolean(data.site_url);
    const hasTargetDomain = Boolean(data.target_domain);
    const hasBrandName = Boolean(data.target_brand_name);

    return NextResponse.json({
      ok: true,
      projectId,
      summary: {
        siteUrl: data.site_url,
        targetDomain: data.target_domain,
        targetBrandName: data.target_brand_name,
        hasSiteUrl,
        hasTargetDomain,
        hasBrandName,
        websiteReadinessLabel: buildWebsiteReadinessLabel({
          hasSiteUrl,
          hasTargetDomain,
          hasBrandName,
        }),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load owner website summary.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
