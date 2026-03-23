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

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">{value}</p>
    </div>
  );
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
      .select("id, client_id, site_url, category, metro, radius_miles, created_at")
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
    const normalizedRadiusInput = radiusMiles.trim();
    const parsedRadius = normalizedRadiusInput ? Number(normalizedRadiusInput) : 25;
    const targetDomain = extractDomainFromUrl(normalizedSiteUrl);
    const targetBrandName = inferBrandNameFromDomain(targetDomain);

    if (!normalizedSiteUrl) {
      setStatus("Website URL is required.");
      setSubmitting(false);
      return;
    }

    if (!normalizedCategory) {
      setStatus("Business category is still required for now.");
      setSubmitting(false);
      return;
    }

    if (!normalizedMetro) {
      setStatus("Target metro is still required for now.");
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

    const onboardingResponse = await fetch(`/api/projects/${data.id}/onboarding`, {
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
    });

    if (!onboardingResponse.ok) {
      let onboardingError = "Project created, but onboarding could not be started.";

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
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[28px] border border-[var(--border)] bg-white px-6 py-6 shadow-sm">
            <p className="text-base text-[var(--text-body)]">Loading client workspace...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/clients")}
            className="text-sm font-semibold text-[var(--text-body)] underline underline-offset-4 opacity-90 hover:opacity-100"
          >
            ← Back to clients
          </button>
        </div>

        <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                Client workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.15rem] sm:leading-tight">
                {client?.name ?? "Client"} — start a new project from the website first.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                This intake is now URL-first. Digital Brain will infer the
                domain and brand immediately, persist identity fields, create the
                project shell, and start onboarding automatically.
              </p>
              {client?.notes ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                  {client.notes}
                </p>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--primary-soft)] px-5 py-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-700)]">
                What Digital Brain does next
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    1) Create the project shell
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    Store the website plus automation-facing identity fields.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    2) Start onboarding automatically
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    Seed the first keyword and run the current onboarding chain.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">
                    3) Land in the project dashboard
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-body)]">
                    Move directly into a working project instead of an empty setup
                    flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {status ? (
          <section className="rounded-[24px] border border-[var(--danger)] bg-[var(--danger-soft)] px-5 py-4 shadow-sm">
            <p className="text-sm font-medium text-[var(--danger)]">{status}</p>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Start intelligent onboarding
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
              Begin with the website URL.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
              Long-term goal: URL-only onboarding. Current safe step: URL-mostly
              onboarding, with a few support details still required while the
              identity layer gets smarter.
            </p>

            <form onSubmit={startProjectOnboarding} className="mt-5 grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Website URL
                </label>
                <input
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="example.com"
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricPill label="Domain preview" value={normalizedPreviewDomain} />
                <MetricPill label="Brand preview" value={inferredPreviewBrandName} />
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--reference-soft)] px-4 py-4">
                <p className="text-sm font-semibold text-[var(--text-strong)]">
                  Still needed for now
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                  These support inputs still power the current onboarding chain.
                  They are intentionally secondary, because the product is moving
                  toward inferring more of this automatically.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[var(--text-strong)]">
                      Business category
                    </label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Landscaper"
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-semibold text-[var(--text-strong)]">
                      Target metro
                    </label>
                    <input
                      value={metro}
                      onChange={(e) => setMetro(e.target.value)}
                      placeholder="Council Bluffs, IA"
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                      required
                    />
                  </div>

                  <div className="grid gap-2 md:max-w-[220px]">
                    <label className="text-sm font-semibold text-[var(--text-strong)]">
                      Radius miles
                    </label>
                    <input
                      value={radiusMiles}
                      onChange={(e) => setRadiusMiles(e.target.value)}
                      placeholder="25"
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)]"
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                      Defaults to 25 if left blank.
                    </p>
                  </div>
                </div>
              </div>

              <button
                disabled={submitting}
                className="inline-flex w-fit items-center justify-center rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Creating project..." : "Create project and continue"}
              </button>
            </form>
          </section>

          <section className="rounded-[32px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Existing projects
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Open an existing project
                </h2>
              </div>

              <div className="rounded-full bg-[var(--reference-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-body)]">
                {projects.length} project{projects.length === 1 ? "" : "s"}
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--reference-soft)] px-5 py-5 text-sm text-[var(--text-body)]">
                No projects yet. Start with the website URL above.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-[24px] border border-[var(--border)] bg-[var(--reference-soft)] px-5 py-5"
                  >
                    <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                      {formatDomain(project.site_url)}
                    </h3>

                    <div className="mt-3 space-y-1 text-sm leading-7 text-[var(--text-body)]">
                      <div>
                        <span className="font-semibold text-[var(--text-strong)]">
                          Category:
                        </span>{" "}
                        {project.category}
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--text-strong)]">
                          Metro:
                        </span>{" "}
                        {project.metro}
                      </div>
                      <div>
                        <span className="font-semibold text-[var(--text-strong)]">
                          Radius:
                        </span>{" "}
                        {project.radius_miles} mi
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        router.push(`/clients/${clientId}/projects/${project.id}`)
                      }
                      className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] shadow-sm ring-1 ring-[var(--border)] transition hover:bg-[var(--brand-50)]"
                    >
                      Open dashboard
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}