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

function FieldLabel({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-950/80">
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
        "w-full border-0 border-b-2 border-sky-500 bg-transparent px-0 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-800 focus:ring-0",
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
        "w-full appearance-none border-0 border-b-2 border-sky-500 bg-transparent px-0 py-3 text-base text-slate-950 outline-none transition focus:border-sky-800 focus:ring-0",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

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
      <div className="border border-sky-500 bg-sky-100/80">
        <div className="border-b border-sky-500 bg-sky-200 px-5 py-4 sm:px-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-950">
            Capacity planning
          </div>
          <div className="mt-2 max-w-3xl text-sm leading-7 text-slate-800">
            Choose the closest business type, then enter monthly volume and the
            percent of customers who typically leave a review when asked.
          </div>
        </div>

        <form onSubmit={onSaveProjectReviewCapacity} className="grid gap-0">
          <div className="grid gap-5 border-b border-sky-500 px-5 py-5 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <FieldLabel
              title="Business type"
              helper="Pick the closest operating model for this business."
            />

            <div className="grid gap-4">
              <FormSelect
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
              >
                {presetOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </FormSelect>

              <div className="border-l-2 border-sky-600 pl-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-950/75">
                  Preset guidance
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">
                  {preset.label}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-700">
                  {preset.helper}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {preset.example}
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvancedLabels((value) => !value)}
                  className={[
                    "border px-3 py-2 text-sm font-semibold transition",
                    showAdvancedLabels
                      ? "border-sky-900 bg-sky-900 text-white"
                      : "border-sky-500 bg-transparent text-sky-950 hover:bg-sky-100/80",
                  ].join(" ")}
                >
                  {showAdvancedLabels
                    ? "Hide advanced labels"
                    : "Advanced: custom wording"}
                </button>
              </div>

              {showAdvancedLabels ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel title="Singular label" />
                    <div className="mt-3">
                      <FormInput
                        value={eventLabelSingular}
                        onChange={(e) => setEventLabelSingular(e.target.value)}
                        placeholder="Singular (ex: Job)"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel title="Plural label" />
                    <div className="mt-3">
                      <FormInput
                        value={eventLabelPlural}
                        onChange={(e) => setEventLabelPlural(e.target.value)}
                        placeholder="Plural (ex: Jobs)"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
            <div className="grid gap-3">
              <FieldLabel
                title={`Monthly volume (${labelPlural}/month)`}
                helper="Use an average. If unsure, estimate from the last 30–60 days."
              />
              <FormInput
                value={monthlyEvents}
                onChange={(e) => setMonthlyEvents(e.target.value)}
                placeholder="Example: 12"
              />
            </div>

            <div className="grid gap-3">
              <FieldLabel
                title="% who leave a review when asked"
                helper="Start at 30–50%. With a strong process, 60–80% is possible."
              />
              <FormInput
                value={reviewConvRate}
                onChange={(e) => setReviewConvRate(e.target.value)}
                placeholder="Example: 40"
              />
            </div>
          </div>

          <div className="border-t border-sky-500 px-5 py-5 sm:px-6">
            <button
              className="border border-sky-900 bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-950"
              type="submit"
            >
              Save capacity settings
            </button>
          </div>
        </form>
      </div>
    </Card>
  );
}