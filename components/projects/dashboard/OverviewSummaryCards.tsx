import type { ReactNode } from "react";
import { formatDomain } from "@/components/projects/dashboard/utils";
import type {
  CompetitorMetric,
  GbpProfile,
} from "@/components/projects/dashboard/types";

type OverviewSummaryCardsProps = {
  gbp: GbpProfile | null;
  competitors: CompetitorMetric[];
  hasGbp: boolean;
  hasCompetitors: boolean;
  gapReviews: number | null;
  desiredTarget90d: number | null;
  maxReviews90d: number | null;
  realisticTarget90d: number | null;
  perWeek: number | null;
};

function StatusPill({
  ok,
  okLabel,
  missingLabel,
}: {
  ok: boolean;
  okLabel: string;
  missingLabel: string;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: ok ? "var(--success-soft)" : "var(--warning-soft)",
        color: ok ? "var(--success)" : "var(--warning)",
      }}
    >
      {ok ? okLabel : missingLabel}
    </span>
  );
}

function SummaryColumn({
  eyebrow,
  title,
  subtitle,
  right,
  toneClassName,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
  toneClassName: string;
  children: ReactNode;
}) {
  return (
    <section className={`grid gap-4 rounded-[26px] px-5 py-5 sm:px-6 ${toneClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-strong)]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-body)]">{subtitle}</p>
        </div>

        {right}
      </div>

      <div>{children}</div>
    </section>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)]/80 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[var(--text-strong)]">{value}</span>
    </div>
  );
}

export function OverviewSummaryCards({
  gbp,
  competitors,
  hasGbp,
  hasCompetitors,
  gapReviews,
  desiredTarget90d,
  maxReviews90d,
  realisticTarget90d,
  perWeek,
}: OverviewSummaryCardsProps) {
  const topComp = competitors.length > 0 ? competitors[0] : null;
  const hasTargetMath = gapReviews !== null;

  return (
    <section className="grid gap-4 xl:grid-cols-3 xl:gap-5">
      <SummaryColumn
        eyebrow="Snapshot"
        title="Your GBP"
        subtitle="Current saved profile snapshot used by the project."
        right={<StatusPill ok={hasGbp} okLabel="Saved" missingLabel="Missing" />}
        toneClassName="bg-[var(--primary-soft)]"
      >
        <div className="grid gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--text-strong)]">
              {gbp?.gbp_name ?? "Not set"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-body)]">
              {gbp?.primary_category ?? "Primary category not set"}
            </p>
          </div>

          <div>
            <MetricRow label="Rating" value={gbp?.rating ?? "—"} />
            <MetricRow label="Reviews" value={gbp?.total_reviews ?? "—"} />
            <MetricRow label="Photos" value={gbp?.photos_count ?? "—"} />
          </div>

          <p className="text-xs leading-6 text-[var(--text-muted)]">
            Last updated:{" "}
            {gbp?.last_fetched_at
              ? new Date(gbp.last_fetched_at).toLocaleString()
              : "Not set"}
          </p>
        </div>
      </SummaryColumn>

      <SummaryColumn
        eyebrow="Competitive baseline"
        title="Top competitor"
        subtitle="Highest-review competitor from the saved competitor set."
        right={
          <StatusPill
            ok={hasCompetitors}
            okLabel="Saved"
            missingLabel="Missing"
          />
        }
        toneClassName="bg-zinc-50/90"
      >
        {topComp ? (
          <div className="grid gap-4">
            <div>
              <p className="text-lg font-semibold text-[var(--text-strong)]">
                {topComp.competitor_name ?? "Not set"}
              </p>
              <p className="mt-1 break-words text-sm text-[var(--text-body)]">
                {formatDomain(topComp.competitor_domain)}
              </p>
            </div>

            <div>
              <MetricRow label="Rating" value={topComp.rating ?? "—"} />
              <MetricRow label="Reviews" value={topComp.total_reviews ?? "—"} />
            </div>

            <p className="text-xs leading-6 text-[var(--text-muted)]">
              Source: {topComp.source} • Last seen:{" "}
              {new Date(topComp.last_seen_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-7 text-[var(--text-body)]">
            Add competitors in Settings to turn this into a real market comparison.
          </p>
        )}
      </SummaryColumn>

      <SummaryColumn
        eyebrow="Targeting"
        title="Review target — next 90 days"
        subtitle="Primary target is capacity-aware. Secondary target is the pure gap-closing ideal."
        right={
          <StatusPill
            ok={hasGbp && hasCompetitors}
            okLabel="Ready"
            missingLabel="Needs data"
          />
        }
        toneClassName="bg-amber-50/80"
      >
        {!hasTargetMath ? (
          <p className="text-sm leading-7 text-[var(--text-body)]">
            Add your review count and at least one competitor review count to calculate the next target.
          </p>
        ) : (
          <div className="grid gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Realistic target
              </p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-4xl font-semibold leading-none tracking-tight text-[var(--text-strong)]">
                  {realisticTarget90d ?? "—"}
                </p>
                <p className="pb-1 text-xs font-semibold text-[var(--text-muted)]">
                  / 90 days
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--text-body)]">
                About{" "}
                <span className="font-semibold text-[var(--text-strong)]">
                  {perWeek ?? "—"}
                </span>{" "}
                per week
              </p>
            </div>

            <div>
              <MetricRow label="Review gap" value={gapReviews ?? "—"} />
              <MetricRow
                label="Gap-based ideal"
                value={desiredTarget90d === null ? "—" : `${desiredTarget90d} / 90 days`}
              />
              <MetricRow
                label="Capacity limit"
                value={maxReviews90d === null ? "Not set yet" : `${maxReviews90d} / 90 days`}
              />
            </div>
          </div>
        )}
      </SummaryColumn>
    </section>
  );
}
