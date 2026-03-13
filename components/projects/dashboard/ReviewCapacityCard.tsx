import { Card } from "@/components/projects/dashboard/Card";
import type { VolumePresetOption } from "@/components/projects/dashboard/types";

type ReviewCapacityCardProps = {
  labelPlural: string;
  preset: VolumePresetOption;
  presetOptions: VolumePresetOption[];
  volumePreset: string;
  showAdvancedLabels: boolean;
  eventLabelSingular: string;
  eventLabelPlural: string;
  monthlyEvents: string;
  reviewConvRate: string;
  onSaveProjectReviewCapacity: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  setVolumePreset: React.Dispatch<React.SetStateAction<string>>;
  setShowAdvancedLabels: React.Dispatch<React.SetStateAction<boolean>>;
  setEventLabelSingular: React.Dispatch<React.SetStateAction<string>>;
  setEventLabelPlural: React.Dispatch<React.SetStateAction<string>>;
  setMonthlyEvents: React.Dispatch<React.SetStateAction<string>>;
  setReviewConvRate: React.Dispatch<React.SetStateAction<string>>;
};

export function ReviewCapacityCard({
  labelPlural,
  preset,
  presetOptions,
  volumePreset,
  showAdvancedLabels,
  eventLabelSingular,
  eventLabelPlural,
  monthlyEvents,
  reviewConvRate,
  onSaveProjectReviewCapacity,
  setVolumePreset,
  setShowAdvancedLabels,
  setEventLabelSingular,
  setEventLabelPlural,
  setMonthlyEvents,
  setReviewConvRate,
}: ReviewCapacityCardProps) {
  return (
    <Card title="Review capacity" subtitle="This is what makes targets realistic.">
      <div className="text-sm text-zinc-800">
        Choose your business type, then enter:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Monthly volume (how many {labelPlural} you do per month)</li>
          <li>Review conversion (% who leave a review when asked)</li>
        </ul>
      </div>

      <form onSubmit={onSaveProjectReviewCapacity} className="mt-4 grid gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-extrabold text-zinc-900">Business type</label>
          <select
            value={volumePreset}
            onChange={(e) => {
              const next = e.target.value;
              setVolumePreset(next);

              const selectedPreset = presetOptions.find((x) => x.key === next) || presetOptions[0];
              if (selectedPreset.key !== "custom") {
                setEventLabelSingular(selectedPreset.singular);
                setEventLabelPlural(selectedPreset.plural);
                setShowAdvancedLabels(false);
              } else {
                setShowAdvancedLabels(true);
              }
            }}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          >
            {presetOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
            <div className="font-extrabold">{preset.label}</div>
            <div className="mt-1">{preset.helper}</div>
            <div className="mt-1 text-zinc-500">{preset.example}</div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedLabels((value) => !value)}
            className={[
              "w-fit rounded-xl border px-3 py-2 text-sm font-extrabold",
              showAdvancedLabels
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-900 text-zinc-900 hover:bg-zinc-50",
            ].join(" ")}
          >
            {showAdvancedLabels ? "Hide advanced labels" : "Advanced: custom wording"}
          </button>

          {showAdvancedLabels && (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={eventLabelSingular}
                onChange={(e) => setEventLabelSingular(e.target.value)}
                placeholder="Singular (ex: Job)"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                value={eventLabelPlural}
                onChange={(e) => setEventLabelPlural(e.target.value)}
                placeholder="Plural (ex: Jobs)"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-900">
              Monthly volume ({labelPlural}/month)
            </label>
            <input
              value={monthlyEvents}
              onChange={(e) => setMonthlyEvents(e.target.value)}
              placeholder="Example: 12"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="text-xs text-zinc-500">
              Use an average. If unsure, estimate based on the last 30–60 days.
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-900">
              % who leave a review when asked
            </label>
            <input
              value={reviewConvRate}
              onChange={(e) => setReviewConvRate(e.target.value)}
              placeholder="Example: 40"
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="text-xs text-zinc-500">
              Start 30–50%. With a strong system, 60–80% is possible.
            </div>
          </div>
        </div>

        <button className="w-fit rounded-xl border border-zinc-900 px-4 py-2 text-sm font-extrabold hover:bg-zinc-50">
          Save capacity settings
        </button>
      </form>
    </Card>
  );
}