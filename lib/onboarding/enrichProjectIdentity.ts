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
  confirmedCategory?: string | null;
  confirmedMetro?: string | null;
  websiteInferredCategory?: string | null;
  websiteInferredMetro?: string | null;
  gbpPrimaryCategory?: string | null;
  gbpPlaceId?: string | null;
};

export type ProjectIdentityConfidence = "high" | "medium" | "low" | "missing";

export type ProjectIdentityCategorySource =
  | "gbp_primary_category"
  | "stored_primary_category"
  | "confirmed_category"
  | "stored_category"
  | "website_inference"
  | "missing";

export type ProjectIdentityMetroSource =
  | "stored_target_metro"
  | "confirmed_metro"
  | "stored_metro"
  | "website_inference"
  | "missing";

export type ProjectIdentityEnrichment = {
  canonicalSiteUrl: string | null;
  canonicalDomain: string | null;
  inferredBrandName: string | null;
  resolvedBusinessName: string | null;
  businessNameSource: "stored_target_brand_name" | "domain_inference" | "missing";
  googlePrimaryCategory: string | null;
  googlePlaceId: string | null;
  canonicalCategory: string | null;
  canonicalMetro: string | null;
  canonicalRadiusMiles: number | null;
  categorySource: ProjectIdentityCategorySource;
  categoryConfidence: ProjectIdentityConfidence;
  metroSource: ProjectIdentityMetroSource;
  metroConfidence: ProjectIdentityConfidence;
  resolutionExplanation: string[];
  readiness: {
    hasResolvedBusinessName: boolean;
    hasCanonicalCategory: boolean;
    hasCanonicalMetro: boolean;
    hasRankCoordinates: boolean;
    hasMapsLocationCode: boolean;
    hasTargetDomain: boolean;
    hasTargetBrandName: boolean;
    hasGooglePrimaryCategoryEvidence: boolean;
    automationPersistenceReady: boolean;
    keywordActivationReady: boolean;
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

const CATEGORY_PRIORITY_RULES: Array<{
  label: string;
  patterns: RegExp[];
}> = [
  {
    label: "Landscaper",
    patterns: [
      /\blandscap(?:e|er|ing)\b/i,
      /\blawn\s*&?\s*landscap(?:e|ing)\b/i,
      /\blawn\s*care\b/i,
      /\blandscape\s*design\b/i,
      /\blandscape\s*construction\b/i,
      /\boutdoor\s*living\b/i,
    ],
  },
  {
    label: "Hardscape Contractor",
    patterns: [
      /\bhardscap(?:e|es|ing)?\b/i,
      /\bretaining\s*wall(?:s)?\b/i,
      /\bpatio(?:s)?\b/i,
      /\bpaver(?:s)?\b/i,
      /\bwalkway(?:s)?\b/i,
      /\bdriveway(?:s)?\b/i,
      /\bsidewalk(?:s)?\b/i,
      /\bstone\s*work\b/i,
      /\bmasonry\b/i,
    ],
  },
  {
    label: "Tree Service",
    patterns: [
      /\btree\s*service\b/i,
      /\btree\s*care\b/i,
      /\barborist\b/i,
      /\bstump\s*grinding\b/i,
      /\bstump\s*removal\b/i,
    ],
  },
  {
    label: "Irrigation Contractor",
    patterns: [/\birrigation\b/i, /\bsprinkler(?:s)?\b/i, /\bdrainage\b/i],
  },
  {
    label: "Concrete Contractor",
    patterns: [
      /\bconcrete\b/i,
      /\bflatwork\b/i,
      /\bconcrete\s*driveway(?:s)?\b/i,
      /\bconcrete\s*patio(?:s)?\b/i,
    ],
  },
];

const US_STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

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

function normalizeCategoryInput(value: string | null): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function splitCategoryCandidates(value: string): string[] {
  return value
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeCategoryCandidateLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w+/g, (token) => titleCaseToken(token));
}

function inferCanonicalCategoryFromRawCategory(
  rawCategory: string | null
): {
  canonicalCategory: string | null;
  source:
    | "stored_primary_category"
    | "rule_inference"
    | "single_category_fallback"
    | "raw_category_fallback"
    | "missing";
} {
  const normalized = normalizeCategoryInput(rawCategory);

  if (!normalized) {
    return {
      canonicalCategory: null,
      source: "missing",
    };
  }

  for (const rule of CATEGORY_PRIORITY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        canonicalCategory: rule.label,
        source: "rule_inference",
      };
    }
  }

  const parts = splitCategoryCandidates(normalized);

  if (parts.length === 1) {
    return {
      canonicalCategory: normalizeCategoryCandidateLabel(parts[0]),
      source: "single_category_fallback",
    };
  }

  if (parts.length > 1) {
    return {
      canonicalCategory: normalizeCategoryCandidateLabel(parts[0]),
      source: "raw_category_fallback",
    };
  }

  return {
    canonicalCategory: normalizeCategoryCandidateLabel(normalized),
    source: "raw_category_fallback",
  };
}

function normalizeCityToken(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => titleCaseToken(token))
    .join(" ");
}

function normalizeMetroValue(value: string | null): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  const compact = normalized.replace(/\s+/g, " ").trim();
  const parts = compact.split(",").map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return compact;
  }

  const city = normalizeCityToken(parts[0]);
  const stateRaw = parts[1].replace(/\./g, "").trim();

  if (/^[A-Za-z]{2}$/.test(stateRaw)) {
    return `${city}, ${stateRaw.toUpperCase()}`;
  }

  const stateAbbr = US_STATE_NAME_TO_ABBR[stateRaw.toLowerCase()];

  if (stateAbbr) {
    return `${city}, ${stateAbbr}`;
  }

  return `${city}, ${parts[1]}`;
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

  const storedPrimaryCategory = inferCanonicalCategoryFromRawCategory(
    normalizeCategoryInput(input.primaryCategory)
  ).canonicalCategory;
  const storedProjectCategory = inferCanonicalCategoryFromRawCategory(
    normalizeCategoryInput(input.category)
  ).canonicalCategory;
  const confirmedCategory = inferCanonicalCategoryFromRawCategory(
    normalizeCategoryInput(input.confirmedCategory ?? null)
  ).canonicalCategory;
  const websiteInferredCategory = inferCanonicalCategoryFromRawCategory(
    normalizeCategoryInput(input.websiteInferredCategory ?? null)
  ).canonicalCategory;
  const googlePrimaryCategory = inferCanonicalCategoryFromRawCategory(
    normalizeCategoryInput(input.gbpPrimaryCategory ?? null)
  ).canonicalCategory;

  const googlePlaceId = normalizeTrimmedString(input.gbpPlaceId ?? null);

  let canonicalCategory: string | null = null;
  let categorySource: ProjectIdentityCategorySource = "missing";
  let categoryConfidence: ProjectIdentityConfidence = "missing";

  if (googlePrimaryCategory) {
    canonicalCategory = googlePrimaryCategory;
    categorySource = "gbp_primary_category";
    categoryConfidence = "high";
  } else if (storedPrimaryCategory) {
    canonicalCategory = storedPrimaryCategory;
    categorySource = "stored_primary_category";
    categoryConfidence = "medium";
  } else if (confirmedCategory) {
    canonicalCategory = confirmedCategory;
    categorySource = "confirmed_category";
    categoryConfidence = "low";
  } else if (storedProjectCategory) {
    canonicalCategory = storedProjectCategory;
    categorySource = "stored_category";
    categoryConfidence = "low";
  } else if (websiteInferredCategory) {
    canonicalCategory = websiteInferredCategory;
    categorySource = "website_inference";
    categoryConfidence = "low";
  }

  const storedTargetMetro = normalizeMetroValue(
    normalizeTrimmedString(input.targetMetro)
  );
  const storedProjectMetro = normalizeMetroValue(
    normalizeTrimmedString(input.metro)
  );
  const confirmedMetro = normalizeMetroValue(
    normalizeTrimmedString(input.confirmedMetro ?? null)
  );
  const websiteInferredMetro = normalizeMetroValue(
    normalizeTrimmedString(input.websiteInferredMetro ?? null)
  );

  let canonicalMetro: string | null = null;
  let metroSource: ProjectIdentityMetroSource = "missing";
  let metroConfidence: ProjectIdentityConfidence = "missing";

  const hasMapsLocationCode =
    typeof input.mapsLocationCode === "number" &&
    Number.isFinite(input.mapsLocationCode) &&
    input.mapsLocationCode > 0;

  if (storedTargetMetro && hasMapsLocationCode) {
    canonicalMetro = storedTargetMetro;
    metroSource = "stored_target_metro";
    metroConfidence = "high";
  } else if (storedTargetMetro) {
    canonicalMetro = storedTargetMetro;
    metroSource = "stored_target_metro";
    metroConfidence = "medium";
  } else if (confirmedMetro) {
    canonicalMetro = confirmedMetro;
    metroSource = "confirmed_metro";
    metroConfidence = "low";
  } else if (storedProjectMetro) {
    canonicalMetro = storedProjectMetro;
    metroSource = "stored_metro";
    metroConfidence = "low";
  } else if (websiteInferredMetro) {
    canonicalMetro = websiteInferredMetro;
    metroSource = "website_inference";
    metroConfidence = "low";
  }

  const canonicalRadiusMiles =
    normalizeRadius(input.targetRadiusMiles) ??
    normalizeRadius(input.radiusMiles);

  const hasRankCoordinates =
    typeof input.rankLat === "number" &&
    Number.isFinite(input.rankLat) &&
    typeof input.rankLng === "number" &&
    Number.isFinite(input.rankLng);

  const hasCanonicalCategory = Boolean(canonicalCategory);
  const hasCanonicalMetro = Boolean(canonicalMetro);
  const hasResolvedBusinessName = Boolean(resolvedBusinessName);
  const hasTargetDomain = Boolean(canonicalDomain);
  const hasTargetBrandName = Boolean(storedTargetBrandName);
  const hasGooglePrimaryCategoryEvidence = Boolean(googlePrimaryCategory);

  const automationPersistenceReady =
    categoryConfidence === "high" &&
    (metroConfidence === "high" || metroConfidence === "medium");

  const keywordActivationReady =
    categoryConfidence === "high" &&
    (metroConfidence === "high" || metroConfidence === "medium");

  const resolutionExplanation: string[] = [];

  if (googlePrimaryCategory) {
    resolutionExplanation.push(
      `Google GBP category evidence is available: ${googlePrimaryCategory}.`
    );
  } else {
    resolutionExplanation.push(
      "Google GBP category evidence is not available yet."
    );
  }

  if (
    googlePrimaryCategory &&
    confirmedCategory &&
    googlePrimaryCategory !== confirmedCategory
  ) {
    resolutionExplanation.push(
      `Manual category input (${confirmedCategory}) conflicts with Google GBP category (${googlePrimaryCategory}).`
    );
  }

  if (
    googlePrimaryCategory &&
    storedPrimaryCategory &&
    googlePrimaryCategory !== storedPrimaryCategory
  ) {
    resolutionExplanation.push(
      `Stored primary_category (${storedPrimaryCategory}) conflicts with Google GBP category (${googlePrimaryCategory}).`
    );
  }

  if (categorySource === "confirmed_category") {
    resolutionExplanation.push(
      "Manual category clarification is treated as a low-confidence override until Google evidence agrees."
    );
  }

  if (metroSource === "confirmed_metro") {
    resolutionExplanation.push(
      "Manual metro clarification is treated as a low-confidence override until stronger market evidence exists."
    );
  }

  if (!automationPersistenceReady) {
    resolutionExplanation.push(
      "Automatic category and market promotion is blocked because identity confidence is not strong enough yet."
    );
  } else {
    resolutionExplanation.push(
      "Automatic category and market promotion is allowed because identity confidence is strong enough."
    );
  }

  const notes: string[] = [];

  if (canonicalSiteUrl) {
    notes.push(`Canonical site URL resolved: ${canonicalSiteUrl}`);
  } else {
    notes.push("Canonical site URL could not be resolved yet.");
  }

  if (canonicalDomain) {
    notes.push(`Canonical domain resolved: ${canonicalDomain}`);
  } else {
    notes.push("Canonical domain is still missing.");
  }

  if (resolvedBusinessName) {
    notes.push(
      `Resolved business name: ${resolvedBusinessName} (${businessNameSource}).`
    );
  } else {
    notes.push("Resolved business name is still missing.");
  }

  if (canonicalCategory) {
    notes.push(
      `Canonical category resolved: ${canonicalCategory} (${categorySource}, ${categoryConfidence} confidence).`
    );
  } else {
    notes.push("Canonical category is still missing.");
  }

  if (canonicalMetro) {
    notes.push(
      `Canonical metro resolved: ${canonicalMetro} (${metroSource}, ${metroConfidence} confidence).`
    );
  } else {
    notes.push("Canonical metro is still missing.");
  }

  if (canonicalRadiusMiles) {
    notes.push(`Canonical radius resolved: ${canonicalRadiusMiles} miles`);
  } else {
    notes.push("Canonical radius is still missing.");
  }

  if (hasRankCoordinates) {
    notes.push("Rank coordinates already exist on the project.");
  } else {
    notes.push("Rank coordinates are still missing.");
  }

  if (hasMapsLocationCode) {
    notes.push("Maps location code already exists on the project.");
  } else {
    notes.push("Maps location code is still missing.");
  }

  for (const explanation of resolutionExplanation) {
    notes.push(explanation);
  }

  return {
    canonicalSiteUrl,
    canonicalDomain,
    inferredBrandName,
    resolvedBusinessName,
    businessNameSource,
    googlePrimaryCategory,
    googlePlaceId,
    canonicalCategory,
    canonicalMetro,
    canonicalRadiusMiles,
    categorySource,
    categoryConfidence,
    metroSource,
    metroConfidence,
    resolutionExplanation,
    readiness: {
      hasResolvedBusinessName,
      hasCanonicalCategory,
      hasCanonicalMetro,
      hasRankCoordinates,
      hasMapsLocationCode,
      hasTargetDomain,
      hasTargetBrandName,
      hasGooglePrimaryCategoryEvidence,
      automationPersistenceReady,
      keywordActivationReady,
      rankBaselineReady:
        keywordActivationReady && hasRankCoordinates,
      competitorDiscoveryReady:
        categoryConfidence === "high" &&
        hasCanonicalCategory &&
        hasCanonicalMetro,
    },
    notes,
  };
}
