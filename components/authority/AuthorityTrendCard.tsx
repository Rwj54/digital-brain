"use client";

import { useEffect, useMemo, useState } from "react";

type TrendPoint = {
  date: string;
  authority: number;
  momentum: number;
};

type ApiOk = {
  ok: true;
  projectId: string;
  series: Array<{
    date?: unknown;
    authority?: unknown;
    momentum?: unknown;
  }>;
};

type ApiErr = {
  ok: false;
  error: string;
};

type ApiResponse = ApiOk | ApiErr;

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeFixed(value: unknown, digits = 1) {
  return asNumber(value, 0).toFixed(digits);
}

function dedupeByDateKeepLast(series: TrendPoint[]) {
  const map = new Map<string, TrendPoint>();

  for (const point of series) {
    map.set(point.date, point);
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function computeMinMax(series: TrendPoint[], key: keyof Pick<TrendPoint, "authority" | "momentum">) {
  if (!series.length) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const point of series) {
    const value = point[key];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 0 };
  }

  return { min, max };
}

function normalizeToPct(value: number, min: number, max: number) {
  if (max <= min) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function isApiOk(json: unknown): json is ApiOk {
  if (!json || typeof json !== "object") {
    return false;
  }

  const candidate = json as Record<string, unknown>;

  return (
    candidate.ok === true &&
    typeof candidate.projectId === "string" &&
    Array.isArray(candidate.series)
  );
}

function getErrorMessage(json: unknown, fallback: string) {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  const candidate = json as Record<string, unknown>;
  return typeof candidate.error === "string" && candidate.error.trim() ? candidate.error : fallback;
}

function toTrendPoint(input: { date?: unknown; authority?: unknown; momentum?: unknown }): TrendPoint | null {
  const date = typeof input.date === "string" ? input.date : "";

  if (!date) {
    return null;
  }

  return {
    date,
    authority: asNumber(input.authority, 0),
    momentum: asNumber(input.momentum, 0),
  };
}

function getThrownMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
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

      const json: ApiResponse | unknown = await res.json();

      if (!res.ok) {
        setStatus(
          getErrorMessage(
            json,
            `Failed to load trend (${res.status}). Make sure authority-chart route exists.`
          )
        );
        setSeries([]);
        return;
      }

      if (!isApiOk(json)) {
        setStatus(
          getErrorMessage(
            json,
            "Trend response malformed. Make sure authority-chart returns { ok:true, projectId, series }."
          )
        );
        setSeries([]);
        return;
      }

      const cleaned = json.series
        .map(toTrendPoint)
        .filter((point): point is TrendPoint => point !== null);

      setSeries(dedupeByDateKeepLast(cleaned));
    } catch (error: unknown) {
      setStatus(getThrownMessage(error, "Trend load failed"));
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const derived = useMemo(() => {
    const points = [...series].sort((a, b) => a.date.localeCompare(b.date));
    const days = points.length;

    const latest = days ? points[days - 1] : null;
    const prior = days >= 2 ? points[days - 2] : null;

    const authorityMinMax = computeMinMax(points, "authority");
    const momentumMinMax = computeMinMax(points, "momentum");

    const authorityRange =
      days === 0
        ? "—"
        : `${safeFixed(authorityMinMax.min, 1)}–${safeFixed(authorityMinMax.max, 1)}`;

    const momentumRange =
      days === 0
        ? "—"
        : `${safeFixed(momentumMinMax.min, 1)}–${safeFixed(momentumMinMax.max, 1)}`;

    const authorityDelta =
      latest && prior ? asNumber(latest.authority, 0) - asNumber(prior.authority, 0) : null;

    const momentumDelta =
      latest && prior ? asNumber(latest.momentum, 0) - asNumber(prior.momentum, 0) : null;

    return {
      points,
      days,
      latest,
      authorityRange,
      momentumRange,
      authorityDelta,
      momentumDelta,
      authorityMinMax,
      momentumMinMax,
    };
  }, [series]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Authority Trend (history)</div>
          <div className="mt-1 text-xs text-gray-500">
            Uses the nightly score history. Same-day duplicates are automatically deduped.
          </div>
        </div>

        <button
          onClick={() => void load()}
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
              : `${derived.authorityDelta >= 0 ? "+" : ""}${safeFixed(derived.authorityDelta, 1)}`}
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
              : `${derived.momentumDelta >= 0 ? "+" : ""}${safeFixed(derived.momentumDelta, 1)}`}
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
                .map((point) => {
                  const authorityPct = normalizeToPct(
                    point.authority,
                    derived.authorityMinMax.min,
                    derived.authorityMinMax.max
                  );

                  const momentumPct = normalizeToPct(
                    point.momentum,
                    derived.momentumMinMax.min,
                    derived.momentumMinMax.max
                  );

                  return (
                    <div key={point.date} className="rounded-lg border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{point.date}</div>
                        <div className="text-xs tabular-nums text-gray-600">
                          Authority {safeFixed(point.authority, 1)} • Momentum{" "}
                          {safeFixed(point.momentum, 1)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Authority</span>
                            <span className="tabular-nums">{Math.round(authorityPct)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            <div className="h-full bg-black" style={{ width: `${authorityPct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>Momentum</span>
                            <span className="tabular-nums">{Math.round(momentumPct)}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            <div className="h-full bg-black" style={{ width: `${momentumPct}%` }} />
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