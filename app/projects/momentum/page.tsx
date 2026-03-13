"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type MomentumRow = {
  id: string;
  project_id: string;
  captured_at: string;
  version: string | null;
  authority_score: number | null;
  authority_tier: string | null;
  competitive_strength: number | null;
  structural_optimization: number | null;
  momentum_score: number | null;
  momentum_label: string | null;
  inputs: Record<string, unknown> | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  business_name: string | null;
  target_metro: string | null;
  primary_category: string | null;
};

type ChartPoint = {
  date: string;
  authority: number | null;
  momentum: number | null;
};

type AuthorityChartApiOk = {
  ok: true;
  projectId: string;
  series: ChartPoint[];
};

type AuthorityChartApiErr = {
  ok: false;
  error: string;
};

type AuthorityChartApiResponse = AuthorityChartApiOk | AuthorityChartApiErr;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function formatScore(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getMomentumTone(score: number | null) {
  if (score === null) return "text-zinc-500";
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-green-600";
  if (score <= 20) return "text-red-600";
  if (score <= 35) return "text-amber-600";
  return "text-zinc-900";
}

function getBarWidth(value: number | null, min: number, max: number) {
  if (value === null) return 0;
  if (max <= min) return 100;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, pct));
}

function isAuthorityChartApiOk(value: unknown): value is AuthorityChartApiOk {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.ok === true && typeof record.projectId === "string" && Array.isArray(record.series);
}

export default function MomentumOverviewPage() {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [latest, setLatest] = useState<MomentumRow | null>(null);
  const [history, setHistory] = useState<MomentumRow[]>([]);
  const [chartSeries, setChartSeries] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const projectId = useMemo(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const projectsIndex = parts.indexOf("projects");
    return projectsIndex >= 0 ? parts[projectsIndex + 1] ?? "" : "";
  }, []);

  async function loadPage() {
    setLoading(true);
    setStatus(null);

    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, business_name, target_metro, primary_category")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) {
        throw new Error(projectError.message);
      }

      setProject((projectData as ProjectRow | null) ?? null);

      const { data: momentumData, error: momentumError } = await supabase
        .from("project_authority_scores")
        .select(
          "id, project_id, captured_at, version, authority_score, authority_tier, competitive_strength, structural_optimization, momentum_score, momentum_label, inputs, created_at"
        )
        .eq("project_id", projectId)
        .order("captured_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (momentumError) {
        throw new Error(momentumError.message);
      }

      const rows = (momentumData ?? []) as MomentumRow[];
      setHistory(rows);
      setLatest(rows[0] ?? null);

      const response = await fetch(`/api/projects/${projectId}/authority-chart`, {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      const json = (await response.json()) as AuthorityChartApiResponse;

      if (!response.ok) {
        throw new Error(json && "error" in json ? json.error : "Failed to load authority chart.");
      }

      if (!isAuthorityChartApiOk(json)) {
        throw new Error("Authority chart response was malformed.");
      }

      setChartSeries(json.series);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const momentumComponents = useMemo(() => {
    const inputsRecord = asRecord(latest?.inputs);
    const momentumRecord = asRecord(inputsRecord?.momentum);
    const componentsRecord = asRecord(momentumRecord?.components);
    return componentsRecord;
  }, [latest]);

  const execution = asNumber(momentumComponents?.execution);
  const authorityDelta = asNumber(momentumComponents?.authorityDelta);
  const gapShrinkRatio = asNumber(momentumComponents?.gapShrinkRatio);
  const marketPressure = asNumber(momentumComponents?.marketPressure);

  const validAuthorityPoints = useMemo(
    () => chartSeries.map((point) => point.authority).filter((v): v is number => v !== null),
    [chartSeries]
  );

  const validMomentumPoints = useMemo(
    () => chartSeries.map((point) => point.momentum).filter((v): v is number => v !== null),
    [chartSeries]
  );

  const authorityMin = validAuthorityPoints.length ? Math.min(...validAuthorityPoints) : 0;
  const authorityMax = validAuthorityPoints.length ? Math.max(...validAuthorityPoints) : 0;
  const momentumMin = validMomentumPoints.length ? Math.min(...validMomentumPoints) : 0;
  const momentumMax = validMomentumPoints.length ? Math.max(...validMomentumPoints) : 0;

  if (loading) {
    return <div className="p-6 text-sm text-zinc-600">Loading momentum…</div>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-zinc-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Digital Brain</div>
            <h1 className="mt-2 text-3xl font-black">Momentum</h1>
            <div className="mt-2 text-sm text-zinc-600">
              {(project?.business_name ?? "Project") +
                (project?.primary_category ? ` • ${project.primary_category}` : "") +
                (project?.target_metro ? ` • ${project.target_metro}` : "")}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50"
            >
              Authority
            </Link>
            <Link
              href={`/projects/${projectId}/competitors`}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold hover:bg-zinc-50"
            >
              Competitors
            </Link>
            <button
              onClick={() => void loadPage()}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        {status ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{status}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Latest Momentum</div>
            <div className={`mt-3 text-4xl font-black ${getMomentumTone(latest?.momentum_score ?? null)}`}>
              {formatScore(latest?.momentum_score ?? null)}
            </div>
            <div className="mt-2 text-sm text-zinc-600">{latest?.momentum_label ?? "—"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Authority Score</div>
            <div className="mt-3 text-4xl font-black">{formatScore(latest?.authority_score ?? null)}</div>
            <div className="mt-2 text-sm text-zinc-600">{latest?.authority_tier ?? "—"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Captured</div>
            <div className="mt-3 text-lg font-black">{latest?.captured_at ?? "—"}</div>
            <div className="mt-2 text-sm text-zinc-600">Version {latest?.version ?? "—"}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">History Rows</div>
            <div className="mt-3 text-4xl font-black">{history.length}</div>
            <div className="mt-2 text-sm text-zinc-600">Nightly records saved</div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Momentum Drivers</h2>
          <p className="mt-1 text-sm text-zinc-600">Current component inputs used by the momentum model.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Execution</div>
              <div className="mt-2 text-2xl font-black">{formatScore(execution)}</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Authority Delta</div>
              <div className="mt-2 text-2xl font-black">{formatScore(authorityDelta)}</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Gap Shrink Ratio</div>
              <div className="mt-2 text-2xl font-black">{formatScore(gapShrinkRatio)}</div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">Market Pressure</div>
              <div className="mt-2 text-2xl font-black">{formatScore(marketPressure)}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Authority Trend</h2>
          <p className="mt-1 text-sm text-zinc-600">Daily chart history from the authority chart route.</p>

          {!chartSeries.length ? (
            <div className="mt-4 text-sm text-zinc-600">No trend history available yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {chartSeries
                .slice()
                .reverse()
                .map((point) => {
                  const authorityWidth = getBarWidth(point.authority, authorityMin, authorityMax);
                  const momentumWidth = getBarWidth(point.momentum, momentumMin, momentumMax);

                  return (
                    <div key={point.date} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-black">{point.date}</div>
                        <div className="text-xs text-zinc-600">
                          Authority {formatScore(point.authority)} • Momentum {formatScore(point.momentum)}
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                            <span>Authority</span>
                            <span>{Math.round(authorityWidth)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-zinc-900" style={{ width: `${authorityWidth}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                            <span>Momentum</span>
                            <span>{Math.round(momentumWidth)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                            <div className="h-full rounded-full bg-zinc-900" style={{ width: `${momentumWidth}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Raw Inputs</h2>
          <p className="mt-1 text-sm text-zinc-600">Inspector view for validating the momentum pipeline.</p>

          <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-800">
            {formatJson(latest?.inputs ?? null)}
          </pre>
        </section>
      </div>
    </main>
  );
}