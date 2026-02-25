import { NextResponse } from "next/server";
import "server-only";

export async function GET() {
  const url = process.env.SUPABASE_URL ?? "https://snssnggirshxxbdyrrde.supabase.co";
  // show only the host so you can match it to the dashboard without exposing keys
  let host: string | null = null;
  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = null;
  }

  return NextResponse.json({
    ok: true,
    supabase_url_host: host,
    has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}