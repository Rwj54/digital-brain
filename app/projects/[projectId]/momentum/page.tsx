"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

type AuthorityChartApiResponse =
  | AuthorityChartApiSuccess
  | AuthorityChartApiError
  | null;

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (
    typeof v === "string" &&
    v.trim() !== "" &&
    Number.isFinite(Number(v))
  ) {
    return Number(v);
  }
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isChartApiSuccess(
  value: AuthorityChartApiResponse
): value is AuthorityChartApiSuccess {
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

function StatTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-400">
        {helper}
      </p>
    </div>
  );
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

    if (error) {
      throw new Error(error.message);
    }

    const first =
      Array.isArray(data) && data.length > 0 ? (data[0] as AuthorityRow) : null;

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
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof json.error === "string"
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
      setTrendStatus(
        e instanceof Error ? e.message : "Failed to load authority trend"
      );
      setTrendSeries([]);
    } finally {
      setTrendLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
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
        setStatus(e instanceof Error ? e.message : "Failed to load momentum page.");
      } finally {
        setLoading(false);
      }
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const components = useMemo(() => {
    const rawComponents = row?.inputs?.momentum?.components;

    if (!rawComponents || typeof rawComponents !== "object") {
      return null;
    }

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

    for (const point of trendSeries) {
      const existing = byDate.get(point.date);

      if (!existing) {
        byDate.set(point.date, point);
        continue;
      }

      if (point.momentum > existing.momentum) {
        byDate.set(point.date, point);
      } else if (
        point.momentum === existing.momentum &&
        point.authority > existing.authority
      ) {
        byDate.set(point.date, point);
      }
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
    const prev =
      trendDeduped.length >= 2 ? trendDeduped[trendDeduped.length - 2] : null;

    const deltaA = prev ? latest.authority - prev.authority : null;
    const deltaM = prev ? latest.momentum - prev.momentum : null;

    return {
      minA,
      maxA,
      minM,
      maxM,
      latest,
      prev,
      deltaA,
      deltaM,
    };
  }, [trendDeduped]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-neutral-700 dark:text-neutral-400">
            Loading momentum intelligence…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-10 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-500">
              Digital Brain
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-neutral-950 dark:text-white">
              Momentum Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-800 dark:text-neutral-400">
              This page shows whether the business is gaining traction or losing
              ground over time. Momentum is a leading signal that helps explain
              whether authority work is starting to turn into visible forward
              movement.
            </p>
            <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-500">
              Project: {projectId}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${projectId}/authority`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              Back to Authority
            </Link>

            <button
              type="button"
              onClick={async () => {
                setStatus("Refreshing momentum data…");
                setTrendStatus(null);

                try {
                  await loadLatestAuthority();
                  await loadAuthorityTrend();
                  setStatus("Momentum data refreshed.");
                } catch (e: unknown) {
                  setStatus(e instanceof Error ? e.message : "Refresh failed.");
                }
              }}
              disabled={trendLoading}
              className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {trendLoading ? "Refreshing…" : "Refresh Momentum"}
            </button>
          </div>
        </div>

        {status ? (
          <div className="rounded-2xl border border-neutral-300 bg-white p-4 text-sm text-neutral-800 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-300">
            {status}
          </div>
        ) : null}

        {trendStatus ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {trendStatus}
          </div>
        ) : null}

        {!row ? (
          <div className="rounded-2xl border border-neutral-300 bg-white p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
            No momentum row found yet. This page will populate after the next
            scoring run.
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Momentum score"
                value={fmt1(row.momentum_score)}
                helper={`Current label: ${row.momentum_label}`}
              />
              <StatTile
                label="Authority score"
                value={fmt1(row.authority_score)}
                helper={`Current tier: ${row.authority_tier}`}
              />
              <StatTile
                label="Captured"
                value={formatDate(row.captured_at)}
                helper={`Version: ${row.version}`}
              />
              <StatTile
                label="History points"
                value={String(trendDeduped.length)}
                helper="Same-day duplicates are automatically deduped."
              />
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                    Current footing
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                    What the latest momentum record says
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-700 dark:text-neutral-400">
                    These are the current inputs behind the momentum signal. The
                    goal is to show whether authority is improving, whether gaps
                    are shrinking, and how much market pressure still exists.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile
                    label="Execution"
                    value={execution == null ? "—" : execution.toFixed(3)}
                    helper="How strongly recent work appears to be carrying through."
                  />
                  <StatTile
                    label="Authority delta"
                    value={authorityDelta == null ? "—" : authorityDelta.toFixed(1)}
                    helper="Change in authority compared with the prior footing."
                  />
                  <StatTile
                    label="Gap shrink"
                    value={gapShrinkRatio == null ? "—" : gapShrinkRatio.toFixed(3)}
                    helper="Whether the business is closing distance against the market."
                  />
                  <StatTile
                    label="Market pressure"
                    value={marketPressure == null ? "—" : marketPressure.toFixed(3)}
                    helper="How much outside competitive movement is still pushing back."
                  />
                </div>

                {components ? (
                  <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                      Raw momentum components
                    </p>

                    <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                      {components.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4 py-3 text-sm"
                        >
                          <span className="text-neutral-700 dark:text-neutral-400">
                            {key}
                          </span>
                          <span className="font-medium text-neutral-950 dark:text-white">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <aside className="space-y-5">
                <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                    Plain-English read
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                    {row.momentum_label}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-700 dark:text-neutral-400">
                    Momentum is the “are we actually starting to move?” signal.
                    It does not replace authority. It helps show whether the work
                    is beginning to translate into real forward progress.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                    What this page is for
                  </p>

                  <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-700 dark:text-neutral-400">
                    <li className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />
                      <span>Shows whether traction is improving over time.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />
                      <span>
                        Helps explain whether authority gains are starting to turn
                        into movement.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />
                      <span>
                        Helps separate real progress from noisy day-to-day market
                        movement.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                  <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                    Inputs JSON
                  </p>
                  <pre className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-[11px] text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                    {formatJson(row.inputs)}
                  </pre>
                </div>
              </aside>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                  Trend history
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                  How momentum is moving across available history
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-700 dark:text-neutral-400">
                  This section shows the recent direction of authority and
                  momentum together. It is normalized to the history available for
                  this project, so it helps you see relative movement rather than
                  pretend everything is a fixed 0–100 bar.
                </p>
              </div>

              {!trendDeduped.length ? (
                <div className="rounded-2xl border border-neutral-300 bg-white p-6 text-sm text-neutral-700 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-400">
                  No history yet. This will grow as nightly scoring continues.
                </div>
              ) : (
                <>
                  {trendStats ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <StatTile
                        label="Latest authority"
                        value={fmt1(trendStats.latest.authority)}
                        helper={
                          trendStats.deltaA == null
                            ? "No prior point yet."
                            : `Change vs prior: ${(trendStats.deltaA >= 0 ? "+" : "") + trendStats.deltaA.toFixed(1)}`
                        }
                      />
                      <StatTile
                        label="Latest momentum"
                        value={fmt1(trendStats.latest.momentum)}
                        helper={
                          trendStats.deltaM == null
                            ? "No prior point yet."
                            : `Change vs prior: ${(trendStats.deltaM >= 0 ? "+" : "") + trendStats.deltaM.toFixed(1)}`
                        }
                      />
                      <StatTile
                        label="Authority range"
                        value={`${trendStats.minA.toFixed(1)}–${trendStats.maxA.toFixed(1)}`}
                        helper={`${trendDeduped.length} tracked days`}
                      />
                      <StatTile
                        label="Momentum range"
                        value={`${trendStats.minM.toFixed(1)}–${trendStats.maxM.toFixed(1)}`}
                        helper="Behavior trend across available history"
                      />
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
                    <p className="text-xs uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-500">
                      Daily points
                    </p>

                    <div className="mt-4 divide-y divide-neutral-200 dark:divide-neutral-800">
                      {trendDeduped
                        .slice()
                        .reverse()
                        .slice(0, 30)
                        .map((point) => {
                          const minA = trendStats?.minA ?? point.authority;
                          const maxA = trendStats?.maxA ?? point.authority;
                          const rangeA = Math.max(0.0001, maxA - minA);
                          const widthA = clamp01((point.authority - minA) / rangeA);

                          const minM = trendStats?.minM ?? point.momentum;
                          const maxM = trendStats?.maxM ?? point.momentum;
                          const rangeM = Math.max(0.0001, maxM - minM);
                          const widthM = clamp01((point.momentum - minM) / rangeM);

                          return (
                            <div key={point.date} className="py-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm font-medium text-neutral-950 dark:text-white">
                                  {point.date}
                                </div>
                                <div className="text-xs text-neutral-700 dark:text-neutral-400">
                                  Authority{" "}
                                  <span className="font-semibold text-neutral-950 dark:text-white">
                                    {point.authority.toFixed(1)}
                                  </span>{" "}
                                  • Momentum{" "}
                                  <span className="font-semibold text-neutral-950 dark:text-white">
                                    {point.momentum.toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 space-y-3">
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-500">
                                    <span>Authority</span>
                                    <span>{(widthA * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                    <div
                                      className="h-full rounded-full bg-neutral-950 dark:bg-white"
                                      style={{ width: `${widthA * 100}%` }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-500">
                                    <span>Momentum</span>
                                    <span>{(widthM * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                    <div
                                      className="h-full rounded-full bg-neutral-600 dark:bg-neutral-300"
                                      style={{ width: `${widthM * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <p className="mt-4 text-[11px] text-neutral-600 dark:text-neutral-500">
                      Note: Bars are normalized to the min/max in the available
                      history, not a fixed 0–100 scale.
                    </p>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}