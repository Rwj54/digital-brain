import RankStatCard from "@/components/rank/RankStatCard";

type RankSummary = {
  latestCapturedAt: string;
  latestRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  snapshotCount: number;
  latestDayCount: number;
  targetFoundInLatestSnapshot: boolean;
  top3PresenceCount: number;
  top10PresenceCount: number;
  top20PresenceCount: number;
  top3PresenceRate: number;
  top10PresenceRate: number;
  top20PresenceRate: number;
  localMarketVisibilityScore: number;
};

type RankSummaryStatsProps = {
  summary: RankSummary | null;
  captureDayHelper: string;
  loading?: boolean;
};

function formatRankValue(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  if (value >= 21) {
    return ">20";
  }

  return String(value);
}

function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return `${Math.round(value * 100)}%`;
}

function formatVisibilityScore(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return value.toFixed(1);
}

export default function RankSummaryStats({
  summary,
  captureDayHelper,
  loading = false,
}: RankSummaryStatsProps) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <RankStatCard
          label="Latest Rank"
          value={formatRankValue(summary?.latestRank)}
          loading={loading}
        />
        <RankStatCard
          label="Best Rank"
          value={formatRankValue(summary?.bestRank)}
          loading={loading}
        />
        <RankStatCard
          label="Worst Rank"
          value={formatRankValue(summary?.worstRank)}
          loading={loading}
        />
        <RankStatCard
          label="Latest Day Results"
          value={summary?.latestDayCount ?? "—"}
          loading={loading}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <RankStatCard
          label="Top 3 Presence"
          value={formatPercent(summary?.top3PresenceRate)}
          helper={
            summary ? `${summary.top3PresenceCount} of ${captureDayHelper}` : undefined
          }
          loading={loading}
        />
        <RankStatCard
          label="Top 10 Presence"
          value={formatPercent(summary?.top10PresenceRate)}
          helper={
            summary ? `${summary.top10PresenceCount} of ${captureDayHelper}` : undefined
          }
          loading={loading}
        />
        <RankStatCard
          label="Top 20 Presence"
          value={formatPercent(summary?.top20PresenceRate)}
          helper={
            summary ? `${summary.top20PresenceCount} of ${captureDayHelper}` : undefined
          }
          loading={loading}
        />
        <RankStatCard
          label="Local Market Visibility"
          value={formatVisibilityScore(summary?.localMarketVisibilityScore)}
          helper="Weighted visibility score"
          loading={loading}
        />
      </section>
    </>
  );
}