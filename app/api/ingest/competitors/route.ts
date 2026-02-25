import { NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { DataForSeoMapsProvider } from "@/lib/providers/dataforseo/maps";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const project_id = body?.project_id as string | undefined;

  if (!project_id) {
    return NextResponse.json({ ok: false, error: "project_id required" }, { status: 400 });
  }

  // 1) Load project config
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, maps_keyword, maps_location_code")
    .eq("id", project_id)
    .single();

  if (projectErr || !project) {
    return NextResponse.json(
      { ok: false, error: "Project not found", detail: projectErr },
      { status: 404 }
    );
  }

  if (!project.maps_keyword || !project.maps_location_code) {
    return NextResponse.json(
      { ok: false, error: "Project missing maps_keyword or maps_location_code" },
      { status: 400 }
    );
  }

  // 2) Call DataForSEO
  const provider = new DataForSeoMapsProvider();
  const places = await provider.search({
    keyword: project.maps_keyword,
    location_code: Number(project.maps_location_code),
    language_code: "en",
    depth: 20,
  });

  const nowIso = new Date().toISOString();

  // 3) Upsert competitors + collect ids
  const competitorRows: Array<{
    competitor_id: string;
    rating: number | null;
    total_reviews: number | null;
  }> = [];

  for (const p of places) {
    const { data: comp, error: upsertErr } = await supabase
      .from("gbp_competitors")
      .upsert(
        {
          project_id,
          place_id: p.place_id,
          name: p.name,
          domain: p.domain ?? null,
          source: "maps",
          last_seen_at: nowIso,
          raw: p.raw ?? null,
        },
        { onConflict: "project_id,place_id" }
      )
      .select("id")
      .single();

    if (upsertErr || !comp) {
      return NextResponse.json(
        { ok: false, error: "Upsert competitor failed", detail: upsertErr },
        { status: 500 }
      );
    }

    competitorRows.push({
      competitor_id: comp.id,
      rating: p.rating ?? null,
      total_reviews: p.total_reviews ?? null,
    });
  }

  // 4) Insert metric snapshots
  const metricsRows = competitorRows.map((c) => ({
    competitor_id: c.competitor_id,
    captured_at: nowIso,
    rating: c.rating,
    total_reviews: c.total_reviews,
    source: "maps",
  }));

  const { error: metricsErr } = await supabase
    .from("gbp_competitor_metrics")
    .insert(metricsRows);

  if (metricsErr) {
    return NextResponse.json(
      { ok: false, error: "Insert metrics failed", detail: metricsErr },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    project_id,
    discovered: places.length,
    inserted_metrics: metricsRows.length,
  });
}