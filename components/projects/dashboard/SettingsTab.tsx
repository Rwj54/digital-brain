import { ReviewCapacityCard } from "@/components/projects/dashboard/ReviewCapacityCard";
import { IdentityResolutionCard } from "@/components/projects/dashboard/IdentityResolutionCard";
import { GbpSnapshotCard } from "@/components/projects/dashboard/GbpSnapshotCard";
import { CompetitorsCard } from "@/components/projects/dashboard/CompetitorsCard";
import type {
  CompetitorMetric,
  VolumePresetOption,
} from "@/components/projects/dashboard/types";

type SettingsTabProps = {
  siteUrl: string | null;
  projectCategory: string | null;
  projectMetro: string | null;
  projectRadiusMiles: number | null;
  targetDomain: string | null;
  targetBrandName: string | null;
  onboardingCategory: string;
  onboardingMetro: string;
  labelPlural: string;
  preset: VolumePresetOption;
  presetOptions: VolumePresetOption[];
  volumePreset: string;
  showAdvancedLabels: boolean;
  eventLabelSingular: string;
  eventLabelPlural: string;
  monthlyEvents: string;
  reviewConvRate: string;
  gbpName: string;
  primaryCategory: string;
  placeId: string;
  gbpUrl: string;
  rating: string;
  totalReviews: string;
  photosCount: string;
  compDomain: string;
  compName: string;
  compSource: string;
  compRating: string;
  compReviews: string;
  competitors: CompetitorMetric[];
  onSaveProjectReviewCapacity: (
    e: React.FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  onSaveGbpProfile: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onAddOrUpdateCompetitor: (
    e: React.FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  onDeleteCompetitor: (id: string) => Promise<void>;
  onRunOnboardingClarification: (input: {
    category: string;
    metro: string;
  }) => Promise<void>;
  setOnboardingCategory: React.Dispatch<React.SetStateAction<string>>;
  setOnboardingMetro: React.Dispatch<React.SetStateAction<string>>;
  setVolumePreset: React.Dispatch<React.SetStateAction<string>>;
  setShowAdvancedLabels: React.Dispatch<React.SetStateAction<boolean>>;
  setEventLabelSingular: React.Dispatch<React.SetStateAction<string>>;
  setEventLabelPlural: React.Dispatch<React.SetStateAction<string>>;
  setMonthlyEvents: React.Dispatch<React.SetStateAction<string>>;
  setReviewConvRate: React.Dispatch<React.SetStateAction<string>>;
  setGbpName: React.Dispatch<React.SetStateAction<string>>;
  setPrimaryCategory: React.Dispatch<React.SetStateAction<string>>;
  setPlaceId: React.Dispatch<React.SetStateAction<string>>;
  setGbpUrl: React.Dispatch<React.SetStateAction<string>>;
  setRating: React.Dispatch<React.SetStateAction<string>>;
  setTotalReviews: React.Dispatch<React.SetStateAction<string>>;
  setPhotosCount: React.Dispatch<React.SetStateAction<string>>;
  setCompDomain: React.Dispatch<React.SetStateAction<string>>;
  setCompName: React.Dispatch<React.SetStateAction<string>>;
  setCompSource: React.Dispatch<React.SetStateAction<string>>;
  setCompRating: React.Dispatch<React.SetStateAction<string>>;
  setCompReviews: React.Dispatch<React.SetStateAction<string>>;
};

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" ? value.trim().length > 0 : false;
}

export function SettingsTab({
  siteUrl,
  projectCategory,
  projectMetro,
  projectRadiusMiles,
  targetDomain,
  targetBrandName,
  onboardingCategory,
  onboardingMetro,
  labelPlural,
  preset,
  presetOptions,
  volumePreset,
  showAdvancedLabels,
  eventLabelSingular,
  eventLabelPlural,
  monthlyEvents,
  reviewConvRate,
  gbpName,
  primaryCategory,
  placeId,
  gbpUrl,
  rating,
  totalReviews,
  photosCount,
  compDomain,
  compName,
  compSource,
  compRating,
  compReviews,
  competitors,
  onSaveProjectReviewCapacity,
  onSaveGbpProfile,
  onAddOrUpdateCompetitor,
  onDeleteCompetitor,
  onRunOnboardingClarification,
  setOnboardingCategory,
  setOnboardingMetro,
  setVolumePreset,
  setShowAdvancedLabels,
  setEventLabelSingular,
  setEventLabelPlural,
  setMonthlyEvents,
  setReviewConvRate,
  setGbpName,
  setPrimaryCategory,
  setPlaceId,
  setGbpUrl,
  setRating,
  setTotalReviews,
  setPhotosCount,
  setCompDomain,
  setCompName,
  setCompSource,
  setCompRating,
  setCompReviews,
}: SettingsTabProps) {
  const needsOnboardingClarification =
    !hasValue(projectCategory) || !hasValue(projectMetro);

  async function handleOnboardingClarification(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    await onRunOnboardingClarification({
      category: onboardingCategory,
      metro: onboardingMetro,
    });
  }

  return (
    <div className="grid gap-4">
      {needsOnboardingClarification ? (
        <section aria-label="Onboarding clarification">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
              Onboarding clarification
            </p>

            <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-strong)]">
              Fill in the missing setup fields
            </h3>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-body)]">
              Digital Brain could not confirm the business category and market
              automatically for this website. Add the missing values here so the
              project can finish onboarding and activate rank tracking.
            </p>

            <form className="mt-5 grid gap-4" onSubmit={handleOnboardingClarification}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--text-strong)]">
                    Business category
                  </span>
                  <input
                    value={onboardingCategory}
                    onChange={(e) => setOnboardingCategory(e.target.value)}
                    placeholder="Wedding Planner"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--brand-600)]"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--text-strong)]">
                    Metro
                  </span>
                  <input
                    value={onboardingMetro}
                    onChange={(e) => setOnboardingMetro(e.target.value)}
                    placeholder="Omaha, NE"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-strong)] outline-none transition focus:border-[var(--brand-600)]"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--brand-700)" }}
                >
                  Continue onboarding
                </button>
                <p className="text-sm text-[var(--text-body)]">
                  Use real values only. Metro must be in <span className="font-semibold text-[var(--text-strong)]">City, ST</span> format.
                </p>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section aria-label="Project identity">
        <IdentityResolutionCard
          siteUrl={siteUrl}
          targetDomain={targetDomain}
          targetBrandName={targetBrandName}
          category={projectCategory}
          metro={projectMetro}
          radiusMiles={projectRadiusMiles}
        />
      </section>

      <section aria-label="Review capacity settings">
        <ReviewCapacityCard
          labelPlural={labelPlural}
          preset={preset}
          presetOptions={presetOptions}
          volumePreset={volumePreset}
          showAdvancedLabels={showAdvancedLabels}
          eventLabelSingular={eventLabelSingular}
          eventLabelPlural={eventLabelPlural}
          monthlyEvents={monthlyEvents}
          reviewConvRate={reviewConvRate}
          onSaveProjectReviewCapacity={onSaveProjectReviewCapacity}
          setVolumePreset={setVolumePreset}
          setShowAdvancedLabels={setShowAdvancedLabels}
          setEventLabelSingular={setEventLabelSingular}
          setEventLabelPlural={setEventLabelPlural}
          setMonthlyEvents={setMonthlyEvents}
          setReviewConvRate={setReviewConvRate}
        />
      </section>

      <section aria-label="Google Business Profile snapshot">
        <GbpSnapshotCard
          gbpName={gbpName}
          primaryCategory={primaryCategory}
          placeId={placeId}
          gbpUrl={gbpUrl}
          rating={rating}
          totalReviews={totalReviews}
          photosCount={photosCount}
          onSaveGbpProfile={onSaveGbpProfile}
          setGbpName={setGbpName}
          setPrimaryCategory={setPrimaryCategory}
          setPlaceId={setPlaceId}
          setGbpUrl={setGbpUrl}
          setRating={setRating}
          setTotalReviews={setTotalReviews}
          setPhotosCount={setPhotosCount}
        />
      </section>

      <section aria-label="Competitor settings">
        <CompetitorsCard
          compDomain={compDomain}
          compName={compName}
          compSource={compSource}
          compRating={compRating}
          compReviews={compReviews}
          competitors={competitors}
          onAddOrUpdateCompetitor={onAddOrUpdateCompetitor}
          onDeleteCompetitor={onDeleteCompetitor}
          setCompDomain={setCompDomain}
          setCompName={setCompName}
          setCompSource={setCompSource}
          setCompRating={setCompRating}
          setCompReviews={setCompReviews}
        />
      </section>
    </div>
  );
}
