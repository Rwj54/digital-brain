"use client";

import Link from "next/link";
import { type ReactNode } from "react";

import { useProjectIdentityPageState } from "@/lib/identity/useProjectIdentityPageState";

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

function textValue(value: string | null | undefined, fallback = "Not set") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function boolLabel(value: boolean | null | undefined) {
  return value ? "Yes" : "No";
}

function numericValue(value: number | null | undefined) {
  return typeof value === "number" ? `${value}` : "Not set";
}

function normalizeCompare(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function valuesLooselyMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeCompare(left);
  const b = normalizeCompare(right);

  if (!a || !b) {
    return false;
  }

  return a === b || a.includes(b) || b.includes(a);
}

function alignmentLabel(
  aligned: boolean | null,
  hasInputs: boolean,
  positiveLabel: string,
  negativeLabel: string,
) {
  if (!hasInputs || aligned === null) {
    return "Not enough detail";
  }

  return aligned ? positiveLabel : negativeLabel;
}

function dedupeEvidence(items: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const item of items) {
    const normalized = item.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

export default function ProjectIdentityPage({ params }: PageProps) {
  const {
    projectId,
    dashboardContext,
    aiSummary,
    websiteSummary,
    loading,
    error,
  } = useProjectIdentityPageState(params);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-base text-[var(--text-body)]">
            Loading identity read...
          </p>
        </div>
      </main>
    );
  }

  if (error || !aiSummary || !websiteSummary) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text-strong)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="border-t-2 border-[var(--danger)] pt-5">
            <p className="text-base font-medium text-[var(--danger)]">
              {error || "Failed to load identity page."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const gbpName =
    typeof aiSummary.gbpName === "string" ? aiSummary.gbpName : null;
  const projectBrandName =
    typeof aiSummary.targetBrandName === "string"
      ? aiSummary.targetBrandName
      : websiteSummary.targetBrandName;
  const primaryCategory =
    typeof aiSummary.primaryCategory === "string"
      ? aiSummary.primaryCategory
      : null;
  const projectCategory =
    typeof aiSummary.projectCategory === "string"
      ? aiSummary.projectCategory
      : websiteSummary.category;
  const siteUrl = websiteSummary.siteUrl;
  const targetDomain = websiteSummary.targetDomain;
  const derivedSiteDomain = websiteSummary.derivedSiteDomain;

  const hasNamingInputs = Boolean(gbpName && projectBrandName);
  const hasCategoryInputs = Boolean(primaryCategory && projectCategory);

  const namingAligned =
    typeof aiSummary.nameMatchesBrand === "boolean"
      ? aiSummary.nameMatchesBrand
      : hasNamingInputs
        ? valuesLooselyMatch(gbpName, projectBrandName)
        : null;

  const categoryAligned =
    typeof aiSummary.categoryMatchesProject === "boolean"
      ? aiSummary.categoryMatchesProject
      : hasCategoryInputs
        ? valuesLooselyMatch(primaryCategory, projectCategory)
        : null;

  const domainAligned = websiteSummary.hasDomainAlignment;

  const aiScore =
    typeof aiSummary.aiReadinessScore === "number"
      ? aiSummary.aiReadinessScore
      : null;
  const websiteScore =
    typeof websiteSummary.websiteReadinessScore === "number"
      ? websiteSummary.websiteReadinessScore
      : null;

  const availableScores = [aiScore, websiteScore].filter(
    (value): value is number => typeof value === "number",
  );

  const identityScore =
    availableScores.length > 0
      ? Math.round(
          availableScores.reduce((sum, value) => sum + value, 0) /
            availableScores.length,
        )
      : null;

  let identityRead = "Early identity footing looks good";
  let plainLanguageSummary =
    "The saved business name, category, website, and domain signals are giving Digital Brain a usable identity foundation.";
  let topIssue = "No major identity mismatch is visible from the saved data.";
  let whyItMatters =
    "When business naming, category, and website identity line up, Digital Brain can trust the business foundation more confidently.";
  let nextActionWho = websiteSummary.nextAction.whoShouldDoIt;
  let nextActionDifficulty = websiteSummary.nextAction.difficulty;
  if (
    !websiteSummary.hasSiteUrl ||
    !websiteSummary.hasTargetDomain ||
    !domainAligned
  ) {
    identityRead = "Identity foundation needs website and domain alignment";
    plainLanguageSummary =
      websiteSummary.plainLanguageSummary ||
      "The website and domain anchor still need attention before the identity foundation feels stable.";
    topIssue = websiteSummary.topIssue;
    whyItMatters = websiteSummary.whyItMatters;
    nextActionWho = websiteSummary.nextAction.whoShouldDoIt;
    nextActionDifficulty = websiteSummary.nextAction.difficulty;
  } else if (hasNamingInputs && namingAligned === false) {
    identityRead = "Identity foundation needs business-name alignment";
    plainLanguageSummary =
      typeof aiSummary.plainLanguageSummary === "string"
        ? aiSummary.plainLanguageSummary
        : "The saved business naming does not look fully aligned yet.";
    topIssue =
      typeof aiSummary.topIssue === "string"
        ? aiSummary.topIssue
        : "GBP business name and project brand name do not clearly match.";
    whyItMatters =
      typeof aiSummary.whyItMatters === "string"
        ? aiSummary.whyItMatters
        : "When names do not line up, machines can be less confident they are looking at the same business.";
    nextActionWho =
      aiSummary.nextAction &&
      typeof aiSummary.nextAction.whoShouldDoIt === "string"
        ? aiSummary.nextAction.whoShouldDoIt
        : aiSummary.nextAction &&
            typeof aiSummary.nextAction.who_should_do_it === "string"
          ? aiSummary.nextAction.who_should_do_it
          : "Owner or marketing lead";
    nextActionDifficulty =
      aiSummary.nextAction &&
      typeof aiSummary.nextAction.difficulty === "string"
        ? aiSummary.nextAction.difficulty
        : "Easy";
  } else if (hasCategoryInputs && categoryAligned === false) {
    identityRead = "Identity foundation needs category alignment";
    plainLanguageSummary =
      typeof aiSummary.plainLanguageSummary === "string"
        ? aiSummary.plainLanguageSummary
        : "Category wording across the project and GBP still needs review.";
    topIssue =
      typeof aiSummary.topIssue === "string"
        ? aiSummary.topIssue
        : "Project category and GBP primary category may not be aligned.";
    whyItMatters =
      typeof aiSummary.whyItMatters === "string"
        ? aiSummary.whyItMatters
        : "Category inconsistency can weaken machine understanding of what the business actually does.";
    nextActionWho =
      aiSummary.nextAction &&
      typeof aiSummary.nextAction.whoShouldDoIt === "string"
        ? aiSummary.nextAction.whoShouldDoIt
        : aiSummary.nextAction &&
            typeof aiSummary.nextAction.who_should_do_it === "string"
          ? aiSummary.nextAction.who_should_do_it
          : "Owner or marketing lead";
    nextActionDifficulty =
      aiSummary.nextAction &&
      typeof aiSummary.nextAction.difficulty === "string"
        ? aiSummary.nextAction.difficulty
        : "Easy";
  }

  const namingAlignmentLabel = alignmentLabel(
    namingAligned,
    hasNamingInputs,
    "Aligned",
    "Needs review",
  );

  const categoryAlignmentLabel = alignmentLabel(
    categoryAligned,
    hasCategoryInputs,
    "Aligned",
    "Needs review",
  );

  const domainAlignmentLabel = alignmentLabel(
    domainAligned,
    Boolean(targetDomain || derivedSiteDomain || siteUrl),
    "Aligned",
    "Needs review",
  );

  const combinedEvidence = dedupeEvidence([
    ...(Array.isArray(aiSummary.evidence) ? aiSummary.evidence : []),
    ...websiteSummary.evidence,
  ]).slice(0, 8);

  const identityHeadlineBusinessName =
    textValue(gbpName) !== "Not set"
      ? textValue(gbpName)
      : dashboardContext?.projectDisplayName ?? "this business";

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[var(--text-strong)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="border-b border-[var(--border)] pb-6">
          <SectionLabel>Business identity center</SectionLabel>

          <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
                Make sure {identityHeadlineBusinessName} looks like the same
                business everywhere.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
                This page checks whether the business name, category, website,
                and Google Business Profile details match clearly enough for
                customers, Google, and AI systems to trust the business.
              </p>
            </div>

            <div className="xl:pl-8">
              <SectionLabel>What to do now</SectionLabel>
              <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
                Check that the name, category, website, and Google profile all
                match.
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
                When the public details tell the same story, customers and
                Google have less confusion about which business they are seeing.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <InlineTag
                  tone="var(--accent-blue-600)"
                  bg="var(--accent-blue-100)"
                  border="var(--accent-blue-600)"
                >
                  {identityRead}
                </InlineTag>
                <InlineTag>Who: {nextActionWho}</InlineTag>
                <InlineTag>Difficulty: {nextActionDifficulty}</InlineTag>
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
          <SectionLabel>Current identity summary</SectionLabel>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricStripItem
              label="Identity score"
              value={numericValue(identityScore)}
              bg="var(--brand-100)"
              tone="var(--brand-700)"
            />
            <MetricStripItem
              label="Naming aligned"
              value={namingAlignmentLabel}
              bg="var(--accent-mint-100)"
              tone="var(--accent-mint-600)"
            />
            <MetricStripItem
              label="Category aligned"
              value={categoryAlignmentLabel}
              bg="var(--accent-blue-100)"
              tone="var(--accent-blue-600)"
            />
            <MetricStripItem
              label="Domain aligned"
              value={domainAlignmentLabel}
              bg="var(--success-soft)"
              tone="var(--success)"
            />
          </div>
        </section>

        <section className="grid gap-10 py-8 xl:grid-cols-[1.18fr_0.82fr]">
          <section>
            <SectionLabel>What to fix first</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
              The clearest next business identity move
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-body)]">
              Start with the biggest mismatch first. Once the business name,
              category, website, and Google profile agree, the rest of the
              guidance becomes easier to trust.
            </p>

            <div className="mt-6">
              {[
                {
                  title: "Make the business name match everywhere",
                  detail:
                    "The name customers see on the website should match the name Google sees in the Business Profile and project settings.",
                },
                {
                  title: "Make the category and service language clear",
                  detail:
                    "The business category and service wording should make it obvious what the business does and where it serves customers.",
                },
                {
                  title: "Keep the website and Google profile connected",
                  detail:
                    "The website URL, domain, business name, and contact details should all point to the same business.",
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
              <SectionLabel>Identity evidence</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Identity read"
                  value={identityRead}
                  helper={plainLanguageSummary}
                />
                <DetailRow
                  label="Top issue"
                  value={topIssue}
                  helper={whyItMatters}
                />
                <DetailRow
                  label="Google business name"
                  value={textValue(gbpName)}
                />
                <DetailRow
                  label="Project brand name"
                  value={textValue(projectBrandName)}
                />
                <DetailRow
                  label="Google primary category"
                  value={textValue(primaryCategory)}
                />
                <DetailRow
                  label="Project category"
                  value={textValue(projectCategory)}
                />
                <DetailRow
                  label="Site URL"
                  value={textValue(siteUrl)}
                />
                <DetailRow
                  label="Target domain"
                  value={textValue(targetDomain)}
                />
                <DetailRow
                  label="Derived site domain"
                  value={textValue(derivedSiteDomain)}
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
                  href={`/projects/${projectId}/ai`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open AI page
                </Link>
                <Link
                  href={`/projects/${projectId}/website`}
                  className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                  style={{
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                  }}
                >
                  Open website page
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
              </div>
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <SectionLabel>What this tells you</SectionLabel>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-body)]">
                {(combinedEvidence.length > 0
                  ? combinedEvidence
                  : ["No identity details are available yet."]).map(
                  (item, index) => (
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
                  ),
                )}
              </ul>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Identity read</SectionLabel>

              <div className="mt-4">
                <DetailRow
                  label="Identity read"
                  value={identityRead}
                  helper="This is the current identity read across the saved project, website, and Google Business Profile details."
                />
                <DetailRow
                  label="Who should do it"
                  value={nextActionWho}
                  helper="This is who should handle the next business identity fix."
                />
                <DetailRow
                  label="Difficulty"
                  value={nextActionDifficulty}
                  helper="This shows how hard the next business identity move should be."
                />
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <SectionLabel>Progress so far</SectionLabel>

              <div className="mt-4">
                <p className="text-5xl font-semibold tracking-tight text-[var(--text-strong)]">
                  {numericValue(identityScore)}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">
                  identity score right now
                </p>

                <div className="mt-4 h-2 bg-[var(--reference-soft)]">
                  <div
                    className="h-2 bg-[var(--brand-600)]"
                    style={{
                      width: `${
                        typeof identityScore === "number"
                          ? Math.max(0, Math.min(identityScore, 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Naming aligned"
                    value={namingAlignmentLabel}
                  />
                  <HeaderMeta
                    label="Category aligned"
                    value={categoryAlignmentLabel}
                  />
                  <HeaderMeta
                    label="Domain aligned"
                    value={domainAlignmentLabel}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3 xl:grid-cols-1">
                  <HeaderMeta
                    label="Business name saved"
                    value={boolLabel(Boolean(gbpName))}
                  />
                  <HeaderMeta
                    label="Category saved"
                    value={boolLabel(Boolean(primaryCategory))}
                  />
                  <HeaderMeta
                    label="Website URL saved"
                    value={boolLabel(websiteSummary.hasSiteUrl)}
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