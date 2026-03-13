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
          className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          required
        />

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={compName}
            onChange={(e) => setCompName(e.target.value)}
            placeholder="Competitor name (optional)"
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={compSource}
            onChange={(e) => setCompSource(e.target.value)}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
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
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            value={compReviews}
            onChange={(e) => setCompReviews(e.target.value)}
            placeholder="Total reviews (ex: 186)"
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <button className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold hover:bg-zinc-50">
          Save competitor
        </button>
      </form>

      <div className="mt-4">
        <div className="mb-2 text-sm font-extrabold text-zinc-900">Saved competitors</div>
        {competitors.length === 0 ? (
          <div className="text-sm text-zinc-700">None yet.</div>
        ) : (
          <div className="grid gap-3">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="break-words text-sm font-black text-zinc-900">
                    {formatDomain(competitor.competitor_domain)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-800">
                    {competitor.competitor_name ?? "—"} • {competitor.source} • Rating:{" "}
                    {competitor.rating ?? "—"} • Reviews: {competitor.total_reviews ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Last seen: {new Date(competitor.last_seen_at).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => void onDeleteCompetitor(competitor.id)}
                  className="w-fit rounded-xl border border-zinc-900 px-3 py-2 text-sm font-extrabold hover:bg-zinc-50"
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