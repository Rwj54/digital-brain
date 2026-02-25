import { NextResponse } from "next/server";
import "server-only";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host: string | null = null;

  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = null;
  }

  return NextResponse.json({
    ok: true,
    next_public_supabase_url_host: host,
    has_next_public_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}