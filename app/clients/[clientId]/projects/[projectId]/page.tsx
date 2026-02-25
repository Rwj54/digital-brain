"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  client_id: string;
  site_url: string;
  category: string;
  metro: string;
  radius_miles: number;
  created_at: string;

  monthly_customer_events: number | null;
  review_conversion_rate: number | null; // percent (e.g. 40 = 40%)
  event_label_singular: string | null;
  event_label_plural: string | null;
};

type GbpProfile = {
  id: string;
  project_id: string;
  place_id: string | null;
  gbp_name: string | null;
  gbp_url: string | null;
  primary_category: string | null;
  additional_categories: string[] | null;
  rating: number | null;
  total_reviews: number | null;
  photos_count: number | null;
  posts_30d: number | null;
  qa_count: number | null;
  last_fetched_at: string;
};

type CompetitorMetric = {
  id: string;
  project_id: string;
  competitor_domain: string;
  source: string;
  competitor_name: string | null;
  place_id: string | null;
  rating: number | null;
  total_reviews: number | null;
  last_seen_at: string;
  created_at: string;
};

type TabKey = "overview" | "data" | "actions" | "settings";

function safeNum(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function formatDomain(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "—";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).hostname.replace(/^www\./, "");
    }
  } catch {
    // ignore
  }
  return raw.replace(/^www\./, "").replace(/\/+$/, "");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Card({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-zinc-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TabPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-extrabold",
        "transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-900/70 text-zinc-900/80 hover:text-zinc-900 hover:border-zinc-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function MobileBottomNav({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const Item = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k;
    return (
      <button
        onClick={() => setTab(k)}
        className={[
          "flex flex-1 flex-col items-center justify-center gap-1 py-2",
          active ? "text-zinc-900" : "text-zinc-500",
        ].join(" ")}
        aria-current={active ? "page" : undefined}
      >
        <span className={["h-1.5 w-10 rounded-full", active ? "bg-zinc-900" : "bg-transparent"].join(" ")} />
        <span className="text-[12px] font-extrabold">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl px-2">
        <Item k="overview" label="Overview" />
        <Item k="data" label="Data" />
        <Item k="actions" label="Actions" />
        <Item k="settings" label="Settings" />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold",
        ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export default function ProjectDashboard() {
  const router = useRouter();
  const params = useParams<{ clientId: string; projectId: string }>();

  const clientId = params.clientId;
  const projectId = params.projectId;

  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [gbp, setGbp] = useState<GbpProfile | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorMetric[]>([]);

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("overview");

  // GBP form
  const [gbpName, setGbpName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [gbpUrl, setGbpUrl] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState("");
  const [rating, setRating] = useState<string>("");
  const [totalReviews, setTotalReviews] = useState<string>("");
  const [photosCount, setPhotosCount] = useState<string>("");

  // Competitor form
  const [compDomain, setCompDomain] = useState("");
  const [compName, setCompName] = useState("");
  const [compSource, setCompSource] = useState<string>("manual");
  const [compRating, setCompRating] = useState<string>("");
  const [compReviews, setCompReviews] = useState<string>("");

  // Review capacity + vocabulary
  const presetOptions = useMemo(
    () => [
      {
        key: "jobs",
        label: "Contractor / Services",
        helper: "Landscaping, HVAC, roofing, contractors, home services.",
        singular: "Job",
        plural: "Jobs",
        example: "Example: 12 jobs/month",
      },
      {
        key: "tickets",
        label: "Retail / Service Counter",
        helper: "Walk-in retail, counter service, repair shop, salon desk.",
        singular: "Ticket",
        plural: "Tickets",
        example: "Example: 300 tickets/month",
      },
      {
        key: "orders",
        label: "Ecommerce / Delivery",
        helper: "Online orders, delivery, curbside orders.",
        singular: "Order",
        plural: "Orders",
        example: "Example: 500 orders/month",
      },
      {
        key: "appointments",
        label: "Appointments",
        helper: "Dentist, med spa, massage, consultations.",
        singular: "Appointment",
        plural: "Appointments",
        example: "Example: 90 appointments/month",
      },
      {
        key: "customers",
        label: "Generic (Customers)",
        helper: "Use this if none of the above fits.",
        singular: "Customer",
        plural: "Customers",
        example: "Example: 200 customers/month",
      },
      {
        key: "custom",
        label: "Custom Labels (Advanced)",
        helper: "Only if you want custom wording in the dashboard.",
        singular: "Event",
        plural: "Events",
        example: "Example: 50 events/month",
      },
    ],
    []
  );

  const [volumePreset, setVolumePreset] = useState<string>("jobs");
  const [showAdvancedLabels, setShowAdvancedLabels] = useState(false);
  const [eventLabelSingular, setEventLabelSingular] = useState("Job");
  const [eventLabelPlural, setEventLabelPlural] = useState("Jobs");
  const [monthlyEvents, setMonthlyEvents] = useState<string>("");
  const [reviewConvRate, setReviewConvRate] = useState<string>("");

  const tabs = useMemo(
    () => [
      { key: "overview" as const, label: "Overview" },
      { key: "data" as const, label: "Data" },
      { key: "actions" as const, label: "Action Plan" },
      { key: "settings" as const, label: "Settings" },
    ],
    []
  );

  async function requireAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) router.replace("/login");
  }

  async function loadAll() {
    setLoading(true);
    setStatus(null);

    const { data: clientData, error: clientErr } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (clientErr) {
      setStatus(clientErr.message);
      setLoading(false);
      return;
    }
    setClient(clientData);

    const { data: projectData, error: projectErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("client_id", clientId)
      .single();

    if (projectErr) {
      setStatus(projectErr.message);
      setLoading(false);
      return;
    }
    setProject(projectData);

    const savedSingular = projectData.event_label_singular || "";
    const savedPlural = projectData.event_label_plural || "";

    const matchingPreset =
      presetOptions.find(
        (p) =>
          p.key !== "custom" &&
          p.singular.toLowerCase() === savedSingular.toLowerCase() &&
          p.plural.toLowerCase() === savedPlural.toLowerCase()
      ) ?? null;

    if (matchingPreset) {
      setVolumePreset(matchingPreset.key);
      setEventLabelSingular(matchingPreset.singular);
      setEventLabelPlural(matchingPreset.plural);
      setShowAdvancedLabels(false);
    } else if (savedSingular || savedPlural) {
      setVolumePreset("custom");
      setEventLabelSingular(savedSingular || "Event");
      setEventLabelPlural(savedPlural || "Events");
      setShowAdvancedLabels(true);
    } else {
      setVolumePreset("jobs");
      setEventLabelSingular("Job");
      setEventLabelPlural("Jobs");
      setShowAdvancedLabels(false);
    }

    setMonthlyEvents(
      projectData.monthly_customer_events === null || projectData.monthly_customer_events === undefined
        ? ""
        : String(projectData.monthly_customer_events)
    );
    setReviewConvRate(
      projectData.review_conversion_rate === null || projectData.review_conversion_rate === undefined
        ? ""
        : String(projectData.review_conversion_rate)
    );

    const { data: gbpData, error: gbpErr } = await supabase
      .from("gbp_profiles")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (gbpErr) {
      setStatus(gbpErr.message);
      setLoading(false);
      return;
    }
    setGbp(gbpData ?? null);

    if (gbpData) {
      setGbpName(gbpData.gbp_name ?? "");
      setPlaceId(gbpData.place_id ?? "");
      setGbpUrl(gbpData.gbp_url ?? "");
      setPrimaryCategory(gbpData.primary_category ?? "");
      setRating(gbpData.rating !== null && gbpData.rating !== undefined ? String(gbpData.rating) : "");
      setTotalReviews(
        gbpData.total_reviews !== null && gbpData.total_reviews !== undefined ? String(gbpData.total_reviews) : ""
      );
      setPhotosCount(
        gbpData.photos_count !== null && gbpData.photos_count !== undefined ? String(gbpData.photos_count) : ""
      );
    }

    const { data: compData, error: compErr } = await supabase
      .from("gbp_competitor_metrics")
      .select("*")
      .eq("project_id", projectId)
      .order("total_reviews", { ascending: false });

    if (compErr) {
      setStatus(compErr.message);
      setLoading(false);
      return;
    }
    setCompetitors(compData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    requireAuth();
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId]);

  const preset = useMemo(() => presetOptions.find((p) => p.key === volumePreset) || presetOptions[0], [presetOptions, volumePreset]);

  const labelSingular = project?.event_label_singular || eventLabelSingular || preset.singular;
  const labelPlural = project?.event_label_plural || eventLabelPlural || preset.plural;

  async function saveProjectReviewCapacity(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const monthly = monthlyEvents.trim() === "" ? null : safeNum(monthlyEvents);
    const conv = reviewConvRate.trim() === "" ? null : safeNum(reviewConvRate);
    const convClamped = conv === null ? null : clamp(conv, 0, 100);

    const finalSingular = volumePreset === "custom" ? (eventLabelSingular.trim() || "Event") : preset.singular;
    const finalPlural = volumePreset === "custom" ? (eventLabelPlural.trim() || "Events") : preset.plural;

    const { error } = await supabase
      .from("projects")
      .update({
        event_label_singular: finalSingular,
        event_label_plural: finalPlural,
        monthly_customer_events: monthly === null ? null : Math.max(0, Math.floor(monthly)),
        review_conversion_rate: convClamped,
      })
      .eq("id", projectId)
      .eq("client_id", clientId);

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadAll();
    setStatus("Saved review capacity settings.");
  }

  async function saveGbpProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const ratingNum = rating.trim() === "" ? null : safeNum(rating);
    const reviewsNum = totalReviews.trim() === "" ? null : safeNum(totalReviews);
    const photosNum = photosCount.trim() === "" ? null : safeNum(photosCount);

    const { error } = await supabase.from("gbp_profiles").upsert(
      {
        project_id: projectId,
        gbp_name: gbpName.trim() || null,
        place_id: placeId.trim() || null,
        gbp_url: gbpUrl.trim() || null,
        primary_category: primaryCategory.trim() || null,
        rating: ratingNum,
        total_reviews: reviewsNum,
        photos_count: photosNum,
        last_fetched_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

    if (error) {
      setStatus(error.message);
      return;
    }

    await loadAll();
    setStatus("Saved GBP snapshot.");
  }

  async function addOrUpdateCompetitor(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const raw = compDomain.trim().toLowerCase();
    let domain = raw;

    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        domain = new URL(raw).hostname;
      }
    } catch {
      // ignore
    }

    domain = domain.replace(/^www\./, "").replace(/\/+$/, "");

    if (!domain) {
      setStatus("Competitor domain is required.");
      return;
    }

    const r = compRating.trim() === "" ? null : safeNum(compRating);
    const tr = compReviews.trim() === "" ? null : safeNum(compReviews);

    const { error } = await supabase.from("gbp_competitor_metrics").upsert(
      {
        project_id: projectId,
        competitor_domain: domain,
        competitor_name: compName.trim() || null,
        source: compSource,
        rating: r,
        total_reviews: tr,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "project_id,competitor_domain" }
    );

    if (error) {
      setStatus(error.message);
      return;
    }

    setCompDomain("");
    setCompName("");
    setCompSource("manual");
    setCompRating("");
    setCompReviews("");
    await loadAll();
    setStatus("Saved competitor metrics.");
  }

  async function deleteCompetitor(id: string) {
    setStatus(null);
    const { error } = await supabase.from("gbp_competitor_metrics").delete().eq("id", id);
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadAll();
  }

  // Review analytics
  const yourReviews = gbp?.total_reviews ?? null;

  const topComp = useMemo(() => {
    if (competitors.length === 0) return null;
    return competitors[0];
  }, [competitors]);

  const gapReviews = useMemo(() => {
    if (yourReviews === null || topComp?.total_reviews === null || topComp?.total_reviews === undefined) return null;
    return Math.max(0, Number(topComp.total_reviews) - Number(yourReviews));
  }, [yourReviews, topComp]);

  const desiredTarget90d = useMemo(() => {
    if (gapReviews === null) return null;
    if (gapReviews > 100) return Math.ceil(gapReviews * 0.25);
    return Math.ceil(gapReviews * 0.5);
  }, [gapReviews]);

  const maxReviews90d = useMemo(() => {
    const monthly = project?.monthly_customer_events ?? null;
    const convPct = project?.review_conversion_rate ?? null;
    if (monthly === null || convPct === null) return null;

    const reviewsPerMonth = monthly * (convPct / 100);
    return Math.floor(reviewsPerMonth * 3);
  }, [project]);

  const realisticTarget90d = useMemo(() => {
    if (desiredTarget90d === null) return null;
    if (maxReviews90d === null) return desiredTarget90d;
    return Math.min(desiredTarget90d, maxReviews90d);
  }, [desiredTarget90d, maxReviews90d]);

  const perWeek = useMemo(() => {
    if (realisticTarget90d === null) return null;
    return Math.max(0, Math.ceil(realisticTarget90d / 13));
  }, [realisticTarget90d]);

  const monthsToCloseGap = useMemo(() => {
    const monthly = project?.monthly_customer_events ?? null;
    const convPct = project?.review_conversion_rate ?? null;
    if (gapReviews === null || monthly === null || convPct === null) return null;

    const monthlyCap = monthly * (convPct / 100);
    if (monthlyCap <= 0) return null;
    return Math.ceil(gapReviews / monthlyCap);
  }, [gapReviews, project]);

  const hasCapacity = project?.monthly_customer_events !== null && project?.review_conversion_rate !== null;
  const hasGbp = !!gbp?.gbp_name && gbp?.total_reviews !== null && gbp?.total_reviews !== undefined;
  const hasCompetitors = competitors.length > 0;

  const setupDoneCount = [hasGbp, hasCompetitors, hasCapacity].filter(Boolean).length;

  const setupStep = (ok: boolean, title: string, desc: string, action: () => void) => (
    <button
      onClick={action}
      className={[
        "w-full rounded-2xl border p-3 text-left transition",
        ok ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 hover:bg-zinc-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-zinc-900">{title}</div>
          <div className="mt-1 text-xs text-zinc-600">{desc}</div>
        </div>
        <Badge ok={ok} label={ok ? "Done" : "Next"} />
      </div>
    </button>
  );

  if (loading) return <div className="p-8">Loading dashboard…</div>;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-6 pb-28 md:px-6 md:pb-6">
        {/* Top nav */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push(`/clients/${clientId}`)}
            className="text-sm font-semibold underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            ← Back to projects
          </button>
          <button
            onClick={() => router.push("/clients")}
            className="text-sm font-semibold underline underline-offset-4 opacity-60 hover:opacity-100"
          >
            Clients
          </button>
        </div>

        {/* Header */}
        <div className="mt-4">
          <div className="text-2xl font-black tracking-tight md:text-3xl">
            {client ? client.name : "Client"} — Project Dashboard
          </div>
          {project && (
            <div className="mt-2 text-sm text-zinc-700 md:text-base">
              <span className="font-bold">{project.site_url}</span>
              <span className="mx-2 opacity-40">•</span>
              {project.category}
              <span className="mx-2 opacity-40">•</span>
              {project.metro}
              <span className="mx-2 opacity-40">•</span>
              {project.radius_miles} mi
            </div>
          )}
        </div>

        {/* Desktop tabs only */}
        <div className="mt-4 hidden md:block">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <TabPill key={t.key} active={tab === t.key} label={t.label} onClick={() => setTab(t.key)} />
            ))}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900">
            {status}
          </div>
        )}

        {/* CONTENT */}
        <div className="mt-4">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="grid gap-4">
              <Card
                title="Setup checklist"
                subtitle={`Complete these 3 steps once — then everything else becomes automatic. (${setupDoneCount}/3 done)`}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {setupStep(
                    hasGbp,
                    "1) Add your GBP snapshot",
                    "Business name, category, rating, total reviews (manual MVP).",
                    () => setTab("settings")
                  )}
                  {setupStep(
                    hasCompetitors,
                    "2) Add 3–4 competitors",
                    "Start with the top businesses you see in Google Maps for this category/metro.",
                    () => setTab("settings")
                  )}
                  {setupStep(
                    hasCapacity,
                    `3) Set monthly volume + review rate`,
                    `How many ${labelPlural}/month and what % leave a review when asked.`,
                    () => setTab("settings")
                  )}
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card
                  title="Your GBP"
                  subtitle="Manual MVP snapshot (automation later)."
                  right={<Badge ok={hasGbp} label={hasGbp ? "Saved" : "Missing"} />}
                >
                  <div className="space-y-1 text-sm text-zinc-900">
                    <div className="font-black">{gbp?.gbp_name ?? "—"}</div>
                    <div className="text-xs text-zinc-600">
                      {gbp?.primary_category ?? "—"}
                    </div>
                    <div className="pt-2">
                      <span className="font-extrabold">Rating:</span> {gbp?.rating ?? "—"}
                      <span className="mx-2 opacity-40">•</span>
                      <span className="font-extrabold">Reviews:</span> {gbp?.total_reviews ?? "—"}
                      <span className="mx-2 opacity-40">•</span>
                      <span className="font-extrabold">Photos:</span> {gbp?.photos_count ?? "—"}
                    </div>
                    <div className="pt-2 text-xs text-zinc-500">
                      Last updated: {gbp?.last_fetched_at ? new Date(gbp.last_fetched_at).toLocaleString() : "—"}
                    </div>
                  </div>
                </Card>

                <Card
                  title="Top competitor"
                  subtitle="Highest reviews from saved competitors."
                  right={<Badge ok={hasCompetitors} label={hasCompetitors ? "Saved" : "Missing"} />}
                >
                  {topComp ? (
                    <div className="space-y-1 text-sm text-zinc-900">
                      <div className="font-black">{topComp.competitor_name ?? "—"}</div>
                      <div className="break-words text-xs text-zinc-600">{formatDomain(topComp.competitor_domain)}</div>
                      <div className="pt-2">
                        <span className="font-extrabold">Rating:</span> {topComp.rating ?? "—"}
                        <span className="mx-2 opacity-40">•</span>
                        <span className="font-extrabold">Reviews:</span> {topComp.total_reviews ?? "—"}
                      </div>
                      <div className="pt-2 text-xs text-zinc-500">
                        Source: {topComp.source} • Last seen: {new Date(topComp.last_seen_at).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-700">Add competitors in Settings.</div>
                  )}
                </Card>

                <Card
                  title="Review target (next 90 days)"
                  subtitle="Primary = realistic. Secondary = gap-based ideal."
                  right={<Badge ok={hasGbp && hasCompetitors} label={hasGbp && hasCompetitors ? "Ready" : "Needs data"} />}
                >
                  {gapReviews === null ? (
                    <div className="text-sm text-zinc-700">
                      Add your review count and at least one competitor review count.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-zinc-500">Realistic target (capacity-aware)</div>
                        <div className="mt-1 flex items-end gap-2">
                          <div className="text-4xl font-black leading-none md:text-5xl">{realisticTarget90d ?? "—"}</div>
                          <div className="pb-1 text-xs font-extrabold text-zinc-500">/ 90 days</div>
                        </div>
                        <div className="mt-1 text-sm text-zinc-800">
                          ~<span className="font-black">{perWeek ?? "—"}</span>/week
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                        <div>
                          <span className="font-extrabold">Review gap:</span> {gapReviews}
                        </div>
                        <div className="mt-1">
                          <span className="font-extrabold">Gap-based ideal:</span> {desiredTarget90d ?? "—"} / 90 days{" "}
                          <span className="text-zinc-500">(changes only when gap changes)</span>
                        </div>
                        <div className="mt-1">
                          <span className="font-extrabold">Capacity limit:</span>{" "}
                          {maxReviews90d === null ? "Not set (go to Settings)" : `${maxReviews90d} / 90 days`}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <Card title="Why this matters" subtitle="Plain-English explanation of targets">
                {!hasCapacity ? (
                  <div className="text-sm text-zinc-800">
                    The tool shows two targets:
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>
                        <span className="font-extrabold">Gap-based ideal</span> = SEO math (how many reviews to close the competitor gap fast).
                      </li>
                      <li>
                        <span className="font-extrabold">Realistic target</span> = what your business can actually produce based on monthly volume.
                      </li>
                    </ul>
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs text-amber-800">
                      Next step: go to <span className="font-extrabold">Settings</span> and enter monthly {labelPlural} + % who leave a review when asked.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-800">
                    You told us you average{" "}
                    <span className="font-black">{project?.monthly_customer_events}</span> {labelPlural}/month and convert about{" "}
                    <span className="font-black">{project?.review_conversion_rate}%</span> into reviews when you ask.
                    <div className="mt-2">
                      That sets a realistic ceiling for what you can accomplish in 90 days.
                    </div>
                    {monthsToCloseGap !== null && gapReviews !== null ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                        At your current pace, closing the full gap (~{gapReviews}) would take about{" "}
                        <span className="font-extrabold">{monthsToCloseGap}</span> months.
                      </div>
                    ) : null}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* DATA */}
          {tab === "data" && (
            <div className="grid gap-4">
              <Card title="Data status" subtitle="MVP is manual. Automation comes next.">
                <div className="grid gap-2 text-sm text-zinc-800">
                  <div>• GBP snapshot: {hasGbp ? "Saved ✅" : "Missing ⚠️"}</div>
                  <div>• Competitors: {hasCompetitors ? `${competitors.length} saved ✅` : "Missing ⚠️"}</div>
                  <div>• Capacity model: {hasCapacity ? "Saved ✅" : "Missing ⚠️"}</div>
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  Next: nightly Maps pulls + weekly SERP pulls + review velocity tracking.
                </div>
              </Card>
            </div>
          )}

          {/* ACTION PLAN */}
          {tab === "actions" && (
            <div className="grid gap-4">
              <Card title="Action plan" subtitle="Capacity-aware weekly plan">
                <div className="text-sm text-zinc-800">
                  Target:{" "}
                  <span className="font-black">{realisticTarget90d ?? "—"}</span> reviews in 90 days (~{" "}
                  <span className="font-black">{perWeek ?? "—"}</span>/week).
                </div>

                <div className="mt-4">
                  <div className="text-sm font-extrabold text-zinc-900">High-conversion playbook</div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-800">
                    <li>Ask at the “moment of success” (right after the {labelSingular.toLowerCase()} is complete).</li>
                    <li>Send the review link by SMS within 30 minutes.</li>
                    <li>Use a two-step ask: “Was everything great?” → if yes, request review.</li>
                    <li>Put the review link on invoices, estimates, email signatures.</li>
                    <li>Respond to every review within 48 hours.</li>
                  </ol>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                  Next iteration: we’ll generate a weekly schedule and track completion.
                </div>
              </Card>
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="grid gap-4">
              <Card title="Review capacity" subtitle="This is what makes targets realistic.">
                <div className="text-sm text-zinc-800">
                  Choose your business type, then enter:
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Monthly volume (how many {labelPlural} you do per month)</li>
                    <li>Review conversion (% who leave a review when asked)</li>
                  </ul>
                </div>

                <form onSubmit={saveProjectReviewCapacity} className="mt-4 grid gap-3">
                  <div className="grid gap-2">
                    <label className="text-sm font-extrabold text-zinc-900">Business type</label>
                    <select
                      value={volumePreset}
                      onChange={(e) => {
                        const next = e.target.value;
                        setVolumePreset(next);

                        const p = presetOptions.find((x) => x.key === next) || presetOptions[0];
                        if (p.key !== "custom") {
                          setEventLabelSingular(p.singular);
                          setEventLabelPlural(p.plural);
                          setShowAdvancedLabels(false);
                        } else {
                          setShowAdvancedLabels(true);
                        }
                      }}
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    >
                      {presetOptions.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                      <div className="font-extrabold">{preset.label}</div>
                      <div className="mt-1">{preset.helper}</div>
                      <div className="mt-1 text-zinc-500">{preset.example}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedLabels((v) => !v)}
                      className={[
                        "w-fit rounded-xl border px-3 py-2 text-sm font-extrabold",
                        showAdvancedLabels
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-900 text-zinc-900 hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      {showAdvancedLabels ? "Hide advanced labels" : "Advanced: custom wording"}
                    </button>

                    {showAdvancedLabels && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={eventLabelSingular}
                          onChange={(e) => setEventLabelSingular(e.target.value)}
                          placeholder="Singular (ex: Job)"
                          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        />
                        <input
                          value={eventLabelPlural}
                          onChange={(e) => setEventLabelPlural(e.target.value)}
                          placeholder="Plural (ex: Jobs)"
                          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-extrabold text-zinc-900">
                        Monthly volume ({labelPlural}/month)
                      </label>
                      <input
                        value={monthlyEvents}
                        onChange={(e) => setMonthlyEvents(e.target.value)}
                        placeholder="Example: 12"
                        className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                      <div className="text-xs text-zinc-500">
                        Use an average. If unsure, estimate based on the last 30–60 days.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-extrabold text-zinc-900">% who leave a review when asked</label>
                      <input
                        value={reviewConvRate}
                        onChange={(e) => setReviewConvRate(e.target.value)}
                        placeholder="Example: 40"
                        className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                      <div className="text-xs text-zinc-500">
                        Start 30–50%. With a strong system, 60–80% is possible.
                      </div>
                    </div>
                  </div>

                  <button className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold hover:bg-zinc-50">
                    Save capacity settings
                  </button>
                </form>
              </Card>

              <Card title="Your GBP snapshot" subtitle="Manual MVP. Automation later.">
                <form onSubmit={saveGbpProfile} className="mt-2 grid gap-3">
                  <input
                    value={gbpName}
                    onChange={(e) => setGbpName(e.target.value)}
                    placeholder="GBP Business Name"
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={primaryCategory}
                      onChange={(e) => setPrimaryCategory(e.target.value)}
                      placeholder="Primary category (ex: Landscaper)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={placeId}
                      onChange={(e) => setPlaceId(e.target.value)}
                      placeholder="Place ID (optional)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <input
                    value={gbpUrl}
                    onChange={(e) => setGbpUrl(e.target.value)}
                    placeholder="GBP / Maps URL (optional)"
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      placeholder="Rating (ex: 4.7)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={totalReviews}
                      onChange={(e) => setTotalReviews(e.target.value)}
                      placeholder="Total reviews (ex: 128)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={photosCount}
                      onChange={(e) => setPhotosCount(e.target.value)}
                      placeholder="Photos (optional)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <button className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold hover:bg-zinc-50">
                    Save GBP snapshot
                  </button>
                </form>
              </Card>

              <Card title="Competitors" subtitle="Manual MVP list. Automation later.">
                <form onSubmit={addOrUpdateCompetitor} className="mt-2 grid gap-3">
                  <input
                    value={compDomain}
                    onChange={(e) => setCompDomain(e.target.value)}
                    placeholder="Competitor domain or URL (ex: sunvalleyomaha.com)"
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    required
                  />

                  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <input
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                      placeholder="Competitor name (optional)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={compSource}
                      onChange={(e) => setCompSource(e.target.value)}
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    >
                      <option value="manual">manual</option>
                      <option value="maps">maps</option>
                      <option value="serp">serp</option>
                    </select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={compRating}
                      onChange={(e) => setCompRating(e.target.value)}
                      placeholder="Rating (ex: 4.6)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={compReviews}
                      onChange={(e) => setCompReviews(e.target.value)}
                      placeholder="Total reviews (ex: 186)"
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <button className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold hover:bg-zinc-50">
                    Save competitor
                  </button>
                </form>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-extrabold text-zinc-900">Saved competitors</div>
                  {competitors.length === 0 ? (
                    <div className="text-sm text-zinc-700">None yet.</div>
                  ) : (
                    <div className="grid gap-3">
                      {competitors.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="break-words text-sm font-black text-zinc-900">
                              {formatDomain(c.competitor_domain)}
                            </div>
                            <div className="mt-1 text-sm text-zinc-800">
                              {c.competitor_name ?? "—"} • {c.source} • Rating: {c.rating ?? "—"} • Reviews:{" "}
                              {c.total_reviews ?? "—"}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Last seen: {new Date(c.last_seen_at).toLocaleString()}
                            </div>
                          </div>

                          <button
                            onClick={() => deleteCompetitor(c.id)}
                            className="w-fit rounded-xl border border-zinc-900 px-3 py-2 text-sm font-extrabold hover:bg-zinc-50"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav tab={tab} setTab={setTab} />
    </>
  );
}