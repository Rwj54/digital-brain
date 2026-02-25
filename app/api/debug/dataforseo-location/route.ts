import { NextResponse } from "next/server";
import "server-only";
import { DataForSeoClient } from "@/lib/providers/dataforseo/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "Omaha").toLowerCase();

  const client = new DataForSeoClient();

  // Free endpoint (smaller if you use a country)
  const res = await client.get<any>("/v3/serp/google/locations/US");

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.message, raw: res.raw }, { status: 500 });
  }

  const list = res.data?.tasks?.[0]?.result ?? res.data?.result ?? [];
  const results = Array.isArray(list)
    ? list
        .filter((x: any) => (x?.location_name ?? "").toLowerCase().includes(q))
        .slice(0, 25)
        .map((x: any) => ({
          location_code: x?.location_code ?? null,
          location_name: x?.location_name ?? null,
          country: x?.country ?? null,
        }))
    : [];

  return NextResponse.json({ ok: true, q, count: results.length, results });
}