"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CompetitorRow = {
  id: string;
  project_id: string;
  name: string | null;
  competitor_name: string | null;
  competitor_domain: string;
  domain: string | null;
  rating: number | null;
  total_reviews: number | null;
  last_seen_at: string | null;
  source: string | null;
  place_id: string | null;
};

export default function ProjectCompetitorsPage() {
  const params = useParams();

  const projectId = useMemo(() => {
    const raw = (params as any)?.projectId;

    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) return raw[0].trim();

    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("projects");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }

    return "";
  }, [params]);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<CompetitorRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  async function loadCompetitors() {
    if (!projectId) return;

    setLoadingList(true);
    setListError(null);

    const { data, error } = await supabase
      .from("gbp_competitor_metrics")
      .select(
        "id, project_id, name, competitor_name, competitor_domain, domain, rating, total_reviews, last_seen_at, source, place_id"
      )
      .eq("project_id", projectId)
      .order("total_reviews", { ascending: false, nullsFirst: false });

    if (error) {
      setListError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as CompetitorRow[]);
    }

    setLoadingList(false);
  }

  useEffect(() => {
    loadCompetitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function runDiscovery() {
    try {
      setBusy(true);
      setStatus("Running discovery…");

      if (!projectId) {
        setStatus("Failed: projectId is empty on the page.");
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/discover-competitors`, {
        method: "POST",
      });

      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          (text ? text.slice(0, 400) : "Empty response body");
        setStatus(`Failed: ${msg}`);
        return;
      }

      if (!json || !json.ok) {
        const msg =
          (json && (json.error || json.message)) ||
          (text ? text.slice(0, 400) : "Empty/invalid JSON response");
        setStatus(`Failed: ${msg}`);
        return;
      }

      setStatus(
        `Success: found ${json.result.found}, upserted ${json.result.upserted}, cost $${Number(
          json.result.costUsd ?? 0
        ).toFixed(4)}`
      );

      await loadCompetitors();
    } catch (e: any) {
      setStatus(`Failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <p className="text-sm text-gray-600 mt-1">
            Google Maps competitor discovery (DataForSEO). Sorted by total reviews.
          </p>
        </div>

        <button
          onClick={runDiscovery}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? "Running…" : "Run discovery"}
        </button>
      </div>

      {status && (
        <div className="mt-4 p-3 rounded-md border">
          <div className="text-sm whitespace-pre-wrap">{status}</div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Discovered competitors</h2>
          <button
            onClick={loadCompetitors}
            disabled={loadingList}
            className="text-sm underline disabled:opacity-50"
          >
            {loadingList ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {listError && (
          <div className="mt-3 p-3 rounded-md border">
            <div className="text-sm text-red-600">Failed to load: {listError}</div>
          </div>
        )}

        {!listError && rows.length === 0 && (
          <div className="mt-3 p-3 rounded-md border">
            <div className="text-sm text-gray-700">
              No competitors yet. Click <strong>Run discovery</strong>.
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-3 overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3">Reviews</th>
                  <th className="text-right p-3">Rating</th>
                  <th className="text-left p-3">Domain</th>
                  <th className="text-left p-3">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const displayName = (r.name ?? r.competitor_name ?? "Unknown").trim();
                  const displayDomain = (r.domain ?? r.competitor_domain ?? "").trim();
                  const reviews = typeof r.total_reviews === "number" ? r.total_reviews : null;
                  const rating = typeof r.rating === "number" ? r.rating : null;

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{displayName}</div>
                        {r.place_id && (
                          <div className="text-xs text-gray-500">place_id: {r.place_id}</div>
                        )}
                      </td>
                      <td className="p-3 text-right">{reviews ?? "—"}</td>
                      <td className="p-3 text-right">{rating ?? "—"}</td>
                      <td className="p-3">
                        <div className="truncate max-w-[240px]">{displayDomain || "—"}</div>
                      </td>
                      <td className="p-3">
                        {r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}