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
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: ok ? "var(--success-soft)" : "var(--warning-soft)",
        color: ok ? "var(--success)" : "var(--warning)",
      }}
    >
      {ok ? okLabel : missingLabel}
    </span>
  );
}

function SummaryCard({
  eyebrow,
  title,
  subtitle,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
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

      <div className="mt-5">{children}</div>
    </section>
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
    <div className="grid gap-4 xl:grid-cols-3">
      <SummaryCard
        eyebrow="Snapshot"
        title="Your GBP"
        subtitle="Current saved profile snapshot used by the project."
        right={<StatusPill ok={hasGbp} okLabel="Saved" missingLabel="Missing" />}
      >
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-[var(--text-strong)]">
              {gbp?.gbp_name ?? "Not set"}
            </p>
            <p className="mt-1 text-sm text-[var(--text-body)]">
              {gbp?.primary_category ?? "Primary category not set"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Rating
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                {gbp?.rating ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Reviews
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                {gbp?.total_reviews ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Photos
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                {gbp?.photos_count ?? "—"}
              </p>
            </div>
          </div>

          <p className="text-xs leading-6 text-[var(--text-muted)]">
            Last updated:{" "}
            {gbp?.last_fetched_at
              ? new Date(gbp.last_fetched_at).toLocaleString()
              : "Not set"}
          </p>
        </div>
      </SummaryCard>

      <SummaryCard
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
      >
        {topComp ? (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-[var(--text-strong)]">
                {topComp.competitor_name ?? "Not set"}
              </p>
              <p className="mt-1 break-words text-sm text-[var(--text-body)]">
                {formatDomain(topComp.competitor_domain)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Rating
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                  {topComp.rating ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Reviews
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
                  {topComp.total_reviews ?? "—"}
                </p>
              </div>
            </div>

            <p className="text-xs leading-6 text-[var(--text-muted)]">
              Source: {topComp.source} • Last seen:{" "}
              {new Date(topComp.last_seen_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4 text-sm leading-7 text-[var(--text-body)]">
            Add competitors in Settings to turn this into a real market comparison.
          </div>
        )}
      </SummaryCard>

      <SummaryCard
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
      >
        {!hasTargetMath ? (
          <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4 text-sm leading-7 text-[var(--text-body)]">
            Add your review count and at least one competitor review count to calculate the next target.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
                About <span className="font-semibold text-[var(--text-strong)]">{perWeek ?? "—"}</span> per week
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--reference-soft)] px-4 py-4 text-sm leading-7 text-[var(--text-body)]">
              <p>
                <span className="font-semibold text-[var(--text-strong)]">Review gap:</span>{" "}
                {gapReviews}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-[var(--text-strong)]">Gap-based ideal:</span>{" "}
                {desiredTarget90d ?? "—"} / 90 days
              </p>
              <p className="mt-1">
                <span className="font-semibold text-[var(--text-strong)]">Capacity limit:</span>{" "}
                {maxReviews90d === null ? "Not set yet" : `${maxReviews90d} / 90 days`}
              </p>
            </div>
          </div>
        )}
      </SummaryCard>
    </div>
  );
}