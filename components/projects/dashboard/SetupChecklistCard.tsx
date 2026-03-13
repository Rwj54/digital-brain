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
          "w-full rounded-2xl border p-3 text-left transition",
          ok ? "border-emerald-200 bg-emerald-50/30" : "border-zinc-200 hover:bg-zinc-50",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-zinc-900">{title}</div>
            <div className="mt-1 text-xs text-zinc-600">{desc}</div>
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