type RankSeriesPoint = {
  capturedAt: string;
  bestRank: number;
  worstRank: number;
  resultCount: number;
};

type RankTrendChartProps = {
  series: RankSeriesPoint[];
  latestCapturedAt?: string | null;
  loading?: boolean;
};

function buildSparklinePoints(series: RankSeriesPoint[]) {
  if (series.length === 0) {
    return "";
  }

  const width = 520;
  const height = 180;
  const padding = 20;

  const bestRanks = series.map((point) => point.bestRank);
  const minRank = Math.min(...bestRanks);
  const maxRank = Math.max(...bestRanks);
  const rankRange = Math.max(maxRank - minRank, 1);

  return bestRanks
    .map((rank, index) => {
      const x =
        series.length === 1
          ? width / 2
          : padding + (index * (width - padding * 2)) / (series.length - 1);

      const normalized = (rank - minRank) / rankRange;
      const y = padding + normalized * (height - padding * 2);

      return `${x},${y}`;
    })
    .join(" ");
}

export default function RankTrendChart({
  series,
  latestCapturedAt,
  loading = false,
}: RankTrendChartProps) {
  const sparklinePoints = buildSparklinePoints(series);

  return (
    <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
            Rank Trend
          </h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
            Daily best-rank series for this keyword and metro.
          </p>
        </div>
        <div className="text-right text-xs text-neutral-700 dark:text-neutral-500">
          <p>Points: {series.length}</p>
          <p>Latest capture: {latestCapturedAt ?? "—"}</p>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
            Loading rank series…
          </div>
        ) : series.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500">
            No rank series data yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <svg viewBox="0 0 520 180" className="h-56 w-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-neutral-950 dark:text-white"
                points={sparklinePoints}
              />
            </svg>
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-500">
              <span>{series[0]?.capturedAt ?? "—"}</span>
              <span>{series[series.length - 1]?.capturedAt ?? "—"}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}