"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthoritySummaryCard from "@/components/authority/AuthoritySummaryCard";

type AuthorityRow = {
  project_id: string;
  captured_at: string; // date
  version: string;

  authority_score: number;
  authority_tier: string;

  competitive_strength: number;
  structural_optimization: number;

  momentum_score: number;
  momentum_label: string;

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

export default function ProjectAuthorityPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
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
        "project_id,captured_at,version,authority_score,authority_tier,competitive_strength,structural_optimization,momentum_score,momentum_label,inputs,created_at"
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

      setAuthed(true);

      try {
        await loadLatestAuthority();
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load authority");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Digital Brain</div>
            <h1 className="text-lg md:text-xl font-semibold truncate">Authority</h1>
            <div className="text-xs text-gray-500 mt-0.5 truncate">Project: {projectId}</div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
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
              className="rounded-lg px-4 py-2 text-sm font-medium bg-black text-white disabled:opacity-60"
              type="button"
              disabled={!authed}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      {status ? (
        <div className="mx-auto max-w-7xl px-4 md:px-6 mt-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {status}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 md:px-6 mt-4 pb-10 space-y-4">
        {/* North star card */}
        <AuthoritySummaryCard projectId={projectId} />

        {/* Read-only inspection */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Authority details</div>
          <div className="text-xs text-gray-500 mt-1">
            Read-only inspection for validating the nightly engine.
          </div>

          {!row ? (
            <div className="mt-3 text-sm text-gray-500">No authority row found yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Captured</div>
                <div className="text-sm font-semibold mt-1">{row.captured_at}</div>
                <div className="text-xs text-gray-500 mt-1">Version: {row.version}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Tier</div>
                <div className="text-sm font-semibold mt-1">{row.authority_tier}</div>
                <div className="text-xs text-gray-500 mt-1">Score: {Number(row.authority_score).toFixed(1)}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Competitive Strength</div>
                <div className="text-sm font-semibold mt-1">{Number(row.competitive_strength).toFixed(1)}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Structural Optimization</div>
                <div className="text-sm font-semibold mt-1">{Number(row.structural_optimization).toFixed(1)}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 md:col-span-2">
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