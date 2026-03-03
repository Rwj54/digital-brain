"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthoritySummaryCard from "@/components/authority/AuthoritySummaryCard";

type AuthorityRow = {
  project_id: string;
  captured_at: string; // date
  version: string;

  momentum_score: number;
  momentum_label: string;

  authority_score: number;
  authority_tier: string;

  inputs: any;
  created_at: string;
};

function formatJson(value: any) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asNumber(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export default function ProjectMomentumPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [row, setRow] = useState<AuthorityRow | null>(null);

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function loadLatestAuthority() {
    const { data, error } = await supabase
      .from("project_authority_scores")
      .select(
        "project_id,captured_at,version,momentum_score,momentum_label,authority_score,authority_tier,inputs,created_at"
      )
      .eq("project_id", projectId)
      .order("captured_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    const first = Array.isArray(data) && data.length > 0 ? (data[0] as AuthorityRow) : null;
    setRow(first);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStatus(null);

      const ok = await requireAuth();
      if (!ok) {
        setLoading(false);
        return;
      }

      try {
        await loadLatestAuthority();
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load momentum");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const components = useMemo(() => {
    const c = row?.inputs?.momentum?.components;
    if (!c || typeof c !== "object") return null;
    const entries = Object.entries(c).map(([k, v]) => [k, v] as const);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [row]);

  const execution = asNumber(row?.inputs?.momentum?.components?.execution);
  const authorityDelta = asNumber(row?.inputs?.momentum?.components?.authorityDelta);
  const gapShrinkRatio = asNumber(row?.inputs?.momentum?.components?.gapShrinkRatio);
  const marketPressure = asNumber(row?.inputs?.momentum?.components?.marketPressure);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Digital Brain</div>
            <h1 className="text-lg md:text-xl font-semibold truncate">Momentum</h1>
            <div className="text-xs text-gray-500 mt-0.5 truncate">Project: {projectId}</div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => router.push(`/projects/${projectId}/authority`)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
              type="button"
            >
              Authority
            </button>

            <button
              onClick={() => router.push(`/projects/${projectId}/momentum`)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
              type="button"
            >
              Momentum
            </button>

            <button
              onClick={() => router.push(`/projects/${projectId}/competitors`)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
              type="button"
            >
              Back
            </button>

            <button
              onClick={async () => {
                setStatus("Refreshing…");
                try {
                  await loadLatestAuthority();
                  setStatus(null);
                } catch (e: any) {
                  setStatus(e?.message ?? "Refresh failed");
                }
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-black text-white"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {status ? (
        <div className="mx-auto max-w-7xl px-4 md:px-6 mt-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {status}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 md:px-6 mt-4 pb-10 space-y-4">
        <AuthoritySummaryCard projectId={projectId} />

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Momentum details</div>
          <div className="text-xs text-gray-500 mt-1">
            Leading indicator. Moves weekly and reflects market-relative acceleration.
          </div>

          {!row ? (
            <div className="mt-3 text-sm text-gray-500">No momentum row found yet.</div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-4xl font-semibold">{Number(row.momentum_score).toFixed(1)}</div>
                  <div className="text-xs text-gray-500">
                    Label: {row.momentum_label} • Captured: {row.captured_at} • Version: {row.version}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Authority: {Number(row.authority_score).toFixed(1)} ({row.authority_tier})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Execution</div>
                  <div className="text-lg font-semibold">{execution == null ? "—" : execution.toFixed(3)}</div>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Authority Δ</div>
                  <div className="text-lg font-semibold">{authorityDelta == null ? "—" : authorityDelta.toFixed(1)}</div>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Gap shrink</div>
                  <div className="text-lg font-semibold">
                    {gapShrinkRatio == null ? "—" : gapShrinkRatio.toFixed(3)}
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Market pressure</div>
                  <div className="text-lg font-semibold">
                    {marketPressure == null ? "—" : marketPressure.toFixed(3)}
                  </div>
                </div>
              </div>

              {components ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Raw momentum components</div>
                  <div className="mt-2 space-y-2">
                    {components.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span>{k}</span>
                        <span className="font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Inputs JSON</div>
                <pre className="mt-2 max-h-[420px] overflow-auto rounded-lg bg-white border border-gray-200 p-3 text-[11px] text-gray-800">
                  {formatJson(row.inputs)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}