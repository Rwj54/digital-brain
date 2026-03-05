"use client";

import { useEffect, useMemo, useState } from "react";

type TrendPoint = {
  date: string; // YYYY-MM-DD
  authority: number;
  momentum: number;
};

type ApiOk = {
  ok: true;
  projectId: string;
  series: TrendPoint[];
};

type ApiErr = {
  ok: false;
  error: string;
};

type ApiResponse = ApiOk | ApiErr;

function asNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeFixed(n: any, digits = 1) {
  const v = asNumber(n, 0);
  return v.toFixed(digits);
}

function dedupeByDateKeepLast(series: TrendPoint[]) {
  // If same day duplicates exist, keep the last one (most recent insert)
  const map = new Map<string, TrendPoint>();
  for (const p of series) map.set(p.date, p);
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function computeMinMax(series: TrendPoint[], key: "authority" | "momentum") {
  if (!series.length) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of series) {
    const v = asNumber((p as any)[key], 0);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  return { min, max };
}

function normalizeToPct(v: number, min: number, max: number) {
  // Normalize to the available history range (not a fixed 0..100 scale)
  if (max <= min) return 0;
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

function isApiOk(json: any): json is ApiOk {
  return (
    !!json &&
    typeof json === "object" &&
    json.ok === true &&
    typeof json.projectId === "string" &&
    Array.isArray(json.series)
  );
}

export default function AuthorityTrendCard(props: { projectId: string }) {
  const { projectId } = props;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [series, setSeries] = useState<TrendPoint[]>([]);

  async function load() {
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/authority-chart`, {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as unknown;

      if (!res.ok) {
        const msg =
          (json as any)?.error ||
          `Failed to load trend (${res.status}). Make sure authority-chart route exists.`;
        setStatus(msg);
        setSeries([]);
        return;
      }

      if (!isApiOk(json)) {
        const msg =
          (json as any)?.error ||
          "Trend response malformed. Make sure authority-chart returns { ok:true, projectId, series }.";
        setStatus(msg);
        setSeries([]);
        return;
      }

      const raw = json.series;
      const cleaned = raw
        .map((p: any) => ({
          date: String(p?.date ?? ""),
          authority: asNumber(p?.authority, 0),
          momentum: asNumber(p?.momentum, 0),
        }))
        .filter((p) => p.date);

      setSeries(dedupeByDateKeepLast(cleaned));
    } catch (e: any) {
      setStatus(e?.message ?? "Trend load failed");
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const derived = useMemo(() => {
    const points = series.slice().sort((a, b) => a.date.localeCompare(b.date));
    const days = points.length;

    const latest = days ? points[days - 1] : null;
    const prior = days >= 2 ? points[days - 2] : null;

    const aMinMax = computeMinMax(points, "authority");
    const mMinMax = computeMinMax(points, "momentum");

    const authorityRange =
      days === 0 ? "—" : `${safeFixed(aMinMax.min, 1)}–${safeFixed(aMinMax.max, 1)}`;
    const momentumRange =
      days === 0 ? "—" : `${safeFixed(mMinMax.min, 1)}–${safeFixed(mMinMax.max, 1)}`;

    const authorityDelta =
      latest && prior ? asNumber(latest.authority, 0) - asNumber(prior.authority, 0) : null;
    const momentumDelta =
      latest && prior ? asNumber(latest.momentum, 0) - asNumber(prior.momentum, 0) : null;

    return {
      points,
      days,
      latest,
      prior,
      authorityRange,
      momentumRange,
      authorityDelta,
      momentumDelta,
      aMinMax,
      mMinMax,
    };
  }, [series]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Authority Trend (history)</div>
          <div className="text-xs text-gray-500 mt-1">
            Uses the nightly score history. Same-day duplicates are automatically deduped.
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:text-black"
          type="button"
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh trend"}
        </button>
      </div>

      {status ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {status}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Latest authority</div>
          <div className="text-lg font-semibold">
            {derived.latest ? safeFixed(derived.latest.authority, 1) : "—"}
          </div>
          <div className="text-xs text-gray-500">
            Δ vs prior:{" "}
            {derived.authorityDelta == null
              ? "—"
              : (derived.authorityDelta >= 0 ? "+" : "") + safeFixed(derived.authorityDelta, 1)}
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Latest momentum</div>
          <div className="text-lg font-semibold">
            {derived.latest ? safeFixed(derived.latest.momentum, 1) : "—"}
          </div>
          <div className="text-xs text-gray-500">
            Δ vs prior:{" "}
            {derived.momentumDelta == null
              ? "—"
              : (derived.momentumDelta >= 0 ? "+" : "") + safeFixed(derived.momentumDelta, 1)}
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Authority range</div>
          <div className="text-lg font-semibold">{derived.authorityRange}</div>
          <div className="text-xs text-gray-500">{derived.days} days</div>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500">Momentum range</div>
          <div className="text-lg font-semibold">{derived.momentumRange}</div>
          <div className="text-xs text-gray-500">updates weekly (behavior)</div>
        </div>
      </div>

      <div className="mt-4">
        {!derived.points.length ? (
          <div className="text-sm text-gray-500">
            No history yet. It will populate after nightly runs.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs text-gray-500">Daily points</div>

            <div className="mt-3 space-y-3">
              {derived.points
                .slice()
                .reverse()
                .map((p) => {
                  const aPct = normalizeToPct(
                    p.authority,
                    derived.aMinMax.min,
                    derived.aMinMax.max
                  );
                  const mPct = normalizeToPct(
                    p.momentum,
                    derived.mMinMax.min,
                    derived.mMinMax.max
                  );

                  return (
                    <div key={p.date} className="rounded-lg bg-white border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{p.date}</div>
                        <div className="text-xs text-gray-600 tabular-nums">
                          Authority {safeFixed(p.authority, 1)} • Momentum{" "}
                          {safeFixed(p.momentum, 1)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Authority</span>
                            <span className="tabular-nums">{Math.round(aPct)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                            <div className="h-full bg-black" style={{ width: `${aPct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Momentum</span>
                            <span className="tabular-nums">{Math.round(mPct)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                            <div className="h-full bg-black" style={{ width: `${mPct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Note: Bars are normalized to the min/max in your available history (not a fixed 0–100
              scale).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}