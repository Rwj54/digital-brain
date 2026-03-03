"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

  created_at: string;
};

function formatDate(d: string) {
  return d; // captured_at is YYYY-MM-DD
}

export default function AuthoritySummaryCard({ projectId }: { projectId: string }) {
  const [row, setRow] = useState<AuthorityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const score = useMemo(() => (row ? Number(row.authority_score) : null), [row]);
  const tier = row?.authority_tier ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const { data, error } = await supabase
        .from("project_authority_scores")
        .select(
          "project_id,captured_at,version,authority_score,authority_tier,competitive_strength,structural_optimization,momentum_score,momentum_label,created_at"
        )
        .eq("project_id", projectId)
        .order("captured_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (error) {
        setErr(error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      const first = Array.isArray(data) && data.length > 0 ? (data[0] as AuthorityRow) : null;
      setRow(first);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="w-full rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-gray-900">Local Authority</div>
          <div className="text-xs text-gray-500">Nightly score ({row?.version ?? "—"})</div>
        </div>

        {row ? (
          <div className="rounded-full border px-3 py-1 text-xs font-medium text-gray-900">
            {tier}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500">Loading authority…</div>
        ) : err ? (
          <div className="text-sm text-red-600">Error: {err}</div>
        ) : !row ? (
          <div className="text-sm text-gray-500">
            No authority score yet. It will appear after the next nightly run.
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold leading-none text-gray-900">
                {score?.toFixed(1)}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Captured: {formatDate(row.captured_at)}
              </div>
            </div>

            <div className="min-w-[160px] rounded-xl bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Momentum</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900">{row.momentum_label}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {Number(row.momentum_score).toFixed(1)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white p-2">
                  <div className="text-[11px] text-gray-500">Competitive</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {Number(row.competitive_strength).toFixed(1)}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <div className="text-[11px] text-gray-500">Structural</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {Number(row.structural_optimization).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}