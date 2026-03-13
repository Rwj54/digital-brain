import {
  createProjectJob,
  finishProjectJobFailed,
  finishProjectJobSuccess,
} from "@/lib/jobs/projectJobs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadProjectOnboardingContext } from "@/lib/onboarding/loadProjectOnboardingContext";
import { enrichProjectIdentity } from "@/lib/onboarding/enrichProjectIdentity";
import { discoverCompetitorsForProject } from "@/lib/domain/competitors/discoverCompetitorsForProject";

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
  seedKeywords?: SeedRankKeywordInput[];
};

export type RunProjectOnboardingResult =
  | {
      ok: true;
      projectId: string;
      jobId: string;
      mode: "manual" | "nightly";
      capturedAt: string;
      seededKeywordCount: number;
      activeKeywordCount: number;
      identity: {
        canonicalSiteUrl: string | null;
        canonicalDomain: string | null;
        inferredBrandName: string | null;
        resolvedBusinessName: string | null;
        businessNameSource:
          | "stored_target_brand_name"
          | "domain_inference"
          | "missing";
        canonicalCategory: string | null;
        canonicalMetro: string | null;
        canonicalRadiusMiles: number | null;
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

async function upsertSeedKeywords(params: {
  projectId: string;
  seedKeywords: SeedRankKeywordInput[];
}): Promise<number> {
  const supabase = supabaseAdmin();

  const rows = params.seedKeywords
    .map((row, index) => {
      const keyword = typeof row.keyword === "string" ? row.keyword.trim() : "";
      const metro = typeof row.metro === "string" ? row.metro.trim() : "";

      if (!keyword || !metro) {
        return null;
      }

      return {
        project_id: params.projectId,
        keyword,
        metro,
        is_active: row.isActive ?? true,
        priority:
          typeof row.priority === "number" && Number.isFinite(row.priority)
            ? Math.round(row.priority)
            : index + 1,
      };
    })
    .filter(
      (
        row
      ): row is {
        project_id: string;
        keyword: string;
        metro: string;
        is_active: boolean;
        priority: number;
      } => row !== null
    );

  if (rows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("project_rank_keywords")
    .upsert(rows, { onConflict: "project_id,keyword,metro" });

  if (error) {
    throw new Error(`Failed to upsert project_rank_keywords: ${error.message}`);
  }

  return rows.length;
}

async function persistResolvedIdentityFields(params: {
  projectId: string;
  currentTargetDomain: string | null;
  currentTargetBrandName: string | null;
  canonicalDomain: string | null;
  resolvedBusinessName: string | null;
}): Promise<{
  targetDomainPersisted: boolean;
  targetBrandNamePersisted: boolean;
}> {
  const currentTargetDomain =
    typeof params.currentTargetDomain === "string"
      ? params.currentTargetDomain.trim().toLowerCase()
      : "";

  const currentTargetBrandName =
    typeof params.currentTargetBrandName === "string"
      ? params.currentTargetBrandName.trim()
      : "";

  const canonicalDomain =
    typeof params.canonicalDomain === "string"
      ? params.canonicalDomain.trim().toLowerCase()
      : "";

  const resolvedBusinessName =
    typeof params.resolvedBusinessName === "string"
      ? params.resolvedBusinessName.trim()
      : "";

  const updates: {
    target_domain?: string;
    target_brand_name?: string;
  } = {};

  if (!currentTargetDomain && canonicalDomain) {
    updates.target_domain = canonicalDomain;
  }

  if (!currentTargetBrandName && resolvedBusinessName) {
    updates.target_brand_name = resolvedBusinessName;
  }

  if (!updates.target_domain && !updates.target_brand_name) {
    return {
      targetDomainPersisted: false,
      targetBrandNamePersisted: false,
    };
  }

  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", params.projectId);

  if (error) {
    throw new Error(`Failed to persist identity fields: ${error.message}`);
  }

  return {
    targetDomainPersisted: Boolean(updates.target_domain),
    targetBrandNamePersisted: Boolean(updates.target_brand_name),
  };
}

export async function runProjectOnboarding(
  input: RunProjectOnboardingInput
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

  const job = await createProjectJob({
    projectId,
    jobType: "project_onboarding_v1",
    metadata: {
      mode,
      userAgent: input.userAgent ?? null,
      seedKeywordCount: Array.isArray(input.seedKeywords)
        ? input.seedKeywords.length
        : 0,
    },
  });

  try {
    const seededKeywordCount = await upsertSeedKeywords({
      projectId,
      seedKeywords: input.seedKeywords ?? [],
    });

    const { project, activeKeywords } =
      await loadProjectOnboardingContext(projectId);

    const identity = enrichProjectIdentity({
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

    const persistedIdentity = await persistResolvedIdentityFields({
      projectId,
      currentTargetDomain: project.target_domain,
      currentTargetBrandName: project.target_brand_name,
      canonicalDomain: identity.canonicalDomain,
      resolvedBusinessName: identity.resolvedBusinessName,
    });

    const notes: string[] = [
      "Phase 3E onboarding identity enrichment is now running before downstream automation.",
      ...identity.notes,
    ];

    if (persistedIdentity.targetDomainPersisted && identity.canonicalDomain) {
      notes.push(`Persisted target_domain: ${identity.canonicalDomain}`);
    }

    if (
      persistedIdentity.targetBrandNamePersisted &&
      identity.resolvedBusinessName
    ) {
      notes.push(`Persisted target_brand_name: ${identity.resolvedBusinessName}`);
    }

    if (seededKeywordCount > 0) {
      notes.push(
        `Seeded ${seededKeywordCount} keyword(s) during onboarding startup.`
      );
    }

    const hasActiveKeywords = activeKeywords.length > 0;
    const baselineRankPlanned =
      identity.readiness.rankBaselineReady && hasActiveKeywords;
    const authorityBaselinePlanned = baselineRankPlanned;

    if (!hasActiveKeywords) {
      notes.push(
        "Project has no active rank keywords yet, so rank and authority baselines remain blocked."
      );
    } else {
      notes.push(
        `Project has ${activeKeywords.length} active rank keyword(s) ready for downstream workflows.`
      );
    }

    let competitorDiscoveryStarted = false;

    if (identity.readiness.competitorDiscoveryReady) {
      const discoveryResult = await discoverCompetitorsForProject({
        projectId,
        mode,
        userAgent: input.userAgent ?? null,
      });

      if (discoveryResult.ok) {
        competitorDiscoveryStarted = true;
        notes.push(
          "Competitor discovery started successfully during onboarding."
        );
      } else {
        notes.push(
          `Competitor discovery did not start cleanly during onboarding: ${discoveryResult.error}`
        );
      }
    } else {
      notes.push(
        "Competitor discovery was skipped because canonical category or canonical metro is still missing."
      );
    }

    if (baselineRankPlanned) {
      notes.push(
        "Baseline rank discovery is now structurally ready once the rank workflow is invoked."
      );
    } else {
      notes.push(
        "Baseline rank discovery is not ready yet because rank coordinates or active keywords are still missing."
      );
    }

    const result: RunProjectOnboardingResult = {
      ok: true,
      projectId,
      jobId: job.jobId,
      mode,
      capturedAt,
      seededKeywordCount,
      activeKeywordCount: activeKeywords.length,
      identity: {
        canonicalSiteUrl: identity.canonicalSiteUrl,
        canonicalDomain: identity.canonicalDomain,
        inferredBrandName: identity.inferredBrandName,
        resolvedBusinessName: identity.resolvedBusinessName,
        businessNameSource: identity.businessNameSource,
        canonicalCategory: identity.canonicalCategory,
        canonicalMetro: identity.canonicalMetro,
        canonicalRadiusMiles: identity.canonicalRadiusMiles,
      },
      steps: {
        projectValidated: true,
        identityEnriched: true,
        rankInputsValidated: identity.readiness.hasRankCoordinates,
        keywordSeeded: seededKeywordCount > 0,
        competitorDiscoveryStarted,
        baselineRankPlanned,
        authorityBaselinePlanned,
      },
      notes,
    };

    await finishProjectJobSuccess({
      jobId: job.jobId,
      resultSummary: result,
    });

    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown onboarding error.";

    await finishProjectJobFailed({
      jobId: job.jobId,
      errorMessage: message,
      resultSummary: { projectId },
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