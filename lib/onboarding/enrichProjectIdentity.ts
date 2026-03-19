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

  const storedPrimaryCategory = normalizeTrimmedString(input.primaryCategory);
  const rawCategory = normalizeCategoryInput(input.category);
  const inferredCategory = inferCanonicalCategoryFromRawCategory(rawCategory);
  const canonicalCategory = storedPrimaryCategory ?? inferredCategory.canonicalCategory;

  const canonicalMetro = normalizeMetroValue(
    normalizeTrimmedString(input.targetMetro) ??
      normalizeTrimmedString(input.metro)
  );

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
    Number.isFinite(input.mapsLocationCode) &&
    input.mapsLocationCode > 0;

  const hasCanonicalCategory = Boolean(canonicalCategory);
  const hasCanonicalMetro = Boolean(canonicalMetro);
  const hasResolvedBusinessName = Boolean(resolvedBusinessName);
  const hasTargetDomain = Boolean(canonicalDomain);
  const hasTargetBrandName = Boolean(storedTargetBrandName);

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
    if (storedPrimaryCategory) {
      notes.push(`Canonical category resolved from stored primary_category: ${canonicalCategory}`);
    } else if (rawCategory) {
      notes.push(
        `Canonical category inferred from raw category text: ${canonicalCategory} (${inferredCategory.source}).`
      );
    } else {
      notes.push(`Canonical category resolved: ${canonicalCategory}`);
    }
  } else {
    notes.push("Canonical category is still missing.");
  }

  if (canonicalMetro) {
    notes.push(`Canonical metro resolved: ${canonicalMetro}`);
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
