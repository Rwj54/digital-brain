// app/api/cron/nightly-authority-score/route.ts

import { NextResponse } from "next/server";
import { runNightlyAuthorityScorer } from "@/lib/authority/nightlyAuthorityScorer";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown error";
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Missing env: CRON_SECRET" },
      { status: 500 }
    );
  }

  if (!token || token !== expected) {
    return unauthorized();
  }

  try {
    const summary = await runNightlyAuthorityScorer();
    return NextResponse.json({ ok: true, summary }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}