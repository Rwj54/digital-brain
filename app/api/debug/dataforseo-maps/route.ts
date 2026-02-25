import { NextResponse } from "next/server";
import "server-only";
import { DataForSeoMapsProvider } from "@/lib/providers/dataforseo/maps";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const keyword = searchParams.get("keyword") ?? "flower shop Omaha NE";

  const location_code_param = searchParams.get("location_code");
  const location_code = location_code_param ? Number(location_code_param) : undefined;

  const provider = new DataForSeoMapsProvider();

  // ✅ DEFINE results
  const results = await provider.search({
    keyword,
    location_code,
    language_code: "en",
    depth: 20,
  });

  return NextResponse.json({
    ok: true,
    keyword,
    location_code: location_code ?? null,
    count: results.length,
    results: results.map((r) => ({
      name: r.name,
      domain: r.domain ?? null,
      rating: r.rating ?? null,
      total_reviews: r.total_reviews ?? null,
      place_id: r.place_id,
    })),
  });
}