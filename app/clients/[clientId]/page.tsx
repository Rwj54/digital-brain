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

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unknown";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-t border-[var(--border)] py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
        {value}
      </div>
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

  const normalizedPreviewDomain = useMemo(() => formatDomain(siteUrl), [siteUrl]);

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
        <div className="mx-auto max-w-6xl">
          <section className="border-t border-[var(--border)] py-6">
            <p className="text-base text-[var(--text-body)]">
              Loading client workspace...
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-strong)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push("/clients")}
            className="text-sm font-semibold text-[var(--text-body)] underline underline-offset-4 opacity-90 hover:opacity-100"
          >
            ← Back to clients
          </button>
        </div>

        <section className="border-b border-[var(--border)] pb-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_240px] lg:items-start lg:gap-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                Client workspace
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2.15rem] sm:leading-tight">
                {client?.name ?? "Client"} — start a new project from the website
                first.
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
                This intake is URL-first. Digital Brain will infer the domain and
                brand immediately, save identity fields, create the project shell,
                and start onboarding automatically.
              </p>

              {client?.notes ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                  {client.notes}
                </p>
              ) : null}
            </div>

            <div className="border-l border-[var(--border)] pl-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                What happens next
              </div>

              <ol className="mt-3 grid gap-3 text-sm text-[var(--text-body)]">
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">1.</span>{" "}
                  Create the project shell and save identity fields.
                </li>
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">2.</span>{" "}
                  Start onboarding automatically with the first seed keyword.
                </li>
                <li className="border-t border-[var(--border)] pt-3">
                  <span className="font-semibold text-[var(--text-strong)]">3.</span>{" "}
                  Land directly in the working project dashboard.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {status ? (
          <section className="border-l-4 border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--danger)]">{status}</p>
          </section>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="border-t border-[var(--border)] pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Start intelligent onboarding
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
              Begin with the website URL.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-body)]">
              Long-term goal: URL-only onboarding. Current safe step: URL-mostly
              onboarding, with a few support details still required while the
              identity layer gets smarter.
            </p>

            <form onSubmit={startProjectOnboarding} className="mt-6 grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--text-strong)]">
                  Website URL
                </label>
                <input
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="example.com"
                  className="border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
                  required
                />
              </div>

              <section className="border border-[var(--border)] bg-[var(--reference-soft)] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Identity preview
                </div>

                <div className="mt-4 grid gap-3">
                  <PreviewRow
                    label="Domain preview"
                    value={normalizedPreviewDomain}
                  />
                  <PreviewRow
                    label="Brand preview"
                    value={inferredPreviewBrandName}
                  />
                </div>
              </section>

              <section className="border-t border-[var(--border)] pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Still needed for now
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                  These support inputs still power the current onboarding chain.
                  They are secondary, because the product is moving toward inferring
                  more of this automatically.
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
                      className="border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
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
                      className="border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
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
                      className="border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--brand-600)]"
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                      Defaults to 25 if left blank.
                    </p>
                  </div>
                </div>
              </section>

              <div className="pt-1">
                <button
                  disabled={submitting}
                  className="inline-flex items-center justify-center border border-[var(--brand-600)] bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Creating project..." : "Create project and continue"}
                </button>
              </div>
            </form>
          </section>

          <section className="border-t border-[var(--border)] pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Existing projects
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Open an existing project
                </h2>
              </div>

              <div className="text-sm text-[var(--text-body)]">
                <span className="font-semibold text-[var(--text-strong)]">
                  {projects.length}
                </span>{" "}
                project{projects.length === 1 ? "" : "s"}
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="text-sm leading-7 text-[var(--text-body)]">
                  No projects yet. Start with the website URL on the left.
                </p>
              </div>
            ) : (
              <div className="mt-6 border-t border-[var(--border)]">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className="grid gap-4 border-t border-[var(--border)] py-5 first:border-t-0 first:pt-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                          {formatDomain(project.site_url)}
                        </h3>
                        <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          Added {formatCreatedAt(project.created_at)}
                        </span>
                      </div>

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
                    </div>

                    <div className="md:pt-1">
                      <button
                        onClick={() =>
                          router.push(`/clients/${clientId}/projects/${project.id}`)
                        }
                        className="inline-flex items-center justify-center border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] transition hover:border-[var(--brand-600)] hover:text-[var(--brand-700)]"
                      >
                        Open dashboard
                      </button>
                    </div>
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