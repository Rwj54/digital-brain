"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

type ProjectContext = {
  projectDisplayName: string | null;
  domainDisplayValue: string | null;
  projectLocationLabel: string | null;
  pageScopeLabel: string;
  capturedAt: string;
};

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
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

function normalizeProjectContext(value: unknown): ProjectContext | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (record.ok !== true) return null;

  return {
    projectDisplayName:
      typeof record.projectDisplayName === "string"
        ? record.projectDisplayName
        : null,
    domainDisplayValue:
      typeof record.domainDisplayValue === "string"
        ? record.domainDisplayValue
        : null,
    projectLocationLabel:
      typeof record.projectLocationLabel === "string"
        ? record.projectLocationLabel
        : null,
    pageScopeLabel:
      typeof record.pageScopeLabel === "string"
        ? record.pageScopeLabel
        : "Momentum view",
    capturedAt:
      typeof record.capturedAt === "string" ? record.capturedAt : "",
  };
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function HeaderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-[var(--text-strong)]">
        {value}
      </p>
    </div>
  );
}

function InlineTag({
  children,
  solid = "var(--text-body)",
  soft = "transparent",
  border = "var(--border)",
}: {
  children: ReactNode;
  solid?: string;
  soft?: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: solid,
        backgroundColor: soft,
        borderColor: border,
      }}
    >
      {children}
    </span>
  );
}

function SummaryStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{helper}</p>
      ) : null}
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
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);

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

  async function loadProjectContext() {
    try {
      const res = await fetch(`/api/projects/${projectId}/owner-dashboard`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setProjectContext(null);
        return;
      }

      setProjectContext(normalizeProjectContext(json));
    } catch {
      setProjectContext(null);
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
        await Promise.all([
          loadLatestAuthority(),
          loadAuthorityTrend(),
          loadProjectContext(),
        ]);
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

    const entries = Object.entries(rawComponents).map(([key, value]) => [key, value] as const);
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
      deltaA,
      deltaM,
    };
  }, [trendDeduped]);

  const businessValue = projectContext?.projectDisplayName ?? "Project";
  const domainValue = projectContext?.domainDisplayValue ?? "Not set";
  const locationValue = projectContext?.projectLocationLabel ?? "Not set";
  const scopeValue = projectContext?.pageScopeLabel ?? "Momentum view";
  const snapshotValue = formatDate(row?.captured_at ?? projectContext?.capturedAt ?? null);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">Loading momentum read...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Momentum center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3rem] sm:leading-[1.04]">
                Is the business starting to move?
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                Momentum helps show whether authority work is beginning to translate
                into visible forward progress. It is a leading signal, not a vanity
                score, and it helps separate real movement from noisy market shifts.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {row ? (
                  <>
                    <InlineTag
                      solid="var(--brand-700)"
                      soft="var(--brand-100)"
                      border="var(--brand-600)"
                    >
                      {row.momentum_label}
                    </InlineTag>
                    <InlineTag
                      solid="var(--accent-blue-600)"
                      soft="var(--accent-blue-100)"
                      border="var(--accent-blue-600)"
                    >
                      Authority {fmt1(row.authority_score)}
                    </InlineTag>
                  </>
                ) : null}
              </div>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>Open another center</SectionLabel>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/projects/${projectId}/authority`}
                  className="border px-4 py-2 text-sm font-semibold text-[var(--text-strong)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  Open authority page
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    setStatus("Refreshing momentum data…");
                    setTrendStatus(null);

                    try {
                      await Promise.all([
                        loadLatestAuthority(),
                        loadAuthorityTrend(),
                        loadProjectContext(),
                      ]);
                      setStatus("Momentum data refreshed.");
                    } catch (e: unknown) {
                      setStatus(e instanceof Error ? e.message : "Refresh failed.");
                    }
                  }}
                  disabled={trendLoading}
                  className="border px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    backgroundColor: "var(--text-strong)",
                    borderColor: "var(--text-strong)",
                  }}
                >
                  {trendLoading ? "Refreshing…" : "Refresh momentum"}
                </button>
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Project ID
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--text-strong)]">
                  {projectId}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta label="Business" value={businessValue} />
            <HeaderMeta label="Domain" value={domainValue} />
            <HeaderMeta label="Location / Market" value={locationValue} />
            <HeaderMeta label="Scope" value={scopeValue} />
            <HeaderMeta label="Snapshot" value={snapshotValue} />
          </div>

          {status ? (
            <div className="mt-6 border-t border-[var(--border)] pt-4 text-sm text-[var(--text-body)]">
              {status}
            </div>
          ) : null}

          {trendStatus ? (
            <div className="mt-4 border-t-2 border-[var(--danger)] pt-4 text-sm text-[var(--danger)]">
              {trendStatus}
            </div>
          ) : null}

          {!row ? (
            <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-body)]">
              No momentum row found yet. This page will populate after the next
              scoring run.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 border-t border-[var(--border)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryStat
                label="Momentum score"
                value={fmt1(row.momentum_score)}
                helper={`Current label: ${row.momentum_label}`}
              />
              <SummaryStat
                label="Authority score"
                value={fmt1(row.authority_score)}
                helper={`Current tier: ${row.authority_tier}`}
              />
              <SummaryStat
                label="Captured"
                value={formatDate(row.captured_at)}
                helper={`Version: ${row.version}`}
              />
              <SummaryStat
                label="History points"
                value={String(trendDeduped.length)}
                helper="Same-day duplicates are automatically deduped."
              />
            </div>
          )}
        </section>

        {row ? (
          <>
            <section className="grid gap-10 border-b border-[var(--border)] py-8 xl:grid-cols-[1.08fr_0.92fr]">
              <section>
                <SectionLabel>Current momentum summary</SectionLabel>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
                  What the latest momentum read says
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                  These are the inputs behind the current momentum reading. The
                  purpose is to show whether authority is improving, whether the
                  gap is narrowing, and how much outside market pressure is still
                  pushing back.
                </p>

                <div className="mt-6 grid gap-8 sm:grid-cols-2">
                  <div>
                    <DetailRow
                      label="Momentum score"
                      value={fmt1(row.momentum_score)}
                      helper={`Label: ${row.momentum_label}`}
                    />
                    <DetailRow
                      label="Authority score"
                      value={fmt1(row.authority_score)}
                      helper={`Tier: ${row.authority_tier}`}
                    />
                    <DetailRow
                      label="Captured"
                      value={formatDate(row.captured_at)}
                      helper={`Version: ${row.version}`}
                    />
                  </div>

                  <div>
                    <DetailRow
                      label="Execution"
                      value={execution == null ? "—" : execution.toFixed(3)}
                      helper="How strongly recent work appears to be carrying through."
                    />
                    <DetailRow
                      label="Authority delta"
                      value={authorityDelta == null ? "—" : authorityDelta.toFixed(1)}
                      helper="Change in authority compared with the prior footing."
                    />
                    <DetailRow
                      label="Gap shrink"
                      value={gapShrinkRatio == null ? "—" : gapShrinkRatio.toFixed(3)}
                      helper="Whether the business is closing distance against the market."
                    />
                    <DetailRow
                      label="Market pressure"
                      value={marketPressure == null ? "—" : marketPressure.toFixed(3)}
                      helper="How much outside competitive movement is still pushing back."
                    />
                  </div>
                </div>

                {components ? (
                  <div className="mt-8 border-t border-[var(--border)] pt-5">
                    <SectionLabel>Raw momentum components</SectionLabel>

                    <div className="mt-4 divide-y divide-[var(--border)]">
                      {components.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4 py-3 text-sm"
                        >
                          <span className="text-[var(--text-body)]">{key}</span>
                          <span className="font-medium text-[var(--text-strong)]">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <aside>
                <SectionLabel>Momentum read</SectionLabel>

                <div
                  className="mt-4 border-l-4 pl-4"
                  style={{ borderColor: "var(--brand-600)" }}
                >
                  <h3 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                    {row.momentum_label}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-[var(--text-body)]">
                    Momentum is the “are we actually starting to move?” signal.
                    It does not replace authority. It helps show whether the work
                    is beginning to translate into real forward progress.
                  </p>
                </div>

                <div className="mt-8 border-t border-[var(--border)] pt-5">
                  <SectionLabel>What this tells you</SectionLabel>

                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                    <li className="flex gap-3">
                      <span
                        className="mt-2 h-2.5 w-2.5 shrink-0"
                        style={{ backgroundColor: "var(--brand-600)" }}
                      />
                      <span>Shows whether traction is improving over time.</span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="mt-2 h-2.5 w-2.5 shrink-0"
                        style={{ backgroundColor: "var(--accent-blue-600)" }}
                      />
                      <span>
                        Helps explain whether authority gains are starting to turn
                        into movement.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span
                        className="mt-2 h-2.5 w-2.5 shrink-0"
                        style={{ backgroundColor: "var(--success)" }}
                      />
                      <span>
                        Helps separate real progress from noisy day-to-day market
                        movement.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 border-t border-[var(--border)] pt-5">
                  <SectionLabel>How to read momentum</SectionLabel>

                  <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-body)]">
                    <p>
                      A stronger momentum reading usually means recent work is
                      compounding instead of stalling.
                    </p>
                    <p>
                      A weaker reading usually means either the market moved faster,
                      execution slowed down, or the business still has a gap to close.
                    </p>
                    <p>
                      This page should help the owner understand direction, not drown
                      them in diagnostics.
                    </p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="border-b border-[var(--border)] py-8">
              <SectionLabel>Recent momentum trend</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
                How momentum is moving over time
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                This section shows the recent direction of authority and momentum
                together. It is normalized to the history available for this
                project, so it helps you see relative movement instead of pretending
                everything is a fixed 0–100 bar.
              </p>

              {!trendDeduped.length ? (
                <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-body)]">
                  No history yet. This will grow as nightly scoring continues.
                </div>
              ) : (
                <>
                  {trendStats ? (
                    <div className="mt-6 grid gap-5 border-t border-[var(--border)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryStat
                        label="Latest authority"
                        value={fmt1(trendStats.latest.authority)}
                        helper={
                          trendStats.deltaA == null
                            ? "No prior point yet."
                            : `Change vs prior: ${(trendStats.deltaA >= 0 ? "+" : "") + trendStats.deltaA.toFixed(1)}`
                        }
                      />
                      <SummaryStat
                        label="Latest momentum"
                        value={fmt1(trendStats.latest.momentum)}
                        helper={
                          trendStats.deltaM == null
                            ? "No prior point yet."
                            : `Change vs prior: ${(trendStats.deltaM >= 0 ? "+" : "") + trendStats.deltaM.toFixed(1)}`
                        }
                      />
                      <SummaryStat
                        label="Authority range"
                        value={`${trendStats.minA.toFixed(1)}–${trendStats.maxA.toFixed(1)}`}
                        helper={`${trendDeduped.length} tracked days`}
                      />
                      <SummaryStat
                        label="Momentum range"
                        value={`${trendStats.minM.toFixed(1)}–${trendStats.maxM.toFixed(1)}`}
                        helper="Behavior trend across available history"
                      />
                    </div>
                  ) : null}

                  <div className="mt-8 border-t border-[var(--border)] pt-5">
                    <SectionLabel>Recent daily points</SectionLabel>

                    <div className="mt-4 divide-y divide-[var(--border)]">
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
                            <article key={point.date} className="py-5">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="text-sm font-medium text-[var(--text-strong)]">
                                  {point.date}
                                </div>

                                <div className="text-xs text-[var(--text-body)]">
                                  Authority{" "}
                                  <span className="font-semibold text-[var(--text-strong)]">
                                    {point.authority.toFixed(1)}
                                  </span>{" "}
                                  • Momentum{" "}
                                  <span className="font-semibold text-[var(--text-strong)]">
                                    {point.momentum.toFixed(1)}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-4 space-y-3">
                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                    <span>Authority</span>
                                    <span>{(widthA * 100).toFixed(0)}%</span>
                                  </div>
                                  <div
                                    className="h-2"
                                    style={{ backgroundColor: "var(--reference-soft)" }}
                                  >
                                    <div
                                      className="h-2"
                                      style={{
                                        width: `${widthA * 100}%`,
                                        backgroundColor: "var(--brand-600)",
                                      }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                                    <span>Momentum</span>
                                    <span>{(widthM * 100).toFixed(0)}%</span>
                                  </div>
                                  <div
                                    className="h-2"
                                    style={{ backgroundColor: "var(--reference-soft)" }}
                                  >
                                    <div
                                      className="h-2"
                                      style={{
                                        width: `${widthM * 100}%`,
                                        backgroundColor: "var(--accent-blue-600)",
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                    </div>

                    <p className="mt-4 text-[11px] text-[var(--text-muted)]">
                      Note: bars are normalized to the min/max in the available
                      history, not a fixed 0–100 scale.
                    </p>
                  </div>
                </>
              )}
            </section>

            <section className="py-8">
              <SectionLabel>Details below the fold</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
                Raw momentum inputs
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                This keeps the machine-facing inputs visible without letting them
                take over the page. The owner story stays above and the raw
                reference stays below.
              </p>

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <pre className="overflow-auto border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-[11px] text-[var(--text-strong)]">
                  {formatJson(row.inputs)}
                </pre>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
