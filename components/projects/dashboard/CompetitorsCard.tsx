import { Card } from "@/components/projects/dashboard/Card";
import { formatDomain } from "@/components/projects/dashboard/utils";
import type { CompetitorMetric } from "@/components/projects/dashboard/types";

type CompetitorsCardProps = {
  compDomain: string;
  compName: string;
  compSource: string;
  compRating: string;
  compReviews: string;
  competitors: CompetitorMetric[];
  onAddOrUpdateCompetitor: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteCompetitor: (id: string) => Promise<void>;
  setCompDomain: React.Dispatch<React.SetStateAction<string>>;
  setCompName: React.Dispatch<React.SetStateAction<string>>;
  setCompSource: React.Dispatch<React.SetStateAction<string>>;
  setCompRating: React.Dispatch<React.SetStateAction<string>>;
  setCompReviews: React.Dispatch<React.SetStateAction<string>>;
};

export function CompetitorsCard({
  compDomain,
  compName,
  compSource,
  compRating,
  compReviews,
  competitors,
  onAddOrUpdateCompetitor,
  onDeleteCompetitor,
  setCompDomain,
  setCompName,
  setCompSource,
  setCompRating,
  setCompReviews,
}: CompetitorsCardProps) {
  return (
    <Card title="Competitors" subtitle="Manual MVP list. Automation later.">
      <form onSubmit={onAddOrUpdateCompetitor} className="mt-2 grid gap-3">
        <input
          value={compDomain}
          onChange={(e) => setCompDomain(e.target.value)}
          placeholder="Competitor domain or URL (ex: sunvalleyomaha.com)"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          required
        />

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={compName}
            onChange={(e) => setCompName(e.target.value)}
            placeholder="Competitor name (optional)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <select
            value={compSource}
            onChange={(e) => setCompSource(e.target.value)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="manual">manual</option>
            <option value="maps">maps</option>
            <option value="serp">serp</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={compRating}
            onChange={(e) => setCompRating(e.target.value)}
            placeholder="Rating (ex: 4.6)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
          <input
            value={compReviews}
            onChange={(e) => setCompReviews(e.target.value)}
            placeholder="Total reviews (ex: 186)"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400"
          />
        </div>

        <button
          className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold text-zinc-950 hover:bg-zinc-50 dark:border-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-800"
          type="submit"
        >
          Save competitor
        </button>
      </form>

      <div className="mt-4">
        <div className="mb-2 text-sm font-extrabold text-zinc-950 dark:text-zinc-50">
          Saved competitors
        </div>
        {competitors.length === 0 ? (
          <div className="text-sm text-zinc-800 dark:text-zinc-200">None yet.</div>
        ) : (
          <div className="grid gap-3">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 md:flex-row md:items-center md:justify-between dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <div className="break-words text-sm font-black text-zinc-950 dark:text-zinc-50">
                    {formatDomain(competitor.competitor_domain)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                    {competitor.competitor_name ?? "—"} • {competitor.source} • Rating:{" "}
                    {competitor.rating ?? "—"} • Reviews: {competitor.total_reviews ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    Last seen: {new Date(competitor.last_seen_at).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => void onDeleteCompetitor(competitor.id)}
                  className="w-fit rounded-xl border border-zinc-900 px-3 py-2 text-sm font-extrabold text-zinc-950 hover:bg-zinc-50 dark:border-zinc-200 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  type="button"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}