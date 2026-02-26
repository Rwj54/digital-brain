"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runDiscovery() {
    try {
      setBusy(true);
      setStatus("Running discovery…");
      setResult(null);

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

      setResult(json.result);
      setStatus(
        `Success: found ${json.result.found}, upserted ${json.result.upserted}, cost $${Number(
          json.result.costUsd ?? 0
        ).toFixed(4)}`
      );
    } catch (e: any) {
      setStatus(`Failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Competitors</h1>
      <p className="text-sm text-gray-600 mt-1">
        Manual discovery run for this project (Google Maps via DataForSEO).
      </p>

      <div className="mt-4">
        <button
          onClick={runDiscovery}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
        >
          {busy ? "Running…" : "Run discovery"}
        </button>
      </div>

      {status && (
        <div className="mt-4 p-3 rounded-md border">
          <div className="text-sm whitespace-pre-wrap">{status}</div>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 rounded-md border">
          <div className="text-sm font-medium">Result</div>
          <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}