export type ProjectIdentityInput = {
  siteUrl: string | null;
  category: string | null;
  metro: string | null;
  radiusMiles: number | null;
  primaryCategory: string | null;
  targetMetro: string | null;
  targetRadiusMiles: number | null;
  targetDomain: string | null;
  targetBrandName: string | null;
  rankLat: number | null;
  rankLng: number | null;
  mapsLocationCode: number | null;
};

export type ProjectIdentityEnrichment = {
  canonicalSiteUrl: string | null;
  canonicalDomain: string | null;
  inferredBrandName: string | null;
  resolvedBusinessName: string | null;
  businessNameSource: "stored_target_brand_name" | "domain_inference" | "missing";
  canonicalCategory: string | null;
  canonicalMetro: string | null;
  canonicalRadiusMiles: number | null;
  readiness: {
    hasResolvedBusinessName: boolean;
    hasCanonicalCategory: boolean;
    hasCanonicalMetro: boolean;
    hasRankCoordinates: boolean;
    hasMapsLocationCode: boolean;
    hasTargetDomain: boolean;
    hasTargetBrandName: boolean;
    rankBaselineReady: boolean;
    competitorDiscoveryReady: boolean;
  };
  notes: string[];
};

const COMPACT_BUSINESS_SUFFIXES: Array<{
  compact: string;
  label: string;
}> = [
  { compact: "lawnandlandscape", label: "Lawn & Landscape" },
  { compact: "lawnandlandscaping", label: "Lawn & Landscaping" },
  { compact: "lawncareandlandscape", label: "Lawn Care & Landscape" },
  { compact: "lawncareandlandscaping", label: "Lawn Care & Landscaping" },
  { compact: "landscapedesignbuild", label: "Landscape Design Build" },
  { compact: "landscapedesign", label: "Landscape Design" },
  { compact: "landscapeconstruction", label: "Landscape Construction" },
  { compact: "landscapingcompany", label: "Landscaping Company" },
  { compact: "landscapingservice", label: "Landscaping Service" },
  { compact: "landscapingservices", label: "Landscaping Services" },
  { compact: "landscapecompany", label: "Landscape Company" },
  { compact: "landscapesupply", label: "Landscape Supply" },
  { compact: "lawnmaintenance", label: "Lawn Maintenance" },
  { compact: "lawnservice", label: "Lawn Service" },
  { compact: "lawnservices", label: "Lawn Services" },
  { compact: "lawncare", label: "Lawn Care" },
  { compact: "landscaping", label: "Landscaping" },
  { compact: "landscape", label: "Landscape" },
  { compact: "treeandlandscape", label: "Tree & Landscape" },
  { compact: "treeservice", label: "Tree Service" },
  { compact: "treecare", label: "Tree Care" },
  { compact: "outdoorliving", label: "Outdoor Living" },
  { compact: "hardscapes", label: "Hardscapes" },
  { compact: "hardscape", label: "Hardscape" },
  { compact: "irrigation", label: "Irrigation" },
  { compact: "contracting", label: "Contracting" },
  { compact: "contractors", label: "Contractors" },
  { compact: "contractor", label: "Contractor" },
];

function normalizeTrimmedString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(input: string | null): string | null {
  const trimmed = normalizeTrimmedString(input);

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    url.search = "";

    if (url.pathname === "/") {
      url.pathname = "";
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function extractDomain(siteUrl: string | null): string | null {
  if (!siteUrl) {
    return null;
  }

  try {
    return new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function titleCaseToken(token: string): string {
  if (!token) {
    return "";
  }

  if (/^[A-Z0-9]+$/.test(token)) {
    return token;
  }

  if (/^[a-z]{2,4}$/.test(token)) {
    return token.toUpperCase();
  }

  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function normalizeRadius(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function normalizeBusinessNameValue(value: string | null): string | null {
  const trimmed = normalizeTrimmedString(value);

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, " ").trim();
}

function cleanPrimaryDomainSegment(domain: string | null): string | null {
  if (!domain) {
    return null;
  }

  const firstSegment = domain.split(".")[0]?.trim().toLowerCase() ?? "";

  if (!firstSegment) {
    return null;
  }

  const cleaned = firstSegment
    .replace(/\b(shop|store|site|online|app|co|inc|llc)\b/g, "")
    .replace(/[^a-z0-9-_]/g, "")
    .trim();

  return cleaned || null;
}

function formatTokenSequence(input: string): string | null {
  const tokens = input
    .split(/[-_ ]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.map(titleCaseToken).join(" ");
}

function inferBrandNameFromCompactSegment(segment: string): string | null {
  for (const suffix of COMPACT_BUSINESS_SUFFIXES) {
    if (!segment.endsWith(suffix.compact)) {
      continue;
    }

    const prefix = segment.slice(0, segment.length - suffix.compact.length);
    const formattedPrefix = prefix
      ? formatTokenSequence(prefix) ?? titleCaseToken(prefix)
      : null;

    return formattedPrefix
      ? `${formattedPrefix} ${suffix.label}`.trim()
      : suffix.label;
  }

  return null;
}

function inferBrandNameFromDomain(domain: string | null): string | null {
  const firstSegment = cleanPrimaryDomainSegment(domain);

  if (!firstSegment) {
    return null;
  }

  if (firstSegment.includes("-") || firstSegment.includes("_")) {
    return formatTokenSequence(firstSegment);
  }

  const compactInference = inferBrandNameFromCompactSegment(firstSegment);

  if (compactInference) {
    return compactInference;
  }

  return titleCaseToken(firstSegment);
}

export function enrichProjectIdentity(
  input: ProjectIdentityInput
): ProjectIdentityEnrichment {
  const canonicalSiteUrl = normalizeUrl(input.siteUrl);
  const canonicalDomain =
    normalizeTrimmedString(input.targetDomain)?.toLowerCase() ??
    extractDomain(canonicalSiteUrl);

  const storedTargetBrandName = normalizeBusinessNameValue(input.targetBrandName);
  const inferredBrandName = normalizeBusinessNameValue(
    inferBrandNameFromDomain(canonicalDomain)
  );

  const resolvedBusinessName = storedTargetBrandName ?? inferredBrandName;
  const businessNameSource:
    | "stored_target_brand_name"
    | "domain_inference"
    | "missing" = storedTargetBrandName
    ? "stored_target_brand_name"
    : inferredBrandName
      ? "domain_inference"
      : "missing";

  const canonicalCategory =
    normalizeTrimmedString(input.primaryCategory) ??
    normalizeTrimmedString(input.category);

  const canonicalMetro =
    normalizeTrimmedString(input.targetMetro) ??
    normalizeTrimmedString(input.metro);

  const canonicalRadiusMiles =
    normalizeRadius(input.targetRadiusMiles) ??
    normalizeRadius(input.radiusMiles);

  const hasRankCoordinates =
    typeof input.rankLat === "number" &&
    Number.isFinite(input.rankLat) &&
    typeof input.rankLng === "number" &&
    Number.isFinite(input.rankLng);

  const hasMapsLocationCode =
    typeof input.mapsLocationCode === "number" &&
    Number.isFinite(input.mapsLocationCode);

  const hasResolvedBusinessName = Boolean(resolvedBusinessName);
  const hasCanonicalCategory = Boolean(canonicalCategory);
  const hasCanonicalMetro = Boolean(canonicalMetro);
  const hasTargetDomain = Boolean(canonicalDomain);
  const hasTargetBrandName = Boolean(storedTargetBrandName);

  const notes: string[] = [];

  if (canonicalSiteUrl) {
    notes.push(`Resolved canonical site URL: ${canonicalSiteUrl}`);
  } else {
    notes.push(
      "Project is missing a valid canonical site URL, so deeper business identity inference remains limited."
    );
  }

  if (canonicalDomain) {
    notes.push(`Resolved canonical domain: ${canonicalDomain}`);
  } else {
    notes.push("Project does not yet have a resolved target domain.");
  }

  if (businessNameSource === "stored_target_brand_name" && resolvedBusinessName) {
    notes.push(`Using stored target brand name: ${resolvedBusinessName}`);
  } else if (businessNameSource === "domain_inference" && resolvedBusinessName) {
    notes.push(
      `Inferred cleaner provisional business name from domain: ${resolvedBusinessName}`
    );
  } else {
    notes.push(
      "Business name could not be resolved yet, so identity quality remains partial."
    );
  }

  if (hasCanonicalCategory) {
    notes.push(`Resolved canonical category: ${canonicalCategory}`);
  } else {
    notes.push(
      "Project is missing a canonical category, so competitor discovery cannot start safely."
    );
  }

  if (hasCanonicalMetro) {
    notes.push(`Resolved canonical metro: ${canonicalMetro}`);
  } else {
    notes.push(
      "Project is missing a canonical metro, so location-based automation remains blocked."
    );
  }

  if (canonicalRadiusMiles !== null) {
    notes.push(`Resolved canonical radius miles: ${canonicalRadiusMiles}`);
  }

  if (hasRankCoordinates) {
    notes.push("Project already has rank coordinates for baseline rank discovery.");
  } else {
    notes.push(
      "Project is missing rank_lat or rank_lng, so baseline rank discovery is not ready yet."
    );
  }

  if (hasMapsLocationCode) {
    notes.push("Project already has a stored maps_location_code for provider lookups.");
  } else {
    notes.push(
      "Project does not have a stored maps_location_code yet. Competitor discovery may still resolve it from target metro."
    );
  }

  return {
    canonicalSiteUrl,
    canonicalDomain,
    inferredBrandName,
    resolvedBusinessName,
    businessNameSource,
    canonicalCategory,
    canonicalMetro,
    canonicalRadiusMiles,
    readiness: {
      hasResolvedBusinessName,
      hasCanonicalCategory,
      hasCanonicalMetro,
      hasRankCoordinates,
      hasMapsLocationCode,
      hasTargetDomain,
      hasTargetBrandName,
      rankBaselineReady:
        hasCanonicalCategory && hasCanonicalMetro && hasRankCoordinates,
      competitorDiscoveryReady: hasCanonicalCategory && hasCanonicalMetro,
    },
    notes,
  };
}