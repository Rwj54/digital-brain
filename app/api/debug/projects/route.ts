import { NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // Select ONLY the columns we know are very likely to exist:
  // id, client_id are almost certainly present.
  // We won't order by created_at or select name to avoid column errors.
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  // Return only a small subset in response to keep it readable.
  const projects = (data ?? []).map((p: any) => ({
    id: p.id,
    client_id: p.client_id ?? null,
    // include these if they exist
    maps_keyword: p.maps_keyword ?? null,
    maps_location_code: p.maps_location_code ?? null,
    // include a couple other common fields if present
    title: p.title ?? null,
    created_at: p.created_at ?? null,
  }));

  return NextResponse.json({ ok: true, count: projects.length, projects });
}