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
  onSaveProjectReviewCapacity: (
    e: React.FormEvent<HTMLFormElement>,
  ) => Promise<void>;
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
    <Card
      title="Review capacity"
      subtitle="This is what makes targets realistic."
    >
      <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
        <div className="text-sm text-zinc-700">
          Choose your business type, then enter:
        </div>
        <ul className="mt-3 space-y-2 pl-5 text-sm text-zinc-700">
          <li className="list-disc">
            Monthly volume, or how many {labelPlural} you do per month.
          </li>
          <li className="list-disc">
            Review conversion, or what percent leave a review when asked.
          </li>
        </ul>
      </div>

      <form
        onSubmit={onSaveProjectReviewCapacity}
        className="mt-4 grid gap-4"
      >
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
          <div className="grid gap-2">
            <label className="text-sm font-extrabold text-zinc-950">
              Business type
            </label>
            <select
              value={volumePreset}
              onChange={(e) => {
                const next = e.target.value;
                setVolumePreset(next);

                const selectedPreset =
                  presetOptions.find((x) => x.key === next) || presetOptions[0];

                if (selectedPreset.key !== "custom") {
                  setEventLabelSingular(selectedPreset.singular);
                  setEventLabelPlural(selectedPreset.plural);
                  setShowAdvancedLabels(false);
                } else {
                  setShowAdvancedLabels(true);
                }
              }}
              className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            >
              {presetOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Preset guidance
              </div>
              <div className="mt-2 text-sm font-extrabold text-zinc-950">
                {preset.label}
              </div>
              <div className="mt-1 text-sm text-zinc-700">{preset.helper}</div>
              <div className="mt-1 text-xs text-zinc-500">{preset.example}</div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedLabels((value) => !value)}
                className={[
                  "w-fit rounded-2xl border px-3 py-2 text-sm font-extrabold transition",
                  showAdvancedLabels
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
                ].join(" ")}
              >
                {showAdvancedLabels
                  ? "Hide advanced labels"
                  : "Advanced: custom wording"}
              </button>
            </div>

            {showAdvancedLabels && (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={eventLabelSingular}
                  onChange={(e) => setEventLabelSingular(e.target.value)}
                  placeholder="Singular (ex: Job)"
                  className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                />
                <input
                  value={eventLabelPlural}
                  onChange={(e) => setEventLabelPlural(e.target.value)}
                  placeholder="Plural (ex: Jobs)"
                  className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                Monthly volume ({labelPlural}/month)
              </label>
              <input
                value={monthlyEvents}
                onChange={(e) => setMonthlyEvents(e.target.value)}
                placeholder="Example: 12"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
              <div className="text-xs text-zinc-500">
                Use an average. If unsure, estimate based on the last 30–60
                days.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-4">
            <div className="grid gap-2">
              <label className="text-sm font-extrabold text-zinc-950">
                % who leave a review when asked
              </label>
              <input
                value={reviewConvRate}
                onChange={(e) => setReviewConvRate(e.target.value)}
                placeholder="Example: 40"
                className="rounded-2xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
              />
              <div className="text-xs text-zinc-500">
                Start at 30–50%. With a strong system, 60–80% is possible.
              </div>
            </div>
          </div>
        </div>

        <div>
          <button className="w-fit rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white transition hover:opacity-90">
            Save capacity settings
          </button>
        </div>
      </form>
    </Card>
  );
}
