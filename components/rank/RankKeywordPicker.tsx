type RankKeywordRow = {
  id: string;
  project_id: string;
  keyword: string;
  metro: string;
  is_active: boolean;
  priority: number;
  created_at: string;
};

type RankKeywordPickerProps = {
  keywords: RankKeywordRow[];
  selectedKeywordId: string;
  loading?: boolean;
  onSelect: (keywordRow: RankKeywordRow) => void;
};

export default function RankKeywordPicker({
  keywords,
  selectedKeywordId,
  loading = false,
  onSelect,
}: RankKeywordPickerProps) {
  return (
    <section className="rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">
          Tracked Keywords
        </h2>
        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-400">
          Select a keyword to view its rank intelligence.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {keywords.length === 0 ? (
          <div className="text-sm text-neutral-700 dark:text-neutral-500">
            No active rank keywords found.
          </div>
        ) : (
          keywords.map((item) => {
            const isSelected = item.id === selectedKeywordId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                disabled={loading}
                className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-300 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
                }`}
              >
                <p className="text-sm font-medium">{item.keyword}</p>
                <p
                  className={`mt-1 text-xs ${
                    isSelected
                      ? "text-neutral-200 dark:text-neutral-700"
                      : "text-neutral-700 dark:text-neutral-500"
                  }`}
                >
                  {item.metro} • Priority {item.priority}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}