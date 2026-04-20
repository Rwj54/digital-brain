import Link from "next/link";

import { formatDate, formatPercent } from "@/lib/owner/formatters";
import {
  type OwnerPageDashboard,
  type RenderStep,
} from "@/lib/owner/types";
import {
  HeaderMeta,
  InlineTag,
  SectionLabel,
  SummaryStat,
} from "@/components/owner/OwnerPagePrimitives";

type Props = {
  dashboard: OwnerPageDashboard;
  primaryStep: RenderStep | null;
  openTasks: number;
};

export function OwnerHeroSection({
  dashboard,
  primaryStep,
  openTasks,
}: Props) {
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

          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Next workspaces
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              Open the action center to work through the current stored
              priorities in a clearer order. Open the identity page to see
              whether the business name, category, website, and domain anchors
              line up clearly. Open the reviews page to check whether the
              business has enough review trust to support a stronger reputation
              foundation. Open the visibility page to see whether the business
              has real local ranking footing in the market that matters most.
              Open the website page to check the current website and domain
              foundation. Open the AI page to see whether the business is
              machine-readable enough to support stronger AI visibility. Open
              the outcomes page to see whether visibility work is starting to
              connect to real business results.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/projects/${dashboard.projectId}/actions`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open action center
              </Link>
              <Link
                href={`/projects/${dashboard.projectId}/identity`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open identity page
              </Link>
              <Link
                href={`/projects/${dashboard.projectId}/reviews`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open reviews page
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
              <Link
                href={`/projects/${dashboard.projectId}/website`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open website page
              </Link>
              <Link
                href={`/projects/${dashboard.projectId}/ai`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open AI page
              </Link>
              <Link
                href={`/projects/${dashboard.projectId}/outcomes`}
                className="px-4 py-3 text-sm font-semibold text-[var(--text-strong)]"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                Open outcomes page
              </Link>
            </div>
          </div>
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
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-2 xl:grid-cols-5">
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
        <HeaderMeta label="Snapshot" value={formatDate(dashboard.capturedAt)} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
        <SummaryStat
          label="Start here"
          value={
            primaryStep?.title ?? dashboard.dashboard.hero.primaryActionText
          }
        />
        <SummaryStat label="Open tasks" value={String(openTasks)} />
        <SummaryStat
          label="Completion rate"
          value={formatPercent(dashboard.dashboard.summary.completedTaskRate)}
        />
      </div>
    </section>
  );
}