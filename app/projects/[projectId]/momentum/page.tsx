"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthoritySummaryCard from "@/components/authority/AuthoritySummaryCard";
import ProjectInsightsNav from "@/components/projects/ProjectInsightsNav";

type MomentumInputs = {
  momentum?: {
    components?: Record<string, unknown>;
  };
};

type AuthorityRow = {
  project_id: string;
  captured_at: string;
  version: string;
  momentum_score: number;
  momentum_label: string;
  authority_score: number;
  authority_tier: string;
  inputs: MomentumInputs | null;
  created_at: string;
};

type AuthorityChartPoint = {
  date: string;
  authority: number;
  momentum: number;
};

type AuthorityChartApiSuccess = {
  ok: true;
  series: unknown[];
};

type AuthorityChartApiError = {
  ok?: false;
  error?: string;
};

type AuthorityChartApiResponse = AuthorityChartApiSuccess | AuthorityChartApiError | null;

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function fmt1(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function isChartApiSuccess(value: AuthorityChartApiResponse): value is AuthorityChartApiSuccess {
  return !!value && value.ok === true && Array.isArray(value.series);
}

function normalizeChartPoint(point: unknown): AuthorityChartPoint | null {
  if (!point || typeof point !== "object") return null;

  const record = point as Record<string, unknown>;
  const date = typeof record.date === "string" ? record.date : "";
  const authority = asNumber(record.authority);
  const momentum = asNumber(record.momentum);

  if (!date || authority === null || momentum === null) return null;

  return {
    date,
    authority,
    momentum,
  };
}

export default function ProjectMomentumPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [row, setRow] = useState<AuthorityRow | null>(null);

  const [trendLoading, setTrendLoading] = useState(false);
  const [trendStatus, setTrendStatus] = useState<string | null>(null);
  const [trendSeries, setTrendSeries] = useState<AuthorityChartPoint[]>([]);

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

  async function loadAuthorityTrend() {
    setTrendLoading(true);
    setTrendStatus(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/authority-chart`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as AuthorityChartApiResponse;

      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "error" in json && typeof json.error === "string"
            ? json.error
            : `Trend request failed (${res.status})`;
        throw new Error(msg);
      }

      if (!isChartApiSuccess(json)) {
        throw new Error("Trend response was not in the expected format.");
      }

      const normalized = json.series
        .map((point) => normalizeChartPoint(point))
        .filter((point): point is AuthorityChartPoint => point !== null);

      setTrendSeries(normalized);
    } catch (e: unknown) {
      setTrendStatus(e instanceof Error ? e.message : "Failed to load authority trend");
      setTrendSeries([]);
    } finally {
      setTrendLoading(false);
    }
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
        await loadAuthorityTrend();
      } catch (e: unknown) {
        setStatus(e instanceof Error ? e.message : "Failed to load momentum");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const components = useMemo(() => {
    const rawComponents = row?.inputs?.momentum?.components;
    if (!rawComponents || typeof rawComponents !== "object") return null;

    const entries = Object.entries(rawComponents).map(([k, v]) => [k, v] as const);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [row]);

  const execution = asNumber(row?.inputs?.momentum?.components?.execution);
  const authorityDelta = asNumber(row?.inputs?.momentum?.components?.authorityDelta);
  const gapShrinkRatio = asNumber(row?.inputs?.momentum?.components?.gapShrinkRatio);
  const marketPressure = asNumber(row?.inputs?.momentum?.components?.marketPressure);

  const trendDeduped = useMemo(() => {
    const byDate = new Map<string, AuthorityChartPoint>();

    for (const p of trendSeries) {
      const existing = byDate.get(p.date);
      if (!existing) {
        byDate.set(p.date, p);
        continue;
      }

      if (p.momentum > existing.momentum) byDate.set(p.date, p);
      else if (p.momentum === existing.momentum && p.authority > existing.authority) byDate.set(p.date, p);
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [trendSeries]);

  const trendStats = useMemo(() => {
    if (!trendDeduped.length) return null;

    const authorityVals = trendDeduped.map((p) => p.authority);
    const momentumVals = trendDeduped.map((p) => p.momentum);

    const minA = Math.min(...authorityVals);
    const maxA = Math.max(...authorityVals);
    const minM = Math.min(...momentumVals);
    const maxM = Math.max(...momentumVals);

    const latest = trendDeduped[trendDeduped.length - 1];
    const prev = trendDeduped.length >= 2 ? trendDeduped[trendDeduped.length - 2] : null;

    const deltaA = prev ? latest.authority - prev.authority : null;
    const deltaM = prev ? latest.momentum - prev.momentum : null;

    return { minA, maxA, minM, maxM, latest, prev, deltaA, deltaM };
  }, [trendDeduped]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">Digital Brain</div>
            <h1 className="text-lg md:text-xl font-semibold truncate">Momentum</h1>
            <div className="text-xs text-gray-500 mt-0.5 truncate">Project: {projectId}</div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <ProjectInsightsNav projectId={projectId} />

            <button
              onClick={async () => {
                setStatus("Refreshing…");
                setTrendStatus(null);

                try {
                  await loadLatestAuthority();
                  await loadAuthorityTrend();
                  setStatus(null);
                } catch (e: unknown) {
                  setStatus(e instanceof Error ? e.message : "Refresh failed");
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{status}</div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 md:px-6 mt-4 pb-10 space-y-4">
        <AuthoritySummaryCard projectId={projectId} />

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Authority Trend (history)</div>
              <div className="text-xs text-gray-500 mt-1">
                Uses the nightly score history. Same-day duplicates are automatically deduped.
              </div>
            </div>

            <button
              onClick={loadAuthorityTrend}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black disabled:opacity-60"
              type="button"
              disabled={trendLoading}
            >
              {trendLoading ? "Refreshing…" : "Refresh trend"}
            </button>
          </div>

          {trendStatus ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {trendStatus}
            </div>
          ) : null}

          {!trendDeduped.length ? (
            <div className="mt-3 text-sm text-gray-500">
              No history yet. This will grow nightly as the scorer runs.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {trendStats ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Latest authority</div>
                    <div className="text-lg font-semibold">{fmt1(trendStats.latest.authority)}</div>
                    <div className="text-xs text-gray-500">
                      Δ vs prior:{" "}
                      {trendStats.deltaA == null
                        ? "—"
                        : (trendStats.deltaA >= 0 ? "+" : "") + trendStats.deltaA.toFixed(1)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Latest momentum</div>
                    <div className="text-lg font-semibold">{fmt1(trendStats.latest.momentum)}</div>
                    <div className="text-xs text-gray-500">
                      Δ vs prior:{" "}
                      {trendStats.deltaM == null
                        ? "—"
                        : (trendStats.deltaM >= 0 ? "+" : "") + trendStats.deltaM.toFixed(1)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Authority range</div>
                    <div className="text-lg font-semibold">
                      {trendStats.minA.toFixed(1)}–{trendStats.maxA.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">{trendDeduped.length} days</div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Momentum range</div>
                    <div className="text-lg font-semibold">
                      {trendStats.minM.toFixed(1)}–{trendStats.maxM.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">updates weekly (behavior)</div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Daily points</div>

                <div className="mt-3 space-y-2">
                  {trendDeduped
                    .slice()
                    .reverse()
                    .slice(0, 30)
                    .map((p) => {
                      const minA = trendStats?.minA ?? p.authority;
                      const maxA = trendStats?.maxA ?? p.authority;
                      const rangeA = Math.max(0.0001, maxA - minA);
                      const wA = clamp01((p.authority - minA) / rangeA);

                      const minM = trendStats?.minM ?? p.momentum;
                      const maxM = trendStats?.maxM ?? p.momentum;
                      const rangeM = Math.max(0.0001, maxM - minM);
                      const wM = clamp01((p.momentum - minM) / rangeM);

                      return (
                        <div key={p.date} className="rounded-lg bg-white border border-gray-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-700 font-medium">{p.date}</div>
                            <div className="text-xs text-gray-700 tabular-nums">
                              Authority <span className="font-semibold">{p.authority.toFixed(1)}</span> • Momentum{" "}
                              <span className="font-semibold">{p.momentum.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="mt-2 space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>Authority</span>
                                <span>{(wA * 100).toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-2 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                                <div className="h-full bg-black" style={{ width: `${wA * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>Momentum</span>
                                <span>{(wM * 100).toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 h-2 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                                <div className="h-full bg-black" style={{ width: `${wM * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="mt-3 text-[11px] text-gray-500">
                  Note: Bars are normalized to the min/max in your available history (not a fixed 0–100 scale).
                </div>
              </div>
            </div>
          )}
        </div>

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
                  <div className="text-lg font-semibold">{gapShrinkRatio == null ? "—" : gapShrinkRatio.toFixed(3)}</div>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs text-gray-500">Market pressure</div>
                  <div className="text-lg font-semibold">{marketPressure == null ? "—" : marketPressure.toFixed(3)}</div>
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