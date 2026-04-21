type ExtractWebsiteOnboardingSignalsInput = {
  siteUrl: string | null;
};

export type WebsiteOnboardingSignals = {
  inferredCategory: string | null;
  inferredMetro: string | null;
  inferredRadiusMiles: number | null;
  inferredKeywordCandidates: string[];
  notes: string[];
};

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
    patterns: [/\\birrigation\\b/i, /\\bsprinkler(?:s)?\\b/i, /\\bdrainage\\b/i],
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

const STARTER_KEYWORD_CANDIDATES_BY_CATEGORY: Record<string, string[]> = {
  Landscaper: [
    "landscaper",
    "landscape company",
    "landscape contractor",
    "landscape design",
    "lawn care",
  ],
  "Hardscape Contractor": [
    "hardscape contractor",
    "patio contractor",
    "paver patio",
    "retaining wall contractor",
    "masonry contractor",
  ],
  "Tree Service": [
    "tree service",
    "tree removal",
    "tree trimming",
    "stump grinding",
    "arborist",
  ],
  "Irrigation Contractor": [
    "irrigation contractor",
    "sprinkler repair",
    "sprinkler installation",
    "drainage contractor",
    "irrigation service",
  ],
  "Concrete Contractor": [
    "concrete contractor",
    "concrete driveway",
    "concrete patio",
    "flatwork contractor",
    "concrete company",
  ],
};

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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeWhitespace(stripTags(match[1])) : null;
}

function extractMetaDescription(html: string): string | null {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  );

  if (match) {
    return normalizeWhitespace(decodeHtmlEntities(match[1]));
  }

  const reverseMatch = html.match(
    /<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i,
  );

  return reverseMatch
    ? normalizeWhitespace(decodeHtmlEntities(reverseMatch[1]))
    : null;
}

function extractFirstH1(html: string): string | null {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? normalizeWhitespace(stripTags(match[1])) : null;
}

function extractBodySnippet(html: string): string | null {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const source = bodyMatch?.[1] ?? html;
  const cleaned = normalizeWhitespace(stripTags(source)).slice(0, 6000);
  return cleaned || null;
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null = pattern.exec(html);

  while (match) {
    const block = normalizeTrimmedString(match[1]);
    if (block) {
      blocks.push(block);
    }

    match = pattern.exec(html);
  }

  return blocks;
}

function safeParseJsonLd(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectJsonLdNodes(value: unknown): Array<Record<string, unknown>> {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectJsonLdNodes(item));
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const nodes: Array<Record<string, unknown>> = [record];

  if (Array.isArray(record["@graph"])) {
    nodes.push(...collectJsonLdNodes(record["@graph"]));
  }

  return nodes;
}

function normalizeSchemaTypeValue(value: string): string {
  return value
    .replace(/^https?:\/\/schema\.org\//i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function getSchemaTypeValues(node: Record<string, unknown>): string[] {
  const value = node["@type"];

  if (typeof value === "string") {
    return [normalizeSchemaTypeValue(value)];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeSchemaTypeValue(item));
  }

  return [];
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    const normalized = normalizeTrimmedString(value);
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringValues(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectStringValues(item),
    );
  }

  return [];
}

function inferCategoryFromText(value: string | null): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  for (const rule of CATEGORY_PRIORITY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.label;
    }
  }

  return null;
}

function normalizeKeywordCandidateValue(value: string | null | undefined): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

function buildKeywordCandidatesFromCategory(category: string | null): string[] {
  const normalizedCategory = normalizeTrimmedString(category);

  if (!normalizedCategory) {
    return [];
  }

  const fromCategoryMap = STARTER_KEYWORD_CANDIDATES_BY_CATEGORY[normalizedCategory] ?? [
    normalizedCategory,
  ];

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const candidate of fromCategoryMap) {
    const normalizedCandidate = normalizeKeywordCandidateValue(candidate);

    if (!normalizedCandidate || seen.has(normalizedCandidate)) {
      continue;
    }

    seen.add(normalizedCandidate);
    candidates.push(normalizedCandidate);
  }

  return candidates;
}

function normalizeMetroValue(value: string | null): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  const compact = normalized.replace(/\s+/g, " ").trim();
  const parts = compact
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const city = parts[0]
    .split(/\s+/)
    .map((token) => {
      if (!token) {
        return "";
      }

      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");

  const stateRaw = parts[1].replace(/\./g, "").trim();

  if (/^[A-Za-z]{2}$/.test(stateRaw)) {
    return `${city}, ${stateRaw.toUpperCase()}`;
  }

  const stateAbbr = US_STATE_NAME_TO_ABBR[stateRaw.toLowerCase()];

  if (stateAbbr) {
    return `${city}, ${stateAbbr}`;
  }

  return null;
}

function inferMetroFromAddressLikeValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return normalizeMetroValue(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const inferred = inferMetroFromAddressLikeValue(item);

      if (inferred) {
        return inferred;
      }
    }

    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const locality = normalizeTrimmedString(
    typeof record.addressLocality === "string"
      ? record.addressLocality
      : typeof record.city === "string"
        ? record.city
        : null,
  );
  const region = normalizeTrimmedString(
    typeof record.addressRegion === "string"
      ? record.addressRegion
      : typeof record.state === "string"
        ? record.state
        : null,
  );

  if (locality && region) {
    return normalizeMetroValue(`${locality}, ${region}`);
  }

  const directTextCandidates = [
    record.name,
    record.description,
    record.address,
    record.areaServed,
    record.serviceArea,
  ];

  for (const candidate of directTextCandidates) {
    const inferred = inferMetroFromAddressLikeValue(candidate);
    if (inferred) {
      return inferred;
    }
  }

  return null;
}

function inferMetroFromPageText(value: string | null): string | null {
  const normalized = normalizeTrimmedString(value);

  if (!normalized) {
    return null;
  }

  const pattern =
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s*,\s*([A-Z]{2})\b/g;

  const match = pattern.exec(normalized);

  if (!match) {
    return null;
  }

  return normalizeMetroValue(`${match[1]}, ${match[2]}`);
}

export async function extractWebsiteOnboardingSignals(
  input: ExtractWebsiteOnboardingSignalsInput,
): Promise<WebsiteOnboardingSignals> {
  const normalizedSiteUrl = normalizeUrl(input.siteUrl);

  if (!normalizedSiteUrl) {
    return {
      inferredCategory: null,
      inferredMetro: null,
      inferredRadiusMiles: 25,
      inferredKeywordCandidates: [],
      notes: [
        "Website signal inference was skipped because the site URL was missing or invalid.",
        "Using the default onboarding radius of 25 miles.",
      ],
    };
  }

  const notes: string[] = [`Fetched website signals from ${normalizedSiteUrl}.`];

  try {
    const response = await fetch(normalizedSiteUrl, {
      headers: {
        "user-agent":
          "Digital Brain Onboarding/1.0 (+https://digitalbrain.local)",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        inferredCategory: null,
        inferredMetro: null,
        inferredRadiusMiles: 25,
        inferredKeywordCandidates: [],
        notes: [
          ...notes,
          `Website signal inference could not read the homepage successfully (${response.status}).`,
          "Using the default onboarding radius of 25 miles.",
        ],
      };
    }

    const html = await response.text();

    const title = extractTitle(html);
    const metaDescription = extractMetaDescription(html);
    const h1 = extractFirstH1(html);
    const bodySnippet = extractBodySnippet(html);

    const jsonLdNodes = extractJsonLdBlocks(html)
      .map((block) => safeParseJsonLd(block))
      .flatMap((value) => collectJsonLdNodes(value));

    const schemaTextCorpus = jsonLdNodes
      .flatMap((node) => [
        ...getSchemaTypeValues(node),
        ...collectStringValues(node.name),
        ...collectStringValues(node.description),
        ...collectStringValues(node.serviceType),
        ...collectStringValues(node.knowsAbout),
      ])
      .join(" | ");

    const pageTextCorpus = [title, metaDescription, h1, bodySnippet]
      .filter((value): value is string => Boolean(value))
      .join(" | ");

    const inferredCategory =
      inferCategoryFromText(schemaTextCorpus) ??
      inferCategoryFromText(pageTextCorpus);

    const inferredKeywordCandidates =
      buildKeywordCandidatesFromCategory(inferredCategory);

    let inferredMetro: string | null = null;

    for (const node of jsonLdNodes) {
      inferredMetro =
        inferMetroFromAddressLikeValue(node.address) ??
        inferMetroFromAddressLikeValue(node.areaServed) ??
        inferMetroFromAddressLikeValue(node.serviceArea) ??
        inferMetroFromAddressLikeValue(node.location);

      if (inferredMetro) {
        break;
      }
    }

    if (!inferredMetro) {
      inferredMetro = inferMetroFromPageText(pageTextCorpus);
    }

    if (inferredCategory) {
      notes.push(`Inferred website category: ${inferredCategory}.`);
    } else {
      notes.push(
        "Website signal inference could not determine a confident business category from the homepage.",
      );
    }

    if (inferredKeywordCandidates.length > 0) {
      notes.push(
        `Built ${inferredKeywordCandidates.length} starter keyword candidates from the inferred category.`,
      );
    } else {
      notes.push(
        "Keyword candidate discovery is still blocked because no confident category was inferred.",
      );
    }

    if (inferredMetro) {
      notes.push(`Inferred website metro: ${inferredMetro}.`);
    } else {
      notes.push(
        "Website signal inference could not determine a confident metro from the homepage.",
      );
    }

    notes.push("Using the default onboarding radius of 25 miles.");

    return {
      inferredCategory,
      inferredMetro,
      inferredRadiusMiles: 25,
      inferredKeywordCandidates,
      notes,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown website fetch error.";

    return {
      inferredCategory: null,
      inferredMetro: null,
      inferredRadiusMiles: 25,
      inferredKeywordCandidates: [],
      notes: [
        ...notes,
        `Website signal inference failed while fetching the homepage: ${message}`,
        "Using the default onboarding radius of 25 miles.",
      ],
    };
  }
}