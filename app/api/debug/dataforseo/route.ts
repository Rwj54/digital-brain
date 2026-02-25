// app/api/debug/dataforseo/route.ts
import { NextResponse } from "next/server";
import "server-only";
import { DataForSeoClient } from "@/lib/providers/dataforseo/client";

export async function GET() {
  // 1) Confirm env vars exist (client constructor will throw if missing)
  const client = new DataForSeoClient();

  // 2) Replace this with a real endpoint in the next step (Maps task post or locations)
  // For now, we just return "configured" without making a paid call.
  // This avoids burning budget before we finalize endpoint wiring.
  return NextResponse.json({
    ok: true,
    message: "DataForSEO client constructed successfully (env vars present).",
  });
}