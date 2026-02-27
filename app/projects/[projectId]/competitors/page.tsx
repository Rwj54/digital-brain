"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CompetitorRow = {
  id: string;
  project_id: string;
  name: string | null;
  competitor_name: string | null;
  competitor_domain: string;
  domain: string | null;
  rating: number | null;
  total_reviews: number | null;
  last_seen_at: string | null;
  source: string | null;
  place_id: string | null;
};

type ProjectRow = {
  id: string;
  monthly_customer_events: number | null;
  review_conversion_rate: number | null;
};

type GbpProfileRow = {
  id: string;
  project_id: string;
  created_at: string | null;
  [key: string]: any;
};

type SnapshotRow = {
  competitor_domain: string;
  total_reviews: number | null;
  captured_at: string;
};

type VelocityMode = "estimated" | "observed_14d" | "observed_30d" | "observed_90d";

function toNumberOrNull(v: any): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function normalizeConversionRate(v: number | null): number | null {
  if (v === null) return null;
  if (v > 1) return v / 100;
  if (v < 0) return null;
  return v;
}

function pickCurrentReviewsFromProfile(profile: GbpProfileRow | null): number | null {
  if (!profile) return null;

  const candidateKeys = ["total_reviews", "reviews", "review_count", "reviewCount", "gbp_total_reviews"];
  for (const k of candidateKeys) {
    const n = toNumberOrNull(profile[k]);
    if (n !== null) return n;
  }
  for (const [k, v] of Object.entries(profile)) {
    if (!k.toLowerCase().includes("review")) continue;
    const n = toNumberOrNull(v);
    if (n !== null) return n;
  }
  return null;
}

function fmtInt(n: number | null) {
  if (n === null) return "—";
  return Intl.NumberFormat().format(Math.round(n));
}

function fmtPct(n: number | null, digits = 2) {
  if (n === null) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function closestByDate(rows: SnapshotRow[], targetMs: number): SnapshotRow | null {
  if (!rows.length) return null;
  let best: SnapshotRow | null = null;
  let bestDist = Infinity;

  for (const r of rows) {
    const ms = new Date(r.captured_at).getTime();
    const dist = Math.abs(ms - targetMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = r;
    }
  }
  return best;
}

function confidenceLabel(mode: VelocityMode): string {
  if (mode === "observed_90d") return "Observed (90d)";
  if (mode === "observed_30d") return "Observed (30d)";
  if (mode === "observed_14d") return "Observed (14d)";
  return "Estimated (no history yet)";
}

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

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<CompetitorRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [loadingInputs, setLoadingInputs] = useState(false);
  const [inputsError, setInputsError] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [gbpProfile, setGbpProfile] = useState<GbpProfileRow | null>(null);

  const [loadingVelocity, setLoadingVelocity] = useState(false);
  const [velocityError, setVelocityError] = useState<string | null>(null);
  const [marketGrowth90, setMarketGrowth90] = useState<number | null>(null);
  const [velocityMode, setVelocityMode] = useState<VelocityMode>("estimated");

  async function loadCompetitors() {
    if (!projectId) return;

    setLoadingList(true);
    setListError(null);

    const { data, error } = await supabase
      .from("gbp_competitor_metrics")
      .select(
        "id, project_id, name, competitor_name, competitor_domain, domain, rating, total_reviews, last_seen_at, source, place_id"
      )
      .eq("project_id", projectId)
      .order("total_reviews", { ascending: false, nullsFirst: false });

    if (error) {
      setListError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as CompetitorRow[]);
    }

    setLoadingList(false);
  }

  async function loadInputs() {
    if (!projectId) return;

    setLoadingInputs(true);
    setInputsError(null);

    try {
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("id, monthly_customer_events, review_conversion_rate")
        .eq("id", projectId)
        .single();
      if (projErr) throw new Error(projErr.message);
      setProject((proj ?? null) as ProjectRow | null);

      const { data: prof, error: profErr } = await supabase
        .from("gbp_profiles")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profErr) setGbpProfile(null);
      else setGbpProfile((prof ?? null) as GbpProfileRow | null);
    } catch (e: any) {
      setInputsError(e?.message ?? "Failed to load inputs");
    } finally {
      setLoadingInputs(false);
    }
  }

  async function loadVelocity() {
    if (!projectId) return;

    setLoadingVelocity(true);
    setVelocityError(null);

    try {
      const top3 = rows.slice(0, 3).filter((r) => r.competitor_domain);
      const competitorDomains = top3.map((c) => c.competitor_domain);

      const now = new Date();
      const windowStart = new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000); // enough for 90d +/- buffer

      const { data: snaps, error: snapsErr } = await supabase
        .from("gbp_competitor_snapshots")
        .select("competitor_domain,total_reviews,captured_at")
        .eq("project_id", projectId)
        .in("competitor_domain", competitorDomains.length ? competitorDomains : ["__none__"])
        .gte("captured_at", windowStart.toISOString())
        .lte("captured_at", now.toISOString())
        .order("captured_at", { ascending: true });

      if (snapsErr) throw new Error(snapsErr.message);

      const byDomain = new Map<string, SnapshotRow[]>();
      (snaps ?? []).forEach((s: any) => {
        const d = String(s.competitor_domain);
        const arr = byDomain.get(d) ?? [];
        arr.push({
          competitor_domain: d,
          total_reviews: typeof s.total_reviews === "number" ? s.total_reviews : toNumberOrNull(s.total_reviews),
          captured_at: String(s.captured_at),
        });
        byDomain.set(d, arr);
      });

      const horizons: Array<{ days: 90 | 30 | 14; minCompetitors: number; mode: VelocityMode }> = [
        { days: 90, minCompetitors: 2, mode: "observed_90d" },
        { days: 30, minCompetitors: 2, mode: "observed_30d" },
        { days: 14, minCompetitors: 2, mode: "observed_14d" },
      ];

      for (const h of horizons) {
        const targetThenMs = now.getTime() - h.days * 24 * 60 * 60 * 1000;

        const velocities: number[] = [];

        for (const d of competitorDomains) {
          const arr = byDomain.get(d) ?? [];
          if (arr.length < 2) continue;

          const nowPoint = arr[arr.length - 1];
          const thenPoint = closestByDate(arr, targetThenMs);

          const nowReviews = nowPoint?.total_reviews;
          const thenReviews = thenPoint?.total_reviews;

          if (nowReviews === null || thenReviews === null) continue;

          const v = Math.max(0, nowReviews - thenReviews);
          velocities.push(v);
        }

        const med = median(velocities);

        if (med !== null && velocities.length >= h.minCompetitors) {
          const scaled90 = Math.round(med * (90 / h.days));
          setMarketGrowth90(scaled90);
          setVelocityMode(h.mode);
          setLoadingVelocity(false);
          return;
        }
      }

      // Estimated fallback
      const top3Reviews = rows.slice(0, 3).map((r) => (typeof r.total_reviews === "number" ? r.total_reviews : 0));
      const top3Avg =
        top3Reviews.length ? top3Reviews.reduce((a, b) => a + b, 0) / Math.max(1, top3Reviews.length) : 0;

      const top10 = rows.slice(0, 10).map((r) => (typeof r.total_reviews === "number" ? r.total_reviews : 0));
      const med10 = median(top10) ?? 0;

      const spread = Math.max(0, top3Avg - med10);

      const k = 0.12;
      const est90 = Math.round(spread * k);

      setMarketGrowth90(est90);
      setVelocityMode("estimated");
    } catch (e: any) {
      setVelocityError(e?.message ?? "Failed to compute velocity");
      setMarketGrowth90(null);
      setVelocityMode("estimated");
    } finally {
      setLoadingVelocity(false);
    }
  }

  useEffect(() => {
    loadInputs();
    loadCompetitors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (rows.length) loadVelocity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  async function runDiscovery() {
    try {
      setBusy(true);
      setStatus("Running discovery…");

      if (!projectId) {
        setStatus("Failed: projectId is empty on the page.");
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/discover-competitors`, { method: "POST" });
      const text = await res.text();

      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) || (text ? text.slice(0, 400) : "Empty response body");
        setStatus(`Failed: ${msg}`);
        return;
      }

      if (!json || !json.ok) {
        const msg =
          (json && (json.error || json.message)) || (text ? text.slice(0, 400) : "Empty/invalid JSON response");
        setStatus(`Failed: ${msg}`);
        return;
      }

      setStatus(
        `Success: found ${json.result.found}, upserted ${json.result.upserted}, cost $${Number(
          json.result.costUsd ?? 0
        ).toFixed(4)}`
      );

      await loadCompetitors();
      await loadVelocity();
    } catch (e: any) {
      setStatus(`Failed: ${e?.message ?? "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  const currentReviews = useMemo(() => pickCurrentReviewsFromProfile(gbpProfile), [gbpProfile]);

  const leaderReviews = useMemo(() => {
    const max = rows.reduce((acc, r) => {
      const n = typeof r.total_reviews === "number" ? r.total_reviews : null;
      if (n === null) return acc;
      return acc === null ? n : Math.max(acc, n);
    }, null as number | null);
    return max;
  }, [rows]);

  const gap = useMemo(() => {
    if (currentReviews === null || leaderReviews === null) return null;
    return Math.max(0, leaderReviews - currentReviews);
  }, [currentReviews, leaderReviews]);

  const targetCloseByRule = useMemo(() => {
    if (gap === null) return null;
    if (gap === 0) return 0;
    const pct = gap > 100 ? 0.25 : 0.5;
    return Math.ceil(gap * pct);
  }, [gap]);

  const conv = useMemo(() => normalizeConversionRate(project?.review_conversion_rate ?? null), [project?.review_conversion_rate]);
  const monthlyVolume = project?.monthly_customer_events ?? null;

  const capacity90 = useMemo(() => {
    if (monthlyVolume === null || conv === null) return null;
    return Math.floor(monthlyVolume * 3 * conv);
  }, [monthlyVolume, conv]);

  const marketTarget90 = useMemo(() => {
    if (marketGrowth90 === null) return null;
    const catchupFactor = gap !== null && gap > 200 ? 0.5 : 0.7;
    return Math.max(0, Math.round(marketGrowth90 * catchupFactor));
  }, [marketGrowth90, gap]);

  const realistic90 = useMemo(() => {
    if (targetCloseByRule === null) return null;
    const candidates: number[] = [targetCloseByRule];
    if (capacity90 !== null) candidates.push(capacity90);
    if (marketTarget90 !== null) candidates.push(marketTarget90);
    if (gap !== null) candidates.push(gap);
    return Math.min(...candidates);
  }, [targetCloseByRule, capacity90, marketTarget90, gap]);

  const weeklyNeeded = useMemo(() => {
    if (realistic90 === null) return null;
    return realistic90 === 0 ? 0 : Math.ceil(realistic90 / 13);
  }, [realistic90]);

  const conf = confidenceLabel(velocityMode);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Competitors</h1>
          <p className="text-sm text-gray-600 mt-1">
            Google Maps competitor discovery (DataForSEO). Sorted by total reviews.
          </p>
        </div>

        <button
          onClick={runDiscovery}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? "Running…" : "Run discovery"}
        </button>
      </div>

      {status && (
        <div className="mt-4 p-3 rounded-md border">
          <div className="text-sm whitespace-pre-wrap">{status}</div>
        </div>
      )}

      <div className="mt-6 border rounded-md p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Market velocity</div>
            <div className="text-xs text-gray-600 mt-1">
              {conf} • Automatically improves as nightly snapshots accumulate.
            </div>
          </div>
          <button onClick={loadVelocity} disabled={loadingVelocity} className="text-sm underline disabled:opacity-50">
            {loadingVelocity ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {velocityError && <div className="mt-3 text-sm text-red-600">Error: {velocityError}</div>}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Market growth (90d)</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(marketGrowth90)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Market-based target (90d)</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(marketTarget90)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Confidence</div>
            <div className="text-lg font-semibold mt-1">{conf}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 border rounded-md p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Review gap & 90-day target</div>
            <div className="text-xs text-gray-600 mt-1">
              Final target = min(rule target, market target, capacity).
            </div>
          </div>
          <button onClick={loadInputs} disabled={loadingInputs} className="text-sm underline disabled:opacity-50">
            {loadingInputs ? "Refreshing…" : "Refresh inputs"}
          </button>
        </div>

        {inputsError && <div className="mt-3 text-sm text-red-600">Error: {inputsError}</div>}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Your current reviews</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(currentReviews)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Top competitor reviews</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(leaderReviews)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Review gap</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(gap)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Rule target (90d)</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(targetCloseByRule)}</div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Capacity (90d)</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(capacity90)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {fmtInt(monthlyVolume)} / month × 3 × {fmtPct(conv)}
            </div>
          </div>

          <div className="border rounded-md p-3">
            <div className="text-xs text-gray-600">Realistic target (90d)</div>
            <div className="text-lg font-semibold mt-1">{fmtInt(realistic90)}</div>
          </div>
        </div>

        <div className="mt-4 border rounded-md p-3">
          <div className="text-xs text-gray-600">Weekly requirement</div>
          <div className="text-lg font-semibold mt-1">{fmtInt(weeklyNeeded)}</div>
          <div className="text-xs text-gray-500 mt-1">~13 weeks in 90 days</div>
        </div>

        {currentReviews === null && (
          <div className="mt-4 text-sm text-amber-700">
            Note: I couldn’t find your current review count from <code>gbp_profiles</code>. Add/confirm your latest GBP
            snapshot so targets are accurate.
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Discovered competitors</h2>
          <button onClick={loadCompetitors} disabled={loadingList} className="text-sm underline disabled:opacity-50">
            {loadingList ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {listError && (
          <div className="mt-3 p-3 rounded-md border">
            <div className="text-sm text-red-600">Failed to load: {listError}</div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-3 overflow-x-auto border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-right p-3">Reviews</th>
                  <th className="text-right p-3">Rating</th>
                  <th className="text-left p-3">Domain</th>
                  <th className="text-left p-3">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const displayName = (r.name ?? r.competitor_name ?? "Unknown").trim();
                  const displayDomain = (r.domain ?? r.competitor_domain ?? "").trim();
                  const reviews = typeof r.total_reviews === "number" ? r.total_reviews : null;
                  const rating = typeof r.rating === "number" ? r.rating : null;

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">
                        <div className="font-medium">{displayName}</div>
                        {r.place_id && <div className="text-xs text-gray-500">place_id: {r.place_id}</div>}
                      </td>
                      <td className="p-3 text-right">{reviews ?? "—"}</td>
                      <td className="p-3 text-right">{rating ?? "—"}</td>
                      <td className="p-3">
                        <div className="truncate max-w-[240px]">{displayDomain || "—"}</div>
                      </td>
                      <td className="p-3">{r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!listError && rows.length === 0 && (
          <div className="mt-3 p-3 rounded-md border">
            <div className="text-sm text-gray-700">
              No competitors yet. Click <strong>Run discovery</strong>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}