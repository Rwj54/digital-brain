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

function FieldLabel({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-950/80">
        {title}
      </div>
      {helper ? (
        <div className="mt-2 max-w-sm text-sm leading-6 text-slate-700">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full border-0 border-b-2 border-amber-500 bg-transparent px-0 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-800 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function FormSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "w-full appearance-none border-0 border-b-2 border-amber-500 bg-transparent px-0 py-3 text-base text-slate-950 outline-none transition focus:border-amber-800 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function SavedLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-950/75">
      {children}
    </div>
  );
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-zinc-300 bg-zinc-50 text-zinc-800";

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${toneClasses}`}
    >
      {children}
    </span>
  );
}

function renderCoveragePanel(competitor: CompetitorMetric) {
  const keywordCount = competitor.number_of_keywords_found ?? 0;
  const topKeywords = competitor.top_keywords ?? [];
  const hasCoverage = keywordCount > 0 && topKeywords.length > 0;

  if (!hasCoverage) {
    return (
      <div className="grid gap-3">
        <div>
          <SavedLabel>Coverage status</SavedLabel>
          <div className="mt-2">
            <StatusBadge tone="warning">Not in latest tracked results</StatusBadge>
          </div>
        </div>

        <div className="text-sm leading-6 text-[var(--text-body)]">
          No keyword matches found in the latest tracked snapshot.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <SavedLabel>Coverage status</SavedLabel>
          <div className="mt-2">
            <StatusBadge tone="success">Found in latest tracked results</StatusBadge>
          </div>
        </div>

        <div>
          <SavedLabel>Keywords found</SavedLabel>
          <div className="mt-2 text-sm font-semibold text-[var(--text-strong)]">
            {keywordCount}
          </div>
        </div>
      </div>

      <div>
        <SavedLabel>Top keywords</SavedLabel>
        <div className="mt-2 flex flex-wrap gap-2">
          {topKeywords.map((keyword) => (
            <span
              key={keyword}
              className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-slate-800"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const coveredCompetitorCount = competitors.filter(
    (competitor) => (competitor.number_of_keywords_found ?? 0) > 0
  ).length;

  const uncoveredCompetitorCount = competitors.length - coveredCompetitorCount;

  return (
    <Card title="Competitors" subtitle="Manual competitor entry for now.">
      <form onSubmit={onAddOrUpdateCompetitor} className="grid gap-5">
        <div className="border border-amber-400 bg-amber-200/70">
          <div className="border-b border-amber-400 bg-amber-300 px-5 py-4 sm:px-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-950">
              Competitor entry form
            </div>
            <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-800">
              Add the businesses you most often see in Google Maps or search
              results for this category and market.
            </div>
          </div>

          <div className="grid gap-0">
            <div className="grid gap-5 border-b border-amber-400 px-5 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <FieldLabel
                title="Competitor domain or URL"
                helper="This is the required field. Start with the business website."
              />
              <FormInput
                value={compDomain}
                onChange={(e) => setCompDomain(e.target.value)}
                placeholder="Example: sunvalleyomaha.com"
                required
              />
            </div>

            <div className="grid gap-6 border-b border-amber-400 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-3">
                <FieldLabel
                  title="Competitor name"
                  helper="Optional, but helpful for a cleaner saved list."
                />
                <FormInput
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  placeholder="Competitor name"
                />
              </div>

              <div className="grid gap-3">
                <FieldLabel
                  title="Source"
                  helper="How this competitor was found."
                />
                <FormSelect
                  value={compSource}
                  onChange={(e) => setCompSource(e.target.value)}
                >
                  <option value="manual">manual</option>
                  <option value="maps">maps</option>
                  <option value="serp">serp</option>
                </FormSelect>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
              <div className="grid gap-3">
                <FieldLabel title="Rating" helper="Example: 4.6" />
                <FormInput
                  value={compRating}
                  onChange={(e) => setCompRating(e.target.value)}
                  placeholder="Rating"
                />
              </div>

              <div className="grid gap-3">
                <FieldLabel title="Total reviews" helper="Example: 186" />
                <FormInput
                  value={compReviews}
                  onChange={(e) => setCompReviews(e.target.value)}
                  placeholder="Total reviews"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <button
            className="border border-amber-900 bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            type="submit"
          >
            Save competitor
          </button>
        </div>
      </form>

      <section className="border-t border-[var(--border)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Saved competitors
          </div>

          {competitors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">
                {coveredCompetitorCount} found in latest tracked results
              </StatusBadge>
              <StatusBadge tone="warning">
                {uncoveredCompetitorCount} not found in latest tracked results
              </StatusBadge>
            </div>
          ) : null}
        </div>

        {competitors.length > 0 ? (
          <div className="mt-3 border-l-2 border-[var(--border)] pl-4 text-sm leading-6 text-[var(--text-body)]">
            Latest tracked market snapshot: {coveredCompetitorCount} of{" "}
            {competitors.length} saved competitors appeared in the current keyword
            results for this project.
          </div>
        ) : null}

        {competitors.length === 0 ? (
          <div className="mt-4 text-sm leading-7 text-[var(--text-body)]">
            None yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-0">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="border-t border-[var(--border)] py-5 first:border-t-0 first:pt-0"
              >
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px] md:gap-8">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words text-base font-semibold text-[var(--text-strong)]">
                          {formatDomain(competitor.competitor_domain)}
                        </div>

                        <div className="mt-2 text-sm leading-7 text-[var(--text-body)]">
                          {competitor.competitor_name ?? "—"} • {competitor.source} •{" "}
                          Rating: {competitor.rating ?? "—"} • Reviews:{" "}
                          {competitor.total_reviews ?? "—"}
                        </div>

                        <div className="mt-2 text-xs text-[var(--text-muted)]">
                          Last seen: {new Date(
                            competitor.last_seen_at
                          ).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => void onDeleteCompetitor(competitor.id)}
                        className="border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm font-semibold text-[var(--text-body)] transition hover:bg-zinc-50"
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-amber-200 pt-4 md:border-t-0 md:border-l md:border-amber-200 md:pl-6 md:pt-0">
                    {renderCoveragePanel(competitor)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Card>
  );
}