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
  onSaveProjectReviewCapacity: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onSaveGbpProfile: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onAddOrUpdateCompetitor: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDeleteCompetitor: (id: string) => Promise<void>;
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

export function SettingsTab({
  siteUrl,
  projectCategory,
  projectMetro,
  projectRadiusMiles,
  targetDomain,
  targetBrandName,
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
  return (
    <div className="grid gap-4">
      <IdentityResolutionCard
        siteUrl={siteUrl}
        targetDomain={targetDomain}
        targetBrandName={targetBrandName}
        category={projectCategory}
        metro={projectMetro}
        radiusMiles={projectRadiusMiles}
      />

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
    </div>
  );
}