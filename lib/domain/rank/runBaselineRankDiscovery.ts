import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { discoverRankCandidates } from "@/lib/domain/rank/discoverRankCandidates";
import { storeRankSnapshot } from "@/lib/domain/rank/storeRankSnapshot";
import {
  findTargetCandidate,
  hydrateTargetBusinessProfile,
} from "@/lib/domain/rank/baselineRankDiscoveryProfile";

type RankCandidate = {
  rankPosition: number;
  title: string | null;
  dataId: string | null;
  category: string | null;
  address: string | null;
  rating: number | null;
  reviewsCount: number | null;
  latitude: number | null;
  longitude: number | null;
  rawResult: unknown;
};

type ProjectIdentityRow = {
  target_domain: string | null;
  target_brand_name: string | null;
  maps_location_code: number | null;
};

export type BaselineRankDiscoveryInput = {
  projectId: string;
  activeKeywords: Array<{
    keyword: string;
    metro: string;
    priority: number;
  }>;
  rankLat: number | null;
  rankLng: number | null;
  capturedAt: string;
};

export type BaselineRankDiscoveryResult = {
  executed: boolean;
  candidateCount: number;
  storedCount: number;
  keyword: string | null;
  metro: string | null;
  skippedReason: string | null;
  targetProfileHydrated: boolean;
  targetProfilePlaceId: string | null;
  targetProfileName: string | null;
  targetProfileMatchedBy: "domain" | "coordinate" | null;
};

function normalizeFiniteCoordinate(
  value: number | null | undefined
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function storeBaselineRankSnapshots(params: {
  projectId: string;
  keyword: string;
  metro: string;
  capturedAt: string;
  candidates: RankCandidate[];
}): Promise<void> {
  for (const candidate of params.candidates) {
    await storeRankSnapshot({
      projectId: params.projectId,
      competitorId: null,
      keyword: params.keyword,
      metro: params.metro,
      rankPosition: candidate.rankPosition,
      rawResult: candidate.rawResult,
      capturedAt: params.capturedAt,
    });
  }
}

async function loadProjectIdentityRow(
  projectId: string
): Promise<ProjectIdentityRow | null> {
  const supabase = supabaseAdmin();

  const { data: projectIdentity, error: projectError } = await supabase
    .from("projects")
    .select("target_domain, target_brand_name, maps_location_code")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw new Error(
      `Baseline rank discovery succeeded but project identity lookup failed: ${projectError.message}`
    );
  }

  return (projectIdentity ?? null) as ProjectIdentityRow | null;
}

async function verifyStoredBaselineSnapshots(params: {
  projectId: string;
  keyword: string;
  metro: string;
  capturedAt: string;
}): Promise<number> {
  const supabase = supabaseAdmin();

  const { data: storedRows, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("keyword", params.keyword)
    .eq("metro", params.metro)
    .eq("captured_at", params.capturedAt);

  if (error) {
    throw new Error(
      `Baseline rank discovery succeeded but snapshot verification failed: ${error.message}`
    );
  }

  return (storedRows ?? []).length;
}

async function hasStoredBaselineSnapshotsForDay(params: {
  projectId: string;
  keyword: string;
  metro: string;
  capturedAt: string;
}): Promise<boolean> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("gbp_rank_snapshots")
    .select("id")
    .eq("project_id", params.projectId)
    .eq("keyword", params.keyword)
    .eq("metro", params.metro)
    .eq("captured_at", params.capturedAt)
    .limit(1);

  if (error) {
    throw new Error(
      `Baseline rank discovery precheck failed: ${error.message}`
    );
  }

  return Array.isArray(data) && data.length > 0;
}

export async function runBaselineRankDiscovery(
  params: BaselineRankDiscoveryInput
): Promise<BaselineRankDiscoveryResult> {
  const activeKeyword = params.activeKeywords[0] ?? null;
  const rankLat = normalizeFiniteCoordinate(params.rankLat);
  const rankLng = normalizeFiniteCoordinate(params.rankLng);

  if (!activeKeyword) {
    return {
      executed: false,
      candidateCount: 0,
      storedCount: 0,
      keyword: null,
      metro: null,
      skippedReason: "Project has no active rank keywords yet.",
      targetProfileHydrated: false,
      targetProfilePlaceId: null,
      targetProfileName: null,
      targetProfileMatchedBy: null,
    };
  }

  if (rankLat === null || rankLng === null) {
    return {
      executed: false,
      candidateCount: 0,
      storedCount: 0,
      keyword: activeKeyword.keyword,
      metro: activeKeyword.metro,
      skippedReason:
        "Project is missing rank coordinates, so baseline rank discovery was skipped.",
      targetProfileHydrated: false,
      targetProfilePlaceId: null,
      targetProfileName: null,
      targetProfileMatchedBy: null,
    };
  }

  const alreadyStoredForDay = await hasStoredBaselineSnapshotsForDay({
    projectId: params.projectId,
    keyword: activeKeyword.keyword,
    metro: activeKeyword.metro,
    capturedAt: params.capturedAt,
  });

  if (alreadyStoredForDay) {
    const storedCount = await verifyStoredBaselineSnapshots({
      projectId: params.projectId,
      keyword: activeKeyword.keyword,
      metro: activeKeyword.metro,
      capturedAt: params.capturedAt,
    });

    return {
      executed: true,
      candidateCount: storedCount,
      storedCount,
      keyword: activeKeyword.keyword,
      metro: activeKeyword.metro,
      skippedReason:
        "Baseline rank discovery reused existing same-day snapshots for this project, keyword, metro, and captured date.",
      targetProfileHydrated: false,
      targetProfilePlaceId: null,
      targetProfileName: null,
      targetProfileMatchedBy: null,
    };
  }

  const rankDiscovery = await discoverRankCandidates({
    keyword: activeKeyword.keyword,
    metro: activeKeyword.metro,
    latitude: rankLat,
    longitude: rankLng,
  });

  await storeBaselineRankSnapshots({
    projectId: params.projectId,
    keyword: activeKeyword.keyword,
    metro: activeKeyword.metro,
    capturedAt: params.capturedAt,
    candidates: rankDiscovery.candidates,
  });

  const projectRow = await loadProjectIdentityRow(params.projectId);

  const targetMatch = findTargetCandidate({
    candidates: rankDiscovery.candidates,
    targetDomain: projectRow?.target_domain ?? null,
    targetBrandName: projectRow?.target_brand_name ?? null,
    rankLat,
    rankLng,
  });

  let targetProfileHydrated = false;
  let targetProfilePlaceId: string | null = null;
  let targetProfileName: string | null = null;
  let targetProfileMatchedBy: "domain" | "coordinate" | null = null;

  if (targetMatch.candidate) {
    const hydrated = await hydrateTargetBusinessProfile({
      projectId: params.projectId,
      candidate: targetMatch.candidate,
      businessName: projectRow?.target_brand_name ?? null,
      locationCode: projectRow?.maps_location_code ?? null,
      targetDomain: projectRow?.target_domain ?? null,
    });

    targetProfileHydrated = hydrated.hydrated;
    targetProfilePlaceId = hydrated.placeId;
    targetProfileName = hydrated.name;
    targetProfileMatchedBy = targetMatch.matchedBy;
  }

  const storedCount = await verifyStoredBaselineSnapshots({
    projectId: params.projectId,
    keyword: activeKeyword.keyword,
    metro: activeKeyword.metro,
    capturedAt: params.capturedAt,
  });

  return {
    executed: true,
    candidateCount: rankDiscovery.candidates.length,
    storedCount,
    keyword: activeKeyword.keyword,
    metro: activeKeyword.metro,
    skippedReason: null,
    targetProfileHydrated,
    targetProfilePlaceId,
    targetProfileName,
    targetProfileMatchedBy,
  };
}