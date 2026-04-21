import { NextRequest, NextResponse } from "next/server";
import {
  runProjectOnboarding,
  type SeedRankKeywordInput,
} from "@/lib/onboarding/runProjectOnboarding";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

type RequestBody = {
  category?: string;
  metro?: string;
  seedKeywords?: Array<{
    keyword?: string;
    metro?: string;
    priority?: number;
    isActive?: boolean;
  }>;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSeedKeywords(
  input: RequestBody["seedKeywords"]
): SeedRankKeywordInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalizedRows: Array<SeedRankKeywordInput | null> = input.map((row) => {
    const keyword = typeof row?.keyword === "string" ? row.keyword.trim() : "";
    const metro = typeof row?.metro === "string" ? row.metro.trim() : "";

    if (!keyword || !metro) {
      return null;
    }

    return {
      keyword,
      metro,
      priority:
        typeof row?.priority === "number" && Number.isFinite(row.priority)
          ? row.priority
          : undefined,
      isActive:
        typeof row?.isActive === "boolean" ? row.isActive : undefined,
    };
  });

  return normalizedRows.filter(
    (row): row is SeedRankKeywordInput => row !== null
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as RequestBody;

    const result = await runProjectOnboarding({
      projectId,
      mode: "manual",
      userAgent: request.headers.get("user-agent"),
      confirmedCategory: normalizeOptionalString(body.category),
      confirmedMetro: normalizeOptionalString(body.metro),
      seedKeywords: normalizeSeedKeywords(body.seedKeywords),
    });

    return NextResponse.json(result, {
      status: result.ok ? 200 : result.status,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding route error.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}