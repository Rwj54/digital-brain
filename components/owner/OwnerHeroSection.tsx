import Link from "next/link";

import { formatDate } from "@/lib/owner/formatters";
import {
  type OwnerPageDashboard,
  type RenderStep,
} from "@/lib/owner/types";
import {
  HeaderMeta,
  InlineTag,
  SectionLabel,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
  primaryStep: RenderStep | null;
};

export function OwnerHeroSection({
  dashboard,
  primaryStep,
}: Props) {
  const outcomesSummary = dashboard.dashboard.outcomesSummary;
  const hasOutcomePace =
    outcomesSummary.realisticTarget90d !== null ||
    outcomesSummary.perWeek !== null ||
    outcomesSummary.gapReviews !== null;

  return (
    <section className="border-b border-[var(--border)] pb-6">
      <SectionLabel>Owner dashboard</SectionLabel>

      <div className="mt-4 grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
        <div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[3.1rem] sm:leading-[1.02]">
            {dashboard.dashboard.hero.headline}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-body)] sm:text-[17px]">
            {dashboard.dashboard.hero.supportLine}
          </p>

          <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-2 xl:grid-cols-5">
            <HeaderMeta
              label="Business"
              value={dashboard.projectDisplayName ?? "Not set"}
            />
            <HeaderMeta
              label="Domain"
              value={dashboard.domainDisplayValue ?? "Not set"}
            />
            <HeaderMeta
              label="Location / Market"
              value={
                dashboard.projectLocationLabel ??
                dashboard.projectMetro ??
                "Not set"
              }
            />
            <HeaderMeta label="Scope" value={dashboard.pageScopeLabel} />
            <HeaderMeta
              label="Snapshot"
              value={formatDate(dashboard.capturedAt)}
            />
          </div>

          {hasOutcomePace ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
              <InlineTag>
                90-day goal:{" "}
                {outcomesSummary.realisticTarget90d !== null
                  ? String(outcomesSummary.realisticTarget90d)
                  : "Not set"}
              </InlineTag>
              <InlineTag>
                Weekly pace:{" "}
                {outcomesSummary.perWeek !== null
                  ? String(outcomesSummary.perWeek)
                  : "Not set"}
              </InlineTag>
              <InlineTag>
                Review gap:{" "}
                {outcomesSummary.gapReviews !== null
                  ? String(outcomesSummary.gapReviews)
                  : "Not set"}
              </InlineTag>
              <Link
                href={`/projects/${dashboard.projectId}/outcomes`}
                className="px-3 py-2 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open outcomes page
              </Link>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <SectionLabel>What to do now</SectionLabel>
          <p className="mt-3 text-xl font-semibold leading-8 text-[var(--text-strong)]">
            {primaryStep?.title ?? dashboard.dashboard.hero.primaryActionText}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-body)]">
            {primaryStep?.reason ??
              dashboard.dashboard.progress.nextLikelyImprovement}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <InlineTag>Who: {primaryStep?.who ?? "Owner"}</InlineTag>
            <InlineTag>Time: {primaryStep?.time ?? "Not set"}</InlineTag>
            <InlineTag>
              Difficulty: {primaryStep?.difficulty ?? "Not set"}
            </InlineTag>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/projects/${dashboard.projectId}/actions`}
              className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
              style={{
                border: "1px solid var(--text-strong)",
                backgroundColor: "var(--text-strong)",
                color: "#ffffff",
              }}
            >
              Open action center
            </Link>
            <Link
              href={`/projects/${dashboard.projectId}/visibility`}
              className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
              }}
            >
              Open visibility page
            </Link>
          </div>


        </div>
      </div>

    </section>
  );
}