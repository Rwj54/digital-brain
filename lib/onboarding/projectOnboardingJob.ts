import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";

export async function startProjectOnboardingJob(params: {
  projectId: string;
  mode: "manual" | "nightly";
  userAgent?: string | null;
  seedKeywordCount: number;
}): Promise<{ jobId: string }> {
  const job = await createProjectJob({
    projectId: params.projectId,
    jobType: "project_onboarding_v1",
    metadata: {
      mode: params.mode,
      userAgent: params.userAgent ?? null,
      seedKeywordCount: params.seedKeywordCount,
    },
  });

  return {
    jobId: job.jobId,
  };
}

export async function completeProjectOnboardingJobSuccess(params: {
  jobId: string;
  capturedAt: string;
  seededKeywordCount: number;
  activeKeywordCount: number;
  competitorDiscoveryStarted: boolean;
  baselineRankPlanned: boolean;
  authorityBaselinePlanned: boolean;
  canonicalDomain: string | null;
  resolvedBusinessName: string | null;
  canonicalCategory: string | null;
  canonicalMetro: string | null;
  canonicalRadiusMiles: number | null;
  targetDomainPersisted: boolean;
  targetBrandNamePersisted: boolean;
  primaryCategoryPersisted: boolean;
  targetMetroPersisted: boolean;
  targetRadiusMilesPersisted: boolean;
  mapsLocationCodePersisted: boolean;
  resolvedMapsLocationCode: number | null;
  rankCoordinatesPersisted: boolean;
  rankLatPersisted: boolean;
  rankLngPersisted: boolean;
  resolvedRankLat: number | null;
  resolvedRankLng: number | null;
  rankCoordinateMatchedBy: "domain" | "title" | "first_item" | null;
  rankCoordinateMatchedTitle: string | null;
  rankCoordinateMatchedDomain: string | null;
  normalizedKeywordCount: number;
  normalizedRankSnapshotCount: number;
  baselineRankDiscoveryExecuted: boolean;
  baselineRankDiscoveryKeyword: string | null;
  baselineRankDiscoveryMetro: string | null;
  baselineRankDiscoveryCandidateCount: number;
  baselineRankDiscoveryStoredCount: number;
  baselineTargetProfileHydrated: boolean;
  baselineTargetProfilePlaceId: string | null;
  baselineTargetProfileName: string | null;
  baselineTargetProfileMatchedBy: string | null;
  authorityBaselineExecuted: boolean;
  authorityBaselineScore: number | null;
  authorityBaselineTier: string | null;
  authorityBaselineMomentumScore: number | null;
  authorityBaselineMomentumLabel: string | null;
  authorityBaselineActionsCount: number;
}): Promise<void> {
  await finishProjectJobSuccess({
    jobId: params.jobId,
    resultSummary: {
      capturedAt: params.capturedAt,
      seededKeywordCount: params.seededKeywordCount,
      activeKeywordCount: params.activeKeywordCount,
      competitorDiscoveryStarted: params.competitorDiscoveryStarted,
      baselineRankPlanned: params.baselineRankPlanned,
      authorityBaselinePlanned: params.authorityBaselinePlanned,
      canonicalDomain: params.canonicalDomain,
      resolvedBusinessName: params.resolvedBusinessName,
      canonicalCategory: params.canonicalCategory,
      canonicalMetro: params.canonicalMetro,
      canonicalRadiusMiles: params.canonicalRadiusMiles,
      targetDomainPersisted: params.targetDomainPersisted,
      targetBrandNamePersisted: params.targetBrandNamePersisted,
      primaryCategoryPersisted: params.primaryCategoryPersisted,
      targetMetroPersisted: params.targetMetroPersisted,
      targetRadiusMilesPersisted: params.targetRadiusMilesPersisted,
      mapsLocationCodePersisted: params.mapsLocationCodePersisted,
      resolvedMapsLocationCode: params.resolvedMapsLocationCode,
      rankCoordinatesPersisted: params.rankCoordinatesPersisted,
      rankLatPersisted: params.rankLatPersisted,
      rankLngPersisted: params.rankLngPersisted,
      resolvedRankLat: params.resolvedRankLat,
      resolvedRankLng: params.resolvedRankLng,
      rankCoordinateMatchedBy: params.rankCoordinateMatchedBy,
      rankCoordinateMatchedTitle: params.rankCoordinateMatchedTitle,
      rankCoordinateMatchedDomain: params.rankCoordinateMatchedDomain,
      normalizedKeywordCount: params.normalizedKeywordCount,
      normalizedRankSnapshotCount: params.normalizedRankSnapshotCount,
      baselineRankDiscoveryExecuted: params.baselineRankDiscoveryExecuted,
      baselineRankDiscoveryKeyword: params.baselineRankDiscoveryKeyword,
      baselineRankDiscoveryMetro: params.baselineRankDiscoveryMetro,
      baselineRankDiscoveryCandidateCount:
        params.baselineRankDiscoveryCandidateCount,
      baselineRankDiscoveryStoredCount: params.baselineRankDiscoveryStoredCount,
      baselineTargetProfileHydrated: params.baselineTargetProfileHydrated,
      baselineTargetProfilePlaceId: params.baselineTargetProfilePlaceId,
      baselineTargetProfileName: params.baselineTargetProfileName,
      baselineTargetProfileMatchedBy: params.baselineTargetProfileMatchedBy,
      authorityBaselineExecuted: params.authorityBaselineExecuted,
      authorityBaselineScore: params.authorityBaselineScore,
      authorityBaselineTier: params.authorityBaselineTier,
      authorityBaselineMomentumScore: params.authorityBaselineMomentumScore,
      authorityBaselineMomentumLabel: params.authorityBaselineMomentumLabel,
      authorityBaselineActionsCount: params.authorityBaselineActionsCount,
    },
  });
}

export async function completeProjectOnboardingJobFailed(params: {
  jobId: string;
  capturedAt: string;
  errorMessage: string;
}): Promise<void> {
  await finishProjectJobFailed({
    jobId: params.jobId,
    errorMessage: params.errorMessage,
    resultSummary: {
      capturedAt: params.capturedAt,
    },
  });
}