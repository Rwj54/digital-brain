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
      <form onSubmit={onAddOrUpdateCompetitor} className="grid gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-950">
              Competitor domain or URL
            </label>
            <input
              value={compDomain}
              onChange={(e) => setCompDomain(e.target.value)}
              placeholder="Example: sunvalleyomaha.com"
              className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Competitor name
              </label>
              <input
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="Optional"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Source
              </label>
              <select
                value={compSource}
                onChange={(e) => setCompSource(e.target.value)}
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="manual">manual</option>
                <option value="maps">maps</option>
                <option value="serp">serp</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Rating
              </label>
              <input
                value={compRating}
                onChange={(e) => setCompRating(e.target.value)}
                placeholder="Example: 4.6"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Total reviews
              </label>
              <input
                value={compReviews}
                onChange={(e) => setCompReviews(e.target.value)}
                placeholder="Example: 186"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            className="w-fit rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white transition hover:opacity-90"
            type="submit"
          >
            Save competitor
          </button>
        </div>
      </form>

      <div className="mt-5">
        <div className="mb-3 text-sm font-extrabold text-zinc-950">
          Saved competitors
        </div>

        {competitors.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
            None yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="rounded-2xl border border-zinc-200 bg-white/90 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-black text-zinc-950">
                      {formatDomain(competitor.competitor_domain)}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-700">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                        {competitor.competitor_name ?? "—"}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                        {competitor.source}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                        Rating: {competitor.rating ?? "—"}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">
                        Reviews: {competitor.total_reviews ?? "—"}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      Last seen: {new Date(competitor.last_seen_at).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => void onDeleteCompetitor(competitor.id)}
                    className="w-fit rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-sm font-extrabold text-zinc-900 transition hover:bg-zinc-50"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
