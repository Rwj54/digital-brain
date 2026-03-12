type RankHistoryRow = {
  id: string;
  keyword: string;
  metro: string;
  rank_position: number;
  captured_at: string;
  raw_result: {
    title?: string | null;
    category?: string | null;
    address?: string | null;
    rating?:
      | {
          value?: number | null;
          votes_count?: number | null;
        }
      | number
      | null;
    phone?: string | null;
  } | null;
};

type RankMarketResultsTableProps = {
  rows: RankHistoryRow[];
  loading?: boolean;
};

function formatRating(
  rating:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null
    | undefined
) {
  if (typeof rating === "number") {
    return rating.toFixed(1);
  }

  if (rating && typeof rating.value === "number") {
    return rating.value.toFixed(1);
  }

  return "—";
}

function formatReviews(
  rating:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null
    | undefined
) {
  if (rating && typeof rating === "object" && typeof rating.votes_count === "number") {
    return rating.votes_count;
  }

  return "—";
}

export default function RankMarketResultsTable({
  rows,
  loading = false,
}: RankMarketResultsTableProps) {
  return (
    <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
          Current Top Market Results
        </h2>
        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
          Latest captured local pack results for this search origin.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-neutral-800 dark:text-neutral-500">
            <tr className="border-b border-neutral-300 dark:border-neutral-800">
              <th className="px-3 py-3 font-medium">Rank</th>
              <th className="px-3 py-3 font-medium">Business</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Rating</th>
              <th className="px-3 py-3 font-medium">Reviews</th>
              <th className="px-3 py-3 font-medium">Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-neutral-700 dark:text-neutral-500"
                >
                  Loading market results…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-neutral-700 dark:text-neutral-500"
                >
                  No market results found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-200 dark:border-neutral-900"
                >
                  <td className="px-3 py-3 text-neutral-950 dark:text-neutral-200">
                    {row.rank_position}
                  </td>
                  <td className="px-3 py-3 text-neutral-950 dark:text-neutral-200">
                    {row.raw_result?.title ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                    {row.raw_result?.category ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                    {formatRating(row.raw_result?.rating)}
                  </td>
                  <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                    {formatReviews(row.raw_result?.rating)}
                  </td>
                  <td className="px-3 py-3 text-neutral-800 dark:text-neutral-400">
                    {row.raw_result?.address ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}