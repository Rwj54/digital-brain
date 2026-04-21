import { loadProjectOnboardingContext } from "@/lib/onboarding/loadProjectOnboardingContext";
import { enrichProjectIdentity } from "@/lib/onboarding/enrichProjectIdentity";
import { extractWebsiteOnboardingSignals } from "@/lib/onboarding/extractWebsiteOnboardingSignals";
import { buildOnboardingNotes } from "@/lib/onboarding/buildOnboardingNotes";
import { buildProjectOnboardingJobSuccessSummary } from "@/lib/onboarding/buildProjectOnboardingJobSuccessSummary";
import {
  buildProjectOnboardingKeywordCandidates,
  buildProjectOnboardingSeedKeywords,
  normalizeProjectOnboardingRankKeywords,
  upsertProjectOnboardingSeedKeywords,
} from "@/lib/onboarding/projectOnboardingKeywords";
import {
  persistProjectOnboardingAutomationFields,
  persistProjectOnboardingIdentityFields,
} from "@/lib/onboarding/projectOnboardingPersistence";
import { persistProjectOnboardingRankCoordinates } from "@/lib/onboarding/projectOnboardingRankCoordinates";
import { normalizeProjectOnboardingLegacyRankSnapshots } from "@/lib/onboarding/projectOnboardingRankSnapshots";
import {
  completeProjectOnboardingJobFailed,
  completeProjectOnboardingJobSuccess,
  startProjectOnboardingJob,
} from "@/lib/onboarding/projectOnboardingJob";
import { discoverCompetitorsForProject } from "@/lib/domain/competitors/discoverCompetitorsForProject";
import { runBaselineRankDiscovery } from "@/lib/domain/rank/runBaselineRankDiscovery";
import { runAuthorityBaseline } from "@/lib/authority/runAuthorityBaseline";

export type SeedRankKeywordInput = {
  keyword: string;
  metro: string;
  priority?: number;
  isActive?: boolean;
};

export type RunProjectOnboardingInput = {
  projectId: string;
  mode?: "manual" | "nightly";
  userAgent?: string | null;
  confirmedCategory?: string | null;
  confirmedMetro?: string | null;
  seedKeywords?: SeedRankKeywordInput[];
};

export type ProjectOnboardingSetupStatus =
  | "activated"
  | "needs_confirmation"
  | "blocked_missing_category"
  | "blocked_missing_metro"
  | "blocked_missing_category_and_metro";

export type ProjectOnboardingBlockingField = "category" | "metro";

export type RunProjectOnboardingResult =
  | {
      ok: true;
      projectId: string;
      jobId: string;
      mode: "manual" | "nightly";
      capturedAt: string;
      seededKeywordCount: number;
      activeKeywordCount: number;
      setupStatus: ProjectOnboardingSetupStatus;
      blockingFields: ProjectOnboardingBlockingField[];
      keywordDiscovery: {
        candidateKeywords: string[];
        recommendedPrimaryKeyword: string | null;
      };
      identity: {
        canonicalSiteUrl: string | null;
        canonicalDomain: string | null;
        inferredBrandName: string | null;
        resolvedBusinessName: string | null;
        businessNameSource:
          | "stored_target_brand_name"
          | "domain_inference"
          | "missing";
        googlePrimaryCategory: string | null;
        googlePlaceId: string | null;
        canonicalCategory: string | null;
        canonicalMetro: string | null;
        canonicalRadiusMiles: number | null;
        categorySource:
          | "gbp_primary_category"
          | "stored_primary_category"
          | "confirmed_category"
          | "stored_category"
          | "website_inference"
          | "missing";
        categoryConfidence: "high" | "medium" | "low" | "missing";
        metroSource:
          | "stored_target_metro"
          | "confirmed_metro"
          | "stored_metro"
          | "website_inference"
          | "missing";
        metroConfidence: "high" | "medium" | "low" | "missing";
        resolutionExplanation: string[];
      };
      steps: {
        projectValidated: boolean;
        identityEnriched: boolean;
        rankInputsValidated: boolean;
        keywordSeeded: boolean;
        competitorDiscoveryStarted: boolean;
        baselineRankPlanned: boolean;
        authorityBaselinePlanned: boolean;
      };
      notes: string[];
    }
  | {
      ok: false;
      projectId: string;
      jobId?: string;
      mode: "manual" | "nightly";
      status: number;
      error: string;
    };

function todayDateUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function normalizeKeywordValue(value: string | null | undefined): string {
  return normalizeString(value).toLowerCase();
}

function pickFirstNonEmptyString(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function pickFirstPositiveInteger(
  ...values: Array<number | null | undefined>
): number | null {
  for (const value of values) {
    const normalized = normalizePositiveInteger(value);
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function buildProjectOnboardingConfirmationNotes(params: {
  confirmedCategory?: string | null;
  confirmedMetro?: string | null;
}): string[] {
  const notes: string[] = [];

  const confirmedCategory = normalizeString(params.confirmedCategory);
  const confirmedMetro = normalizeString(params.confirmedMetro);

  if (confirmedCategory) {
    notes.push(`Manual onboarding category confirmation provided: ${confirmedCategory}.`);
  }

  if (confirmedMetro) {
    notes.push(`Manual onboarding metro confirmation provided: ${confirmedMetro}.`);
  }

  return notes;
}

function buildProjectOnboardingBlockingFields(params: {
  canonicalCategory: string | null;
  canonicalMetro: string | null;
}): ProjectOnboardingBlockingField[] {
  const blockingFields: ProjectOnboardingBlockingField[] = [];

  if (!normalizeString(params.canonicalCategory)) {
    blockingFields.push("category");
  }

  if (!normalizeString(params.canonicalMetro)) {
    blockingFields.push("metro");
  }

  return blockingFields;
}

function buildProjectOnboardingSetupStatus(params: {
  blockingFields: ProjectOnboardingBlockingField[];
  activeKeywordCount: number;
  categoryConfidence: "high" | "medium" | "low" | "missing";
  metroConfidence: "high" | "medium" | "low" | "missing";
}): ProjectOnboardingSetupStatus {
  const {
    blockingFields,
    activeKeywordCount,
    categoryConfidence,
    metroConfidence,
  } = params;

  const missingCategory = blockingFields.includes("category");
  const missingMetro = blockingFields.includes("metro");

  if (missingCategory && missingMetro) {
    return "blocked_missing_category_and_metro";
  }

  if (missingCategory) {
    return "blocked_missing_category";
  }

  if (missingMetro) {
    return "blocked_missing_metro";
  }

  if (categoryConfidence === "low" || metroConfidence === "low") {
    return "needs_confirmation";
  }

  if (activeKeywordCount > 0) {
    return "activated";
  }

  return "needs_confirmation";
}

const CATEGORY_PLACEHOLDERS = new Set([
  "real category",
  "actual category",
  "category",
]);

const METRO_PLACEHOLDERS = new Set([
  "city, st",
  "actual city, st",
  "real metro",
  "real metro, st",
  "metro, st",
]);

function isValidCityStateMetro(value: string): boolean {
  return /^[A-Za-z][A-Za-z'.-]*(?: [A-Za-z][A-Za-z'.-]*)*, [A-Z]{2}$/.test(value);
}

function validateProjectOnboardingClarificationInputs(
  input: RunProjectOnboardingInput,
):
  | {
      status: number;
      error: string;
    }
  | null {
  const confirmedCategory = normalizeString(input.confirmedCategory);
  const confirmedMetro = normalizeString(input.confirmedMetro);

  if (confirmedCategory && CATEGORY_PLACEHOLDERS.has(confirmedCategory.toLowerCase())) {
    return {
      status: 400,
      error:
        'confirmed category must be a real business category, not a placeholder.',
    };
  }

  if (confirmedMetro) {
    const normalizedMetro = confirmedMetro.toLowerCase();

    if (METRO_PLACEHOLDERS.has(normalizedMetro)) {
      return {
        status: 400,
        error:
          'confirmed metro must be a real city and state abbreviation, not a placeholder. Example: "Omaha, NE".',
      };
    }

    if (!isValidCityStateMetro(confirmedMetro)) {
      return {
        status: 400,
        error: `confirmed metro must be in "City, ST" format. Got: "${confirmedMetro}"`,
      };
    }
  }

  const explicitSeedKeywords = Array.isArray(input.seedKeywords)
    ? input.seedKeywords
    : [];

  for (const row of explicitSeedKeywords) {
    const keyword = normalizeString(row.keyword);
    const metro = normalizeString(row.metro);

    if (keyword && CATEGORY_PLACEHOLDERS.has(keyword.toLowerCase())) {
      return {
        status: 400,
        error:
          'seed keyword values must be real business keywords, not placeholders.',
      };
    }

    if (metro) {
      const normalizedMetro = metro.toLowerCase();

      if (METRO_PLACEHOLDERS.has(normalizedMetro)) {
        return {
          status: 400,
          error:
            'seed keyword metro values must be real city and state abbreviations, not placeholders. Example: "Omaha, NE".',
        };
      }

      if (!isValidCityStateMetro(metro)) {
        return {
          status: 400,
          error: `seed keyword metro must be in "City, ST" format. Got: "${metro}"`,
        };
      }
    }
  }

  return null;
}

export async function runProjectOnboarding(
  input: RunProjectOnboardingInput,
): Promise<RunProjectOnboardingResult> {
  const projectId =
    typeof input.projectId === "string" ? input.projectId.trim() : "";
  const mode = input.mode === "nightly" ? "nightly" : "manual";
  const capturedAt = todayDateUTC();

  if (!projectId) {
    return {
      ok: false,
      projectId: "",
      mode,
      status: 400,
      error: "Missing projectId.",
    };
  }

  const clarificationValidationError =
    validateProjectOnboardingClarificationInputs(input);

  if (clarificationValidationError) {
    return {
      ok: false,
      projectId,
      mode,
      status: clarificationValidationError.status,
      error: clarificationValidationError.error,
    };
  }

  const job = await startProjectOnboardingJob({
    projectId,
    mode,
    userAgent: input.userAgent ?? null,
    seedKeywordCount: Array.isArray(input.seedKeywords)
      ? input.seedKeywords.length
      : 0,
  });

  try {
    const { project, latestGbpProfile } = await loadProjectOnboardingContext(projectId);

    const initialIdentity = enrichProjectIdentity({
      siteUrl: project.site_url,
      category: project.category,
      metro: project.metro,
      radiusMiles: project.radius_miles,
      primaryCategory: project.primary_category,
      targetMetro: project.target_metro,
      targetRadiusMiles: project.target_radius_miles,
      targetDomain: project.target_domain,
      targetBrandName: project.target_brand_name,
      rankLat: project.rank_lat,
      rankLng: project.rank_lng,
      mapsLocationCode: project.maps_location_code,
    });

    const websiteSignals = await extractWebsiteOnboardingSignals({
      siteUrl: initialIdentity.canonicalSiteUrl ?? project.site_url,
    });

    const effectiveRadiusMiles = pickFirstPositiveInteger(
      project.target_radius_miles,
      project.radius_miles,
      websiteSignals.inferredRadiusMiles,
    );

    const identity = enrichProjectIdentity({
      siteUrl: project.site_url,
      category: project.category,
      metro: project.metro,
      radiusMiles: effectiveRadiusMiles,
      primaryCategory: project.primary_category,
      targetMetro: project.target_metro,
      targetRadiusMiles: effectiveRadiusMiles,
      targetDomain: project.target_domain,
      targetBrandName: project.target_brand_name,
      rankLat: project.rank_lat,
      rankLng: project.rank_lng,
      mapsLocationCode: project.maps_location_code,
      confirmedCategory: input.confirmedCategory ?? null,
      confirmedMetro: input.confirmedMetro ?? null,
      websiteInferredCategory: websiteSignals.inferredCategory,
      websiteInferredMetro: websiteSignals.inferredMetro,
      gbpPrimaryCategory: latestGbpProfile?.primary_category ?? null,
      gbpPlaceId: latestGbpProfile?.place_id ?? null,
    });

    const discoveredKeywordCandidates =
      buildProjectOnboardingKeywordCandidates({
        inputSeedKeywords: input.seedKeywords,
        inferredKeywordCandidates: websiteSignals.inferredKeywordCandidates,
        canonicalCategory: identity.canonicalCategory,
      });

    const effectiveSeedKeywords = identity.readiness.keywordActivationReady
      ? buildProjectOnboardingSeedKeywords({
          inputSeedKeywords: input.seedKeywords,
          discoveredKeywordCandidates,
          canonicalMetro: identity.canonicalMetro,
        })
      : [];

    const persistedIdentity = await persistProjectOnboardingIdentityFields({
      projectId,
      currentTargetDomain: project.target_domain,
      currentTargetBrandName: project.target_brand_name,
      canonicalDomain: identity.canonicalDomain,
      resolvedBusinessName: identity.resolvedBusinessName,
    });

    const persistedAutomationFields =
      await persistProjectOnboardingAutomationFields({
        projectId,
        currentCategory: project.category,
        currentMetro: project.metro,
        currentRadiusMiles: project.radius_miles,
        currentPrimaryCategory: project.primary_category,
        currentTargetMetro: project.target_metro,
        currentTargetRadiusMiles: project.target_radius_miles,
        currentMapsLocationCode: project.maps_location_code,
        canonicalCategory: identity.canonicalCategory,
        canonicalMetro: identity.canonicalMetro,
        canonicalRadiusMiles: identity.canonicalRadiusMiles,
        allowCategoryPersistence: identity.categoryConfidence === "high",
        allowMetroPersistence:
          identity.metroConfidence === "high" ||
          identity.metroConfidence === "medium",
      });

    const seededKeywordCount = await upsertProjectOnboardingSeedKeywords({
      projectId,
      seedKeywords: effectiveSeedKeywords,
      canonicalMetro: identity.canonicalMetro,
    });

    const effectiveCanonicalDomain =
      normalizeString(identity.canonicalDomain).toLowerCase() ||
      normalizeString(project.target_domain).toLowerCase() ||
      null;

    const effectiveResolvedBusinessName =
      normalizeString(identity.resolvedBusinessName) ||
      normalizeString(project.target_brand_name) ||
      null;

    const effectiveMapsLocationCode =
      persistedAutomationFields.resolvedMapsLocationCode ??
      normalizePositiveInteger(project.maps_location_code);

    const persistedRankCoordinates =
      await persistProjectOnboardingRankCoordinates({
        projectId,
        currentRankLat: project.rank_lat,
        currentRankLng: project.rank_lng,
        resolvedBusinessName: effectiveResolvedBusinessName,
        canonicalDomain: effectiveCanonicalDomain,
        mapsLocationCode: effectiveMapsLocationCode,
      });

    const normalizedKeywords = await normalizeProjectOnboardingRankKeywords({
      projectId,
      canonicalMetro: identity.canonicalMetro,
    });

    const canonicalKeywordForSnapshots =
      normalizeKeywordValue(effectiveSeedKeywords[0]?.keyword) ||
      normalizeKeywordValue(identity.canonicalCategory);

    const normalizedRankSnapshots =
      await normalizeProjectOnboardingLegacyRankSnapshots({
        projectId,
        canonicalKeyword: canonicalKeywordForSnapshots,
        canonicalMetro: identity.canonicalMetro,
      });

    const refreshedContext = await loadProjectOnboardingContext(projectId);
    const refreshedActiveKeywords = refreshedContext.activeKeywords.map((row) => ({
      keyword: row.keyword,
      metro: row.metro,
      priority: row.priority,
    }));

    const blockingFields = buildProjectOnboardingBlockingFields({
      canonicalCategory: identity.canonicalCategory,
      canonicalMetro: identity.canonicalMetro,
    });

    const setupStatus = buildProjectOnboardingSetupStatus({
      blockingFields,
      activeKeywordCount: refreshedActiveKeywords.length,
      categoryConfidence: identity.categoryConfidence,
      metroConfidence: identity.metroConfidence,
    });

    const baselineRankDiscovery = await runBaselineRankDiscovery({
      projectId,
      activeKeywords: refreshedActiveKeywords,
      rankLat:
        persistedRankCoordinates.resolvedRankLat ?? project.rank_lat ?? null,
      rankLng:
        persistedRankCoordinates.resolvedRankLng ?? project.rank_lng ?? null,
      capturedAt,
    });

    const hasActiveKeywords = refreshedActiveKeywords.length > 0;
    const hasRankCoordinates =
      (persistedRankCoordinates.resolvedRankLat ?? project.rank_lat ?? null) !==
        null &&
      (persistedRankCoordinates.resolvedRankLng ?? project.rank_lng ?? null) !==
        null;

    const baselineRankPlanned = hasRankCoordinates && hasActiveKeywords;

    let competitorDiscoveryStarted = false;
    let competitorDiscoveryFailureNote: string | null = null;

    if (identity.readiness.competitorDiscoveryReady) {
      const discoveryResult = await discoverCompetitorsForProject({
        projectId,
        mode,
        userAgent: input.userAgent ?? null,
      });

      if (discoveryResult.ok) {
        competitorDiscoveryStarted = true;
      } else {
        competitorDiscoveryFailureNote = `Competitor discovery did not start cleanly during onboarding: ${discoveryResult.error}`;
      }
    }

    const authorityBaseline =
      baselineRankDiscovery.executed && competitorDiscoveryStarted
        ? await runAuthorityBaseline({
            projectId,
            capturedAt,
            version: "v1.1",
          })
        : {
            executed: false,
            authorityScore: null,
            authorityTier: null,
            momentumScore: null,
            momentumLabel: null,
            actionsCount: 0,
            skippedReason:
              baselineRankDiscovery.executed && !competitorDiscoveryStarted
                ? "Authority baseline was skipped because competitor discovery did not complete successfully."
                : "Authority baseline was skipped because baseline rank discovery did not execute.",
          };

    const authorityBaselinePlanned =
      baselineRankPlanned && competitorDiscoveryStarted;

    const notes = [
      ...buildProjectOnboardingConfirmationNotes({
        confirmedCategory: input.confirmedCategory,
        confirmedMetro: input.confirmedMetro,
      }),
      ...buildOnboardingNotes({
        identity,
        websiteSignalNotes: websiteSignals.notes,
        persistedIdentity,
        persistedAutomationFields,
        persistedRankCoordinates,
        normalizedKeywords,
        normalizedRankSnapshots,
        baselineRankDiscovery,
        authorityBaseline,
        seededKeywordCount,
        refreshedActiveKeywords,
        canonicalKeywordForSnapshots,
        competitorDiscoveryStarted,
        competitorDiscoveryFailureNote,
        baselineRankPlanned,
        authorityBaselinePlanned,
      }),
    ];

    const result: RunProjectOnboardingResult = {
      ok: true,
      projectId,
      jobId: job.jobId,
      mode,
      capturedAt,
      seededKeywordCount,
      activeKeywordCount: refreshedActiveKeywords.length,
      setupStatus,
      blockingFields,
      keywordDiscovery: {
        candidateKeywords: discoveredKeywordCandidates,
        recommendedPrimaryKeyword: discoveredKeywordCandidates[0] ?? null,
      },
      identity: {
        canonicalSiteUrl: identity.canonicalSiteUrl,
        canonicalDomain: identity.canonicalDomain,
        inferredBrandName: identity.inferredBrandName,
        resolvedBusinessName: identity.resolvedBusinessName,
        businessNameSource: identity.businessNameSource,
        googlePrimaryCategory: identity.googlePrimaryCategory,
        googlePlaceId: identity.googlePlaceId,
        canonicalCategory: identity.canonicalCategory,
        canonicalMetro: identity.canonicalMetro,
        canonicalRadiusMiles: identity.canonicalRadiusMiles,
        categorySource: identity.categorySource,
        categoryConfidence: identity.categoryConfidence,
        metroSource: identity.metroSource,
        metroConfidence: identity.metroConfidence,
        resolutionExplanation: identity.resolutionExplanation,
      },
      steps: {
        projectValidated: true,
        identityEnriched: true,
        rankInputsValidated: hasRankCoordinates,
        keywordSeeded: seededKeywordCount > 0,
        competitorDiscoveryStarted,
        baselineRankPlanned,
        authorityBaselinePlanned,
      },
      notes,
    };

    const jobSuccessSummary = buildProjectOnboardingJobSuccessSummary({
      capturedAt,
      seededKeywordCount,
      activeKeywordCount: refreshedActiveKeywords.length,
      competitorDiscoveryStarted,
      baselineRankPlanned,
      authorityBaselinePlanned,
      canonicalDomain: identity.canonicalDomain,
      resolvedBusinessName: identity.resolvedBusinessName,
      canonicalCategory: identity.canonicalCategory,
      canonicalMetro: identity.canonicalMetro,
      canonicalRadiusMiles: identity.canonicalRadiusMiles,
      targetDomainPersisted: persistedIdentity.targetDomainPersisted,
      targetBrandNamePersisted: persistedIdentity.targetBrandNamePersisted,
      primaryCategoryPersisted:
        persistedAutomationFields.primaryCategoryPersisted,
      targetMetroPersisted: persistedAutomationFields.targetMetroPersisted,
      targetRadiusMilesPersisted:
        persistedAutomationFields.targetRadiusMilesPersisted,
      mapsLocationCodePersisted:
        persistedAutomationFields.mapsLocationCodePersisted,
      resolvedMapsLocationCode:
        persistedAutomationFields.resolvedMapsLocationCode,
      rankCoordinatesPersisted:
        persistedRankCoordinates.rankCoordinatesPersisted,
      rankLatPersisted: persistedRankCoordinates.rankLatPersisted,
      rankLngPersisted: persistedRankCoordinates.rankLngPersisted,
      resolvedRankLat: persistedRankCoordinates.resolvedRankLat,
      resolvedRankLng: persistedRankCoordinates.resolvedRankLng,
      rankCoordinateMatchedBy: persistedRankCoordinates.matchedBy,
      rankCoordinateMatchedTitle: persistedRankCoordinates.matchedTitle,
      rankCoordinateMatchedDomain: persistedRankCoordinates.matchedDomain,
      normalizedKeywordCount: normalizedKeywords.normalizedKeywordCount,
      normalizedRankSnapshotCount:
        normalizedRankSnapshots.normalizedSnapshotCount,
      baselineRankDiscoveryExecuted: baselineRankDiscovery.executed,
      baselineRankDiscoveryKeyword: baselineRankDiscovery.keyword,
      baselineRankDiscoveryMetro: baselineRankDiscovery.metro,
      baselineRankDiscoveryCandidateCount:
        baselineRankDiscovery.candidateCount,
      baselineRankDiscoveryStoredCount: baselineRankDiscovery.storedCount,
      baselineTargetProfileHydrated:
        baselineRankDiscovery.targetProfileHydrated,
      baselineTargetProfilePlaceId:
        baselineRankDiscovery.targetProfilePlaceId,
      baselineTargetProfileName:
        baselineRankDiscovery.targetProfileName,
      baselineTargetProfileMatchedBy:
        baselineRankDiscovery.targetProfileMatchedBy,
      authorityBaselineExecuted: authorityBaseline.executed,
      authorityBaselineScore: authorityBaseline.authorityScore,
      authorityBaselineTier: authorityBaseline.authorityTier,
      authorityBaselineMomentumScore: authorityBaseline.momentumScore,
      authorityBaselineMomentumLabel: authorityBaseline.momentumLabel,
      authorityBaselineActionsCount: authorityBaseline.actionsCount,
    });

    await completeProjectOnboardingJobSuccess({
      jobId: job.jobId,
      ...jobSuccessSummary,
    });

    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding error.";

    await completeProjectOnboardingJobFailed({
      jobId: job.jobId,
      capturedAt,
      errorMessage: message,
    });

    return {
      ok: false,
      projectId,
      jobId: job.jobId,
      mode,
      status: 500,
      error: message,
    };
  }
}