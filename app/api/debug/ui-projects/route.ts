import { NextResponse } from "next/server";
import "server-only";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .limit(5);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count: data?.length ?? 0,
    sample: data ?? [],
  });
}