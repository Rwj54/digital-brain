import { NextResponse } from "next/server";
import { dataForSeoMapsLiveAdvanced } from "@/lib/providers/dataforseo/maps";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keyword = url.searchParams.get("keyword") ?? "landscaper Council Bluffs, IA";
    const locationName = url.searchParams.get("location") ?? "Council Bluffs, IA";

    const result = await dataForSeoMapsLiveAdvanced({
      keyword,
      locationName,
      depth: 5,
      device: "desktop",
    });

    return NextResponse.json({
      ok: true,
      keyword,
      locationName,
      cost: result.cost,
      checkUrl: result.checkUrl,
      itemsCount: result.items.length,
      sample: result.items.slice(0, 3),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}