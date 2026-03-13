"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ClientRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  client_id: string;
  site_url: string;
  category: string;
  metro: string;
  radius_miles: number;
  created_at: string;
};

function normalizeSiteUrl(input: string): string {
  const raw = input.trim();

  if (!raw) {
    return "";
  }

  try {
    const withProtocol =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `https://${raw}`;

    return new URL(withProtocol).toString();
  } catch {
    return raw;
  }
}

function extractDomainFromUrl(input: string): string | null {
  const normalized = normalizeSiteUrl(input);

  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function titleCaseToken(token: string): string {
  if (!token) {
    return "";
  }

  if (/^[A-Z0-9]+$/.test(token)) {
    return token;
  }

  if (/^[a-z]{2,4}$/.test(token)) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

const COMPACT_BUSINESS_SUFFIXES: Array<{
  compact: string;
  label: string;
}> = [
  { compact: "lawnandlandscape", label: "Lawn & Landscape" },
  { compact: "lawnandlandscaping", label: "Lawn & Landscaping" },
  { compact: "lawncareandlandscape", label: "Lawn Care & Landscape" },
  { compact: "lawncareandlandscaping", label: "Lawn Care & Landscaping" },
  { compact: "landscapedesignbuild", label: "Landscape Design Build" },
  { compact: "landscapedesign", label: "Landscape Design" },
  { compact: "landscapeconstruction", label: "Landscape Construction" },
  { compact: "landscapingcompany", label: "Landscaping Company" },
  { compact: "landscapingservice", label: "Landscaping Service" },
  { compact: "landscapingservices", label: "Landscaping Services" },
  { compact: "landscapecompany", label: "Landscape Company" },
  { compact: "landscapesupply", label: "Landscape Supply" },
  { compact: "lawnmaintenance", label: "Lawn Maintenance" },
  { compact: "lawnservice", label: "Lawn Service" },
  { compact: "lawnservices", label: "Lawn Services" },
  { compact: "lawncare", label: "Lawn Care" },
  { compact: "landscaping", label: "Landscaping" },
  { compact: "landscape", label: "Landscape" },
  { compact: "treeandlandscape", label: "Tree & Landscape" },
  { compact: "treeservice", label: "Tree Service" },
  { compact: "treecare", label: "Tree Care" },
  { compact: "outdoorliving", label: "Outdoor Living" },
  { compact: "hardscapes", label: "Hardscapes" },
  { compact: "hardscape", label: "Hardscape" },
  { compact: "irrigation", label: "Irrigation" },
  { compact: "contracting", label: "Contracting" },
  { compact: "contractors", label: "Contractors" },
  { compact: "contractor", label: "Contractor" },
];

function formatTokenSequence(input: string): string | null {
  const tokens = input
    .split(/[-_ ]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map(titleCaseToken).join(" ");
}

function inferBrandNameFromDomain(domain: string | null): string | null {
  if (!domain) {
    return null;
  }

  const firstSegment = domain.split(".")[0]?.trim().toLowerCase() ?? "";

  if (!firstSegment) {
    return null;
  }

  if (firstSegment.includes("-") || firstSegment.includes("_")) {
    return formatTokenSequence(firstSegment);
  }

  for (const suffix of COMPACT_BUSINESS_SUFFIXES) {
    if (!firstSegment.endsWith(suffix.compact)) {
      continue;
    }

    const prefix = firstSegment.slice(0, firstSegment.length - suffix.compact.length);
    const formattedPrefix = prefix
      ? formatTokenSequence(prefix) ?? titleCaseToken(prefix)
      : null;

    return formattedPrefix
      ? `${formattedPrefix} ${suffix.label}`.trim()
      : suffix.label;
  }

  return titleCaseToken(firstSegment);
}

function formatDomain(input: string): string {
  const domain = extractDomainFromUrl(input);
  return domain ?? "—";
}

export default function ClientProjectsPage() {
  const router = useRouter();
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const [client, setClient] = useState<ClientRow | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [siteUrl, setSiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [metro, setMetro] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("25");

  const normalizedPreviewDomain = useMemo(
    () => formatDomain(siteUrl),
    [siteUrl]
  );

  const inferredPreviewBrandName = useMemo(() => {
    const domain = extractDomainFromUrl(siteUrl);
    return inferBrandNameFromDomain(domain) ?? "Will infer after create";
  }, [siteUrl]);

  const requireAuth = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.replace("/login");
      return false;
    }

    return true;
  }, [router]);

  const loadClientPage = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id, name, notes, created_at")
      .eq("id", clientId)
      .single();

    if (clientError) {
      setStatus(clientError.message);
      setLoading(false);
      return;
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, client_id, site_url, category, metro, radius_miles, created_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (projectError) {
      setStatus(projectError.message);
      setLoading(false);
      return;
    }

    setClient(clientData as ClientRow);
    setProjects((projectData ?? []) as ProjectRow[]);
    setLoading(false);
  }, [clientId]);

  async function startProjectOnboarding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
    const normalizedCategory = category.trim();
    const normalizedMetro = metro.trim();
    const parsedRadius = Number(radiusMiles);
    const targetDomain = extractDomainFromUrl(normalizedSiteUrl);
    const targetBrandName = inferBrandNameFromDomain(targetDomain);

    if (!normalizedSiteUrl) {
      setStatus("Website URL is required.");
      setSubmitting(false);
      return;
    }

    if (!normalizedCategory) {
      setStatus("Business category is required.");
      setSubmitting(false);
      return;
    }

    if (!normalizedMetro) {
      setStatus("Target metro is required.");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
      setStatus("Radius miles must be a valid number greater than 0.");
      setSubmitting(false);
      return;
    }

    const roundedRadius = Math.round(parsedRadius);

    const { data, error } = await supabase
      .from("projects")
      .insert({
        client_id: clientId,
        site_url: normalizedSiteUrl,
        category: normalizedCategory,
        metro: normalizedMetro,
        radius_miles: roundedRadius,
        primary_category: normalizedCategory,
        target_metro: normalizedMetro,
        target_radius_miles: roundedRadius,
        target_domain: targetDomain,
        target_brand_name: targetBrandName,
      })
      .select("id")
      .single();

    if (error) {
      setStatus(error.message);
      setSubmitting(false);
      return;
    }

    const onboardingResponse = await fetch(
      `/api/projects/${data.id}/onboarding`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seedKeywords: [
            {
              keyword: normalizedCategory,
              metro: normalizedMetro,
              priority: 1,
              isActive: true,
            },
          ],
        }),
      }
    );

    if (!onboardingResponse.ok) {
      let onboardingError =
        "Project created, but onboarding could not be started.";

      try {
        const payload = (await onboardingResponse.json()) as {
          error?: string;
        };
        if (payload.error) {
          onboardingError = payload.error;
        }
      } catch {
        // ignore JSON parsing issues
      }

      setStatus(onboardingError);
      setSubmitting(false);
      return;
    }

    setSiteUrl("");
    setCategory("");
    setMetro("");
    setRadiusMiles("25");
    setSubmitting(false);

    router.push(`/clients/${clientId}/projects/${data.id}`);
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const isAuthed = await requireAuth();

      if (!isAuthed || !isActive) {
        return;
      }

      await loadClientPage();
    })();

    return () => {
      isActive = false;
    };
  }, [requireAuth, loadClientPage]);

  if (loading) {
    return <div className="p-8">Loading client…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.push("/clients")}
          className="text-sm font-semibold underline underline-offset-4 opacity-80 hover:opacity-100"
        >
          ← Back to clients
        </button>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          {client?.name ?? "Client"} — Projects
        </h1>
        {client?.notes ? (
          <p className="mt-2 max-w-3xl text-sm text-zinc-700 md:text-base">
            {client.notes}
          </p>
        ) : null}
      </div>

      {status ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900">
          {status}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-zinc-900">
                Start intelligent onboarding
              </h2>
              <p className="mt-2 text-sm text-zinc-700">
                Long-term goal: client enters the website URL and Digital Brain
                intelligently infers the rest. This page now creates projects in
                an automation-ready shape from day one.
              </p>
            </div>
            <div className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-extrabold text-zinc-700">
              URL-first
            </div>
          </div>

          <form onSubmit={startProjectOnboarding} className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-900">
                Website URL
              </label>
              <input
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="example.com"
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
                required
              />
              <div className="text-xs text-zinc-600">
                Domain preview:{" "}
                <span className="font-extrabold text-zinc-900">
                  {normalizedPreviewDomain}
                </span>
              </div>
              <div className="text-xs text-zinc-600">
                Brand preview:{" "}
                <span className="font-extrabold text-zinc-900">
                  {inferredPreviewBrandName}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                Minimum support inputs for now
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                These still exist for the transition period, but they now feed
                both UI fields and automation-facing identity fields.
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-extrabold text-zinc-900">
                    Business category
                  </label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Landscaper"
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-extrabold text-zinc-900">
                    Target metro
                  </label>
                  <input
                    value={metro}
                    onChange={(e) => setMetro(e.target.value)}
                    placeholder="Council Bluffs, IA"
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
                    required
                  />
                </div>

                <div className="grid gap-2 md:max-w-[220px]">
                  <label className="text-sm font-extrabold text-zinc-900">
                    Radius miles
                  </label>
                  <input
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(e.target.value)}
                    placeholder="25"
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              disabled={submitting}
              className="w-fit rounded-2xl border border-zinc-900 px-5 py-3 text-sm font-extrabold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Creating project…"
                : "Create project and continue →"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-zinc-900">
            What happens next
          </h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                1) Create project shell
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Store both user-facing project fields and automation-facing
                market identity fields.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                2) Start onboarding automatically
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Seed the first keyword and launch the onboarding job through a
                thin API route.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                3) Identity is now persisted
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                The project now stores target domain and target brand name as
                first-class identity inputs.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <div className="text-sm font-extrabold text-zinc-900">
                4) Land in dashboard
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                User reaches the project dashboard immediately instead of an
                empty manual setup screen.
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-zinc-900">
            Existing projects
          </h2>
          <div className="text-sm text-zinc-600">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700">
            No projects yet. Start with the website URL above.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="text-lg font-black text-zinc-900">
                  {formatDomain(project.site_url)}
                </div>

                <div className="mt-3 space-y-1 text-sm text-zinc-700">
                  <div>
                    <span className="font-extrabold text-zinc-900">
                      Category:
                    </span>{" "}
                    {project.category}
                  </div>
                  <div>
                    <span className="font-extrabold text-zinc-900">Metro:</span>{" "}
                    {project.metro}
                  </div>
                  <div>
                    <span className="font-extrabold text-zinc-900">
                      Radius:
                    </span>{" "}
                    {project.radius_miles} mi
                  </div>
                </div>

                <button
                  onClick={() =>
                    router.push(`/clients/${clientId}/projects/${project.id}`)
                  }
                  className="mt-4 rounded-2xl border border-zinc-900 px-4 py-2 text-sm font-extrabold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Open dashboard →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
