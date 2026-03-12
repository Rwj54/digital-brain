type CompetitorPressureItem = {
  competitorKey: string;
  competitorName: string;
  currentRank: number;
  previousRank: number | null;
  rankChange: number | null;
  currentReviewCount: number | null;
  previousReviewCount: number | null;
  reviewChange: number | null;
  pressureScore: number;
};

type CompetitorPressure = {
  latestCapturedAt: string | null;
  previousCapturedAt: string | null;
  itemCount: number;
  items: CompetitorPressureItem[];
};

type Props = {
  pressure: CompetitorPressure | null;
  loading?: boolean;
};

export default function RankCompetitorPressure({
  pressure,
  loading = false,
}: Props) {
  return (
    <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
          Market Pressure
        </h2>

        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
          Competitors applying ranking pressure in this market.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 text-sm text-neutral-500">
          Loading competitor pressure…
        </div>
      ) : !pressure || pressure.items.length === 0 ? (
        <div className="mt-6 text-sm text-neutral-500">
          No competitor pressure detected.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {pressure.items.slice(0, 10).map((item) => (
            <div
              key={item.competitorKey}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                  {item.competitorName}
                </p>

                <p className="text-xs text-neutral-500">
                  Rank {item.currentRank}
                  {item.rankChange != null && item.rankChange !== 0 && (
                    <> • Δ {item.rankChange > 0 ? "+" : ""}{item.rankChange}</>
                  )}
                </p>
              </div>

              <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                {item.pressureScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}