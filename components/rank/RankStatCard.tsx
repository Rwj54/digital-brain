type RankStatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  loading?: boolean;
};

export default function RankStatCard({
  label,
  value,
  helper,
  loading = false,
}: RankStatCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <p className="text-xs uppercase tracking-wide text-neutral-700 dark:text-neutral-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-neutral-950 dark:text-white">
        {loading ? "…" : value}
      </p>
      {helper ? (
        <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
}