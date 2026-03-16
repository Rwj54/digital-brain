import { Badge } from "@/components/projects/dashboard/Badge";
import { Card } from "@/components/projects/dashboard/Card";
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

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        title="Your GBP"
        subtitle="Manual MVP snapshot (automation later)."
        right={<Badge ok={hasGbp} label={hasGbp ? "Saved" : "Missing"} />}
      >
        <div className="space-y-1 text-sm text-zinc-950 dark:text-zinc-50">
          <div className="font-black">{gbp?.gbp_name ?? "—"}</div>
          <div className="text-xs text-zinc-700 dark:text-zinc-200">
            {gbp?.primary_category ?? "—"}
          </div>
          <div className="pt-2">
            <span className="font-extrabold">Rating:</span> {gbp?.rating ?? "—"}
            <span className="mx-2 opacity-50">•</span>
            <span className="font-extrabold">Reviews:</span> {gbp?.total_reviews ?? "—"}
            <span className="mx-2 opacity-50">•</span>
            <span className="font-extrabold">Photos:</span> {gbp?.photos_count ?? "—"}
          </div>
          <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300">
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
          <div className="space-y-1 text-sm text-zinc-950 dark:text-zinc-50">
            <div className="font-black">{topComp.competitor_name ?? "—"}</div>
            <div className="break-words text-xs text-zinc-700 dark:text-zinc-200">
              {formatDomain(topComp.competitor_domain)}
            </div>
            <div className="pt-2">
              <span className="font-extrabold">Rating:</span> {topComp.rating ?? "—"}
              <span className="mx-2 opacity-50">•</span>
              <span className="font-extrabold">Reviews:</span> {topComp.total_reviews ?? "—"}
            </div>
            <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Source: {topComp.source} • Last seen: {new Date(topComp.last_seen_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-800 dark:text-zinc-200">
            Add competitors in Settings.
          </div>
        )}
      </Card>

      <Card
        title="Review target (next 90 days)"
        subtitle="Primary = realistic. Secondary = gap-based ideal."
        right={
          <Badge
            ok={hasGbp && hasCompetitors}
            label={hasGbp && hasCompetitors ? "Ready" : "Needs data"}
          />
        }
      >
        {gapReviews === null ? (
          <div className="text-sm text-zinc-800 dark:text-zinc-200">
            Add your review count and at least one competitor review count.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                Realistic target (capacity-aware)
              </div>
              <div className="mt-1 flex items-end gap-2">
                <div className="text-4xl font-black leading-none text-zinc-950 dark:text-zinc-50 md:text-5xl">
                  {realisticTarget90d ?? "—"}
                </div>
                <div className="pb-1 text-xs font-extrabold text-zinc-700 dark:text-zinc-200">
                  / 90 days
                </div>
              </div>
              <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                ~<span className="font-black">{perWeek ?? "—"}</span>/week
              </div>
            </div>

            <div className="rounded-xl border border-zinc-300 bg-zinc-100 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              <div>
                <span className="font-extrabold">Review gap:</span> {gapReviews}
              </div>
              <div className="mt-1">
                <span className="font-extrabold">Gap-based ideal:</span> {desiredTarget90d ?? "—"} / 90
                days <span className="text-zinc-600 dark:text-zinc-300">(changes only when gap changes)</span>
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
  );
}