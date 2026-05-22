"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectWebsitePageState } from "@/lib/website/useProjectWebsitePageState";

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

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

function MetricStripItem({
  label,
  value,
  bg,
  tone,
}: {
  label: string;
  value: string;
  bg: string;
  tone: string;
}) {
  return (
    <div className="px-4 py-4" style={{ backgroundColor: bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="mt-2 text-3xl font-semibold tracking-tight"
        style={{ color: tone }}
      >
        {value}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

function InlineTag({
  children,
  tone,
  bg,
  border,
}: {
  children: ReactNode;
  tone?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <span
      className="inline-flex items-center border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: tone ?? "var(--text-body)",
        backgroundColor: bg ?? "transparent",
        borderColor: border ?? "var(--border)",
      }}
    >
      {children}
    </span>
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
        <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function EvidenceBullet({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-2 h-2.5 w-2.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{text}</span>
    </li>
  );
}

function boolLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function buildWebsiteAnchorSummary(input: {
  siteUrl: string | null;
  targetDomain: string | null;
  derivedSiteDomain: string | null;
  targetBrandName: string | null;
  hasDomainAlignment: boolean;
  websiteReadinessLabel: string;
}) {
  const {
    siteUrl,
    targetDomain,
    derivedSiteDomain,
    targetBrandName,
    hasDomainAlignment,
    websiteReadinessLabel,
  } = input;

  if (!siteUrl) {
    return "Digital Brain does not have a saved website URL yet, so the website connection is not set up yet.";
  }

  if (siteUrl && !targetDomain && derivedSiteDomain) {
    return `A website URL is saved and points to ${derivedSiteDomain}, but the main domain still needs to be confirmed.`;
  }

  if (siteUrl && targetDomain && derivedSiteDomain && !hasDomainAlignment) {
    return `The saved website URL points to ${derivedSiteDomain}, while the target domain is ${targetDomain}. Those two website details still need to match.`;
  }

  if (siteUrl && targetDomain && !targetBrandName) {
    return `The website and domain are mostly set, but the saved brand name still needs to be added. The current website read is ${websiteReadinessLabel}.`;
  }

  if (siteUrl && targetDomain && targetBrandName && hasDomainAlignment) {
    return `The website URL, domain, and brand name are all saved and aligned clearly enough for a strong website identity read.`;
  }

  return `The saved website connection is partially set, and the current website read is ${websiteReadinessLabel}.`;
}

function buildWebsiteAlignmentSummary(input: {
  hasSiteUrl: boolean;
  hasTargetDomain: boolean;
  hasBrandName: boolean;
  hasDerivedSiteDomain: boolean;
  hasDomainAlignment: boolean;
  targetDomain: string | null;
  derivedSiteDomain: string | null;
  targetBrandName: string | null;
  websiteReadinessLabel: string;
}) {
  const {
    hasSiteUrl,
    hasTargetDomain,
    hasBrandName,
    hasDerivedSiteDomain,
    hasDomainAlignment,
    targetDomain,
    derivedSiteDomain,
    targetBrandName,
    websiteReadinessLabel,
  } = input;

  if (!hasSiteUrl) {
    return "No website URL is saved yet, so there is no trustworthy website anchor to align against.";
  }

  if (hasSiteUrl && !hasTargetDomain && hasDerivedSiteDomain) {
    return `Digital Brain can derive ${derivedSiteDomain} from the saved website URL, but the target domain still needs to be locked explicitly.`;
  }

  if (hasSiteUrl && hasTargetDomain && hasDerivedSiteDomain && !hasDomainAlignment) {
    return `The saved website URL currently resolves to ${derivedSiteDomain}, while the saved target domain is ${targetDomain}. Those two identity anchors still disagree.`;
  }

  if (hasSiteUrl && hasTargetDomain && hasDerivedSiteDomain && hasDomainAlignment && !hasBrandName) {
    return "The website URL and domain anchor now agree, but the business brand name still needs to be saved to complete the identity layer.";
  }

  if (hasSiteUrl && hasTargetDomain && hasDerivedSiteDomain && hasDomainAlignment && hasBrandName) {
    return targetBrandName
      ? `The website URL, target domain, and saved brand name (${targetBrandName}) are aligned clearly enough for a strong website identity footing.`
      : "The website URL, target domain, and saved brand name are aligned clearly enough for a strong website identity footing.";
  }

  return `The saved website identity is partially anchored, and the current website read is ${websiteReadinessLabel}.`;
}

export default function ProjectWebsitePage({ params }: PageProps) {
  const { projectId, dashboardContext, websiteSummary, loading, error } =
    useProjectWebsitePageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading website read...
          </p>
        </div>
      </main>
    );
  }

  if (error || !websiteSummary) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load website page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const websiteAnchorSummary = buildWebsiteAnchorSummary({
    siteUrl: websiteSummary.siteUrl,
    targetDomain: websiteSummary.targetDomain,
    derivedSiteDomain: websiteSummary.derivedSiteDomain,
    targetBrandName: websiteSummary.targetBrandName,
    hasDomainAlignment: websiteSummary.hasDomainAlignment,
    websiteReadinessLabel: websiteSummary.websiteReadinessLabel,
  });

  const websiteAlignmentSummary = buildWebsiteAlignmentSummary({
    hasSiteUrl: websiteSummary.hasSiteUrl,
    hasTargetDomain: websiteSummary.hasTargetDomain,
    hasBrandName: websiteSummary.hasBrandName,
    hasDerivedSiteDomain: websiteSummary.hasDerivedSiteDomain,
    hasDomainAlignment: websiteSummary.hasDomainAlignment,
    targetDomain: websiteSummary.targetDomain,
    derivedSiteDomain: websiteSummary.derivedSiteDomain,
    targetBrandName: websiteSummary.targetBrandName,
    websiteReadinessLabel: websiteSummary.websiteReadinessLabel,
  });

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Website growth center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                Make the website clearly match the business customers and Google
                see.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page checks whether the website, domain, business name, and
                location signals are clear enough to support local visibility and
                customer trust.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                Check that the business name, service, location, and contact path
                are easy to find.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                The website should quickly tell customers and Google who the
                business is, what it does, where it serves customers, and how to
                take the next step.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag
                  tone="var(--accent-blue-600)"
                  bg="var(--accent-blue-100)"
                  border="var(--accent-blue-600)"
                >
                  {websiteSummary.websiteReadinessLabel}
                </InlineTag>
                <InlineTag>
                  Who: {websiteSummary.nextAction.whoShouldDoIt}
                </InlineTag>
                <InlineTag>
                  Difficulty: {websiteSummary.nextAction.difficulty}
                </InlineTag>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta
              label="Business"
              value={dashboardContext?.projectDisplayName ?? "Not set"}
            />
            <HeaderMeta
              label="Domain"
              value={dashboardContext?.domainDisplayValue ?? "Not set"}
            />
            <HeaderMeta
              label="Location / Market"
              value={
                dashboardContext?.projectLocationLabel ??
                dashboardContext?.projectMetro ??
                "Not set"
              }
            />
            <HeaderMeta
              label="Scope"
              value={dashboardContext?.pageScopeLabel ?? "Not set"}
            />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(dashboardContext?.capturedAt ?? null)}
            />
          </div>
        </section>

        <section className="border-b border-[var(--border)] py-6">
          <SectionLabel>Current website summary</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricStripItem
              label="Website score"
              value={`${websiteSummary.websiteReadinessScore}`}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Website URL saved"
              value={boolLabel(websiteSummary.hasSiteUrl)}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Target domain saved"
              value={boolLabel(websiteSummary.hasTargetDomain)}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Brand name saved"
              value={boolLabel(websiteSummary.hasBrandName)}
              bg="var(--reference-soft)"
              tone="var(--text-strong)"
            />
            <MetricStripItem
              label="Domain aligned"
              value={boolLabel(websiteSummary.hasDomainAlignment)}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-5">
            <SectionLabel>What the saved website anchor shows</SectionLabel>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              {websiteAnchorSummary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <InlineTag>
                Website URL: {websiteSummary.siteUrl ?? "Not set"}
              </InlineTag>
              <InlineTag>
                Target domain: {websiteSummary.targetDomain ?? "Not set"}
              </InlineTag>
              <InlineTag>
                Domain from URL: {websiteSummary.derivedSiteDomain ?? "Not set"}
              </InlineTag>
              <InlineTag>
                Read: {websiteSummary.websiteReadinessLabel}
              </InlineTag>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <SectionLabel>What the saved alignment signals show</SectionLabel>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
                {websiteAlignmentSummary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag>
                  Brand name saved: {boolLabel(websiteSummary.hasBrandName)}
                </InlineTag>
                <InlineTag>
                  Domain aligned: {boolLabel(websiteSummary.hasDomainAlignment)}
                </InlineTag>
                <InlineTag>
                  Brand: {websiteSummary.targetBrandName ?? "Not set"}
                </InlineTag>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next website move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Start by making sure the website clearly says who the business is,
              what it does, where it serves customers, and how people can take
              the next step.
            </p>

            <div className="mt-6">
              {[
                {
                  title: "Make the business identity obvious on the website",
                  detail:
                    "The website should clearly show the business name, main service, location or market, and the best way for a customer to contact the business.",
                },
                {
                  title: "Match the website to the Google Business Profile",
                  detail:
                    "The business name, website domain, service language, and location signals should agree with what Google sees in the Business Profile.",
                },
                {
                  title: "Keep the contact path easy to find",
                  detail:
                    "Customers should not have to hunt for the phone number, contact form, address, service area, or next step.",
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className={`grid gap-4 py-6 md:grid-cols-[56px_1fr] md:items-start ${
                    index === 2 ? "" : "border-b border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center md:justify-center">
                    <div
                      className="flex h-11 w-11 items-center justify-center text-sm font-semibold"
                      style={{
                        backgroundColor:
                          index === 0
                            ? "var(--brand-700)"
                            : "var(--reference-soft)",
                        color: index === 0 ? "#ffffff" : "var(--text-strong)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-lg font-semibold tracking-tight text-[var(--text-strong)]">
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                      {item.detail}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Website clarity checklist</SectionLabel>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-body)]">
                These are the owner-friendly checks that make the website easier
                for customers and Google to understand.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  "Business name is easy to find.",
                  "Main service is clear near the top of the page.",
                  "City, market, or service area is visible.",
                  "Phone number or contact path is obvious.",
                  "Website wording matches the Google Business Profile.",
                ].map((item) => (
                  <div
                    key={item}
                    className="border-t border-[var(--border)] pt-4"
                  >
                    <p className="text-sm font-semibold leading-6 text-[var(--text-strong)]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Website evidence</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Website read"
                  value={websiteSummary.websiteReadinessLabel}
                  helper={websiteSummary.plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={websiteSummary.topIssue}
                  helper={websiteSummary.whyItMatters}
                />
                <DetailRow
                  label="Site URL"
                  value={websiteSummary.siteUrl ?? "Not set"}
                />
                <DetailRow
                  label="Target domain"
                  value={websiteSummary.targetDomain ?? "Not set"}
                />
                <DetailRow
                  label="Derived domain"
                  value={websiteSummary.derivedSiteDomain ?? "Not set"}
                />
                <DetailRow
                  label="Brand name"
                  value={websiteSummary.targetBrandName ?? "Not set"}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <SectionLabel>Open another center</SectionLabel>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/projects/${projectId}/owner`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Back to owner page
                </Link>
                <Link
                  href={`/projects/${projectId}/actions`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open actions page
                </Link>
                <Link
                  href={`/projects/${projectId}/rank`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open rank page
                </Link>
                <Link
                  href={`/projects/${projectId}/authority`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open authority page
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {websiteSummary.evidence.map((item, index) => (
                  <EvidenceBullet
                    key={`${index}-${item}`}
                    text={item}
                    color={
                      index === 0
                        ? "var(--brand-600)"
                        : index === 1
                          ? "var(--accent-blue-600)"
                          : index === 2
                            ? "var(--success)"
                            : index === 3
                              ? "var(--warning)"
                              : "var(--accent-mint-600)"
                    }
                  />
                ))}
              </ul>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Website read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Website read"
                  value={websiteSummary.websiteReadinessLabel}
                  helper="This is the current website read for the saved project data."
                />
                <DetailRow
                  label="Who should do it"
                  value={websiteSummary.nextAction.whoShouldDoIt}
                  helper="This is who should handle the next website fix."
                />
                <DetailRow
                  label="Difficulty"
                  value={websiteSummary.nextAction.difficulty}
                  helper="This shows how hard the next website move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {websiteSummary.websiteReadinessScore}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  website identity score right now
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${websiteSummary.websiteReadinessScore}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Website URL saved"
                    value={boolLabel(websiteSummary.hasSiteUrl)}
                  />
                  <HeaderMeta
                    label="Brand name saved"
                    value={boolLabel(websiteSummary.hasBrandName)}
                  />
                  <HeaderMeta
                    label="Domain aligned"
                    value={boolLabel(websiteSummary.hasDomainAlignment)}
                  />
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}