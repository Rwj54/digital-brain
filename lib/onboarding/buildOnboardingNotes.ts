import { enrichProjectIdentity } from "@/lib/onboarding/enrichProjectIdentity";
import { runBaselineRankDiscovery } from "@/lib/domain/rank/runBaselineRankDiscovery";
import { runAuthorityBaseline } from "@/lib/authority/runAuthorityBaseline";

type PersistResolvedIdentityFieldsResult = {
  targetDomainPersisted: boolean;
  targetBrandNamePersisted: boolean;
};

type PersistCanonicalAutomationFieldsResult = {
  primaryCategoryPersisted: boolean;
  targetMetroPersisted: boolean;
  targetRadiusMilesPersisted: boolean;
  mapsLocationCodePersisted: boolean;
  resolvedMapsLocationCode: number | null;
};

type PersistRankCoordinatesResult = {
  rankCoordinatesPersisted: boolean;
  rankLatPersisted: boolean;
  rankLngPersisted: boolean;
  resolvedRankLat: number | null;
  resolvedRankLng: number | null;
  matchedBy: "domain" | "title" | "first_item" | null;
  matchedTitle: string | null;
  matchedDomain: string | null;
  skippedReason: string | null;
};

type NormalizeProjectRankKeywordsResult = {
  normalizedKeywordCount: number;
};

type NormalizeLegacyRankSnapshotsResult = {
  normalizedSnapshotCount: number;
};

type BaselineRankDiscoveryResult = Awaited<
  ReturnType<typeof runBaselineRankDiscovery>
>;

type AuthorityBaselineResult = Awaited<ReturnType<typeof runAuthorityBaseline>>;

export type BuildOnboardingNotesInput = {
  identity: ReturnType<typeof enrichProjectIdentity>;
  persistedIdentity: PersistResolvedIdentityFieldsResult;
  persistedAutomationFields: PersistCanonicalAutomationFieldsResult;
  persistedRankCoordinates: PersistRankCoordinatesResult;
  normalizedKeywords: NormalizeProjectRankKeywordsResult;
  normalizedRankSnapshots: NormalizeLegacyRankSnapshotsResult;
  baselineRankDiscovery: BaselineRankDiscoveryResult;
  authorityBaseline: AuthorityBaselineResult;
  seededKeywordCount: number;
  refreshedActiveKeywords: Array<{
    keyword: string;
    metro: string;
    priority: number;
  }>;
  canonicalKeywordForSnapshots: string;
  competitorDiscoveryStarted: boolean;
  competitorDiscoveryFailureNote?: string | null;
  baselineRankPlanned: boolean;
  authorityBaselinePlanned: boolean;
};

function pushNote(notes: string[], value: string | null | undefined): void {
  if (typeof value === "string" && value.trim()) {
    notes.push(value);
  }
}

function appendIdentityPersistenceNotes(
  notes: string[],
  params: {
    identity: ReturnType<typeof enrichProjectIdentity>;
    persistedIdentity: PersistResolvedIdentityFieldsResult;
    persistedAutomationFields: PersistCanonicalAutomationFieldsResult;
  }
): void {
  const { identity, persistedIdentity, persistedAutomationFields } = params;

  if (persistedIdentity.targetDomainPersisted && identity.canonicalDomain) {
    notes.push(`Persisted target_domain: ${identity.canonicalDomain}`);
  }

  if (
    persistedIdentity.targetBrandNamePersisted &&
    identity.resolvedBusinessName
  ) {
    notes.push(`Persisted target_brand_name: ${identity.resolvedBusinessName}`);
  }

  if (
    persistedAutomationFields.primaryCategoryPersisted &&
    identity.canonicalCategory
  ) {
    notes.push(
      `Promoted canonical category into primary_category: ${identity.canonicalCategory}`
    );
  }

  if (
    persistedAutomationFields.targetMetroPersisted &&
    identity.canonicalMetro
  ) {
    notes.push(
      `Persisted automation-safe target_metro: ${identity.canonicalMetro}`
    );
  }

  if (
    persistedAutomationFields.targetRadiusMilesPersisted &&
    typeof identity.canonicalRadiusMiles === "number"
  ) {
    notes.push(
      `Persisted canonical target_radius_miles: ${identity.canonicalRadiusMiles}`
    );
  }

  if (persistedAutomationFields.mapsLocationCodePersisted) {
    notes.push("Persisted maps_location_code from canonical metro.");
  }
}

function appendRankCoordinateNotes(
  notes: string[],
  params: {
    identity: ReturnType<typeof enrichProjectIdentity>;
    persistedRankCoordinates: PersistRankCoordinatesResult;
  }
): void {
  const { identity, persistedRankCoordinates } = params;

  if (persistedRankCoordinates.rankCoordinatesPersisted) {
    notes.push(
      `Persisted rank coordinates from DataForSEO business info: ${persistedRankCoordinates.resolvedRankLat}, ${persistedRankCoordinates.resolvedRankLng}.`
    );
    notes.push(
      `Rank coordinate match strategy: ${persistedRankCoordinates.matchedBy}.`
    );

    if (persistedRankCoordinates.matchedTitle) {
      notes.push(
        `Matched business listing title for rank coordinates: ${persistedRankCoordinates.matchedTitle}`
      );
    }

    if (persistedRankCoordinates.matchedDomain) {
      notes.push(
        `Matched business listing domain for rank coordinates: ${persistedRankCoordinates.matchedDomain}`
      );
    }

    return;
  }

  if (
    persistedRankCoordinates.skippedReason &&
    !identity.notes.includes(persistedRankCoordinates.skippedReason)
  ) {
    notes.push(persistedRankCoordinates.skippedReason);
    return;
  }

  if (
    persistedRankCoordinates.resolvedRankLat !== null &&
    persistedRankCoordinates.resolvedRankLng !== null
  ) {
    notes.push(
      `Rank coordinates resolved during onboarding: ${persistedRankCoordinates.resolvedRankLat}, ${persistedRankCoordinates.resolvedRankLng}.`
    );
    notes.push(
      `Rank coordinate match strategy: ${persistedRankCoordinates.matchedBy}.`
    );
  }
}

function appendNormalizationNotes(
  notes: string[],
  params: {
    identity: ReturnType<typeof enrichProjectIdentity>;
    normalizedKeywords: NormalizeProjectRankKeywordsResult;
    normalizedRankSnapshots: NormalizeLegacyRankSnapshotsResult;
    canonicalKeywordForSnapshots: string;
  }
): void {
  const {
    identity,
    normalizedKeywords,
    normalizedRankSnapshots,
    canonicalKeywordForSnapshots,
  } = params;

  if (normalizedKeywords.normalizedKeywordCount > 0 && identity.canonicalMetro) {
    notes.push(
      `Normalized ${normalizedKeywords.normalizedKeywordCount} project rank keyword record(s) to canonical keyword casing and metro: ${identity.canonicalMetro}.`
    );
  }

  if (
    normalizedRankSnapshots.normalizedSnapshotCount > 0 &&
    identity.canonicalMetro &&
    canonicalKeywordForSnapshots
  ) {
    notes.push(
      `Normalized ${normalizedRankSnapshots.normalizedSnapshotCount} legacy rank snapshot row(s) to canonical rank context: ${canonicalKeywordForSnapshots} / ${identity.canonicalMetro}.`
    );
  }
}

function appendBaselineNotes(
  notes: string[],
  baselineRankDiscovery: BaselineRankDiscoveryResult
): void {
  if (baselineRankDiscovery.executed) {
    notes.push(
      `Baseline rank discovery executed during onboarding for ${baselineRankDiscovery.keyword} / ${baselineRankDiscovery.metro}.`
    );
    notes.push(
      `Baseline rank discovery stored ${baselineRankDiscovery.storedCount} snapshot row(s) from ${baselineRankDiscovery.candidateCount} discovered candidate(s).`
    );

    if (baselineRankDiscovery.targetProfileHydrated) {
      notes.push(
        `Hydrated gbp_profiles from baseline rank discovery using ${baselineRankDiscovery.targetProfileMatchedBy} match.`
      );

      if (baselineRankDiscovery.targetProfileName) {
        notes.push(
          `Hydrated target GBP profile name: ${baselineRankDiscovery.targetProfileName}.`
        );
      }

      if (baselineRankDiscovery.targetProfilePlaceId) {
        notes.push(
          `Hydrated target GBP profile place_id: ${baselineRankDiscovery.targetProfilePlaceId}.`
        );
      }
    }

    return;
  }

  if (baselineRankDiscovery.skippedReason) {
    notes.push(baselineRankDiscovery.skippedReason);
  }
}

function appendKeywordReadinessNotes(
  notes: string[],
  params: {
    seededKeywordCount: number;
    refreshedActiveKeywords: Array<{
      keyword: string;
      metro: string;
      priority: number;
    }>;
  }
): void {
  const { seededKeywordCount, refreshedActiveKeywords } = params;

  if (seededKeywordCount > 0) {
    notes.push(
      `Seeded ${seededKeywordCount} keyword(s) during onboarding startup.`
    );
  }

  if (refreshedActiveKeywords.length === 0) {
    notes.push(
      "Project has no active rank keywords yet, so rank and authority baselines remain blocked."
    );
    return;
  }

  notes.push(
    `Project has ${refreshedActiveKeywords.length} active rank keyword(s) ready for downstream workflows.`
  );
}

function appendCompetitorDiscoveryNotes(
  notes: string[],
  competitorDiscoveryStarted: boolean,
  competitorDiscoveryFailureNote: string | null | undefined,
  identity: ReturnType<typeof enrichProjectIdentity>
): void {
  if (competitorDiscoveryStarted) {
    notes.push("Competitor discovery started successfully during onboarding.");
    return;
  }

  pushNote(notes, competitorDiscoveryFailureNote);

  if (!identity.readiness.competitorDiscoveryReady) {
    notes.push(
      "Competitor discovery was skipped because canonical category or canonical metro is still missing."
    );
  }
}

function appendAuthorityNotes(
  notes: string[],
  authorityBaseline: AuthorityBaselineResult
): void {
  if (authorityBaseline.executed) {
    notes.push(
      `Authority baseline executed during onboarding: score ${authorityBaseline.authorityScore}, tier ${authorityBaseline.authorityTier}, momentum ${authorityBaseline.momentumLabel}.`
    );
    notes.push(
      `Authority baseline stored ${authorityBaseline.actionsCount} project action(s).`
    );
    return;
  }

  if (authorityBaseline.skippedReason) {
    notes.push(authorityBaseline.skippedReason);
  }
}

function appendPlanningNotes(
  notes: string[],
  params: {
    baselineRankDiscovery: BaselineRankDiscoveryResult;
    authorityBaseline: AuthorityBaselineResult;
    baselineRankPlanned: boolean;
    authorityBaselinePlanned: boolean;
  }
): void {
  const {
    baselineRankDiscovery,
    authorityBaseline,
    baselineRankPlanned,
    authorityBaselinePlanned,
  } = params;

  if (baselineRankDiscovery.executed) {
    notes.push(
      "Baseline rank discovery has already been initialized during onboarding."
    );
  } else if (baselineRankPlanned) {
    notes.push(
      "Baseline rank discovery is now structurally ready once the rank workflow is invoked."
    );
  } else {
    notes.push(
      "Baseline rank discovery is not ready yet because rank coordinates or active keywords are still missing."
    );
  }

  if (authorityBaseline.executed) {
    notes.push(
      "Authority baseline has already been initialized during onboarding."
    );
  } else if (authorityBaselinePlanned) {
    notes.push(
      "Authority baseline is now structurally ready once the authority workflow is invoked."
    );
  } else {
    notes.push(
      "Authority baseline is not ready yet because the rank baseline prerequisites are not fully satisfied."
    );
  }
}

export function buildOnboardingNotes(
  params: BuildOnboardingNotesInput
): string[] {
  const notes: string[] = [
    "Phase 3G onboarding now attempts rank coordinate automation after canonical identity and automation fields are resolved.",
    ...params.identity.notes,
  ];

  appendIdentityPersistenceNotes(notes, {
    identity: params.identity,
    persistedIdentity: params.persistedIdentity,
    persistedAutomationFields: params.persistedAutomationFields,
  });

  appendRankCoordinateNotes(notes, {
    identity: params.identity,
    persistedRankCoordinates: params.persistedRankCoordinates,
  });

  appendNormalizationNotes(notes, {
    identity: params.identity,
    normalizedKeywords: params.normalizedKeywords,
    normalizedRankSnapshots: params.normalizedRankSnapshots,
    canonicalKeywordForSnapshots: params.canonicalKeywordForSnapshots,
  });

  appendBaselineNotes(notes, params.baselineRankDiscovery);

  appendKeywordReadinessNotes(notes, {
    seededKeywordCount: params.seededKeywordCount,
    refreshedActiveKeywords: params.refreshedActiveKeywords,
  });

  appendCompetitorDiscoveryNotes(
    notes,
    params.competitorDiscoveryStarted,
    params.competitorDiscoveryFailureNote,
    params.identity
  );

  appendAuthorityNotes(notes, params.authorityBaseline);

  appendPlanningNotes(notes, {
    baselineRankDiscovery: params.baselineRankDiscovery,
    authorityBaseline: params.authorityBaseline,
    baselineRankPlanned: params.baselineRankPlanned,
    authorityBaselinePlanned: params.authorityBaselinePlanned,
  });

  return notes;
}