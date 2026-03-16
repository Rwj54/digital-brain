import { Badge } from "@/components/projects/dashboard/Badge";
import { Card } from "@/components/projects/dashboard/Card";

type SetupChecklistCardProps = {
  setupDoneCount: number;
  hasGbp: boolean;
  hasCompetitors: boolean;
  hasCapacity: boolean;
  labelPlural: string;
  onGoToSettings: () => void;
};

export function SetupChecklistCard({
  setupDoneCount,
  hasGbp,
  hasCompetitors,
  hasCapacity,
  labelPlural,
  onGoToSettings,
}: SetupChecklistCardProps) {
  function renderSetupStep(ok: boolean, title: string, desc: string) {
    return (
      <button
        onClick={onGoToSettings}
        className={[
          "w-full rounded-2xl border p-3 text-left transition-colors",
          ok
            ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-950/40"
            : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
        ].join(" ")}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50">
              {title}
            </div>
            <div className="mt-1 text-xs text-zinc-700 dark:text-zinc-200">
              {desc}
            </div>
          </div>
          <Badge ok={ok} label={ok ? "Done" : "Next"} />
        </div>
      </button>
    );
  }

  return (
    <Card
      title="Setup checklist"
      subtitle={`Complete these 3 steps once — then everything else becomes automatic. (${setupDoneCount}/3 done)`}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {renderSetupStep(
          hasGbp,
          "1) Add your GBP snapshot",
          "Business name, category, rating, total reviews (manual MVP)."
        )}
        {renderSetupStep(
          hasCompetitors,
          "2) Add 3–4 competitors",
          "Start with the top businesses you see in Google Maps for this category/metro."
        )}
        {renderSetupStep(
          hasCapacity,
          "3) Set monthly volume + review rate",
          `How many ${labelPlural}/month and what % leave a review when asked.`
        )}
      </div>
    </Card>
  );
}