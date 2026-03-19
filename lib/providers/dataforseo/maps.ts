type DataForSeoMapsItem = {
  type?: string;
  title?: string;
  domain?: string | null;
  url?: string | null;
  place_id?: string;
  cid?: string | null;
  data_id?: string | null;
  category?: string | null;
  phone?: string | null;
  description?: string | null;
  additional_categories?:
    | Array<
        | string
        | {
            title?: string | null;
          }
      >
    | null;
  category_ids?: string[] | null;
  work_hours?: unknown;
  rating?:
    | {
        value?: number;
        votes_count?: number;
      }
    | null;
};

type DataForSeoTaskResult = {
  items?: DataForSeoMapsItem[];
  check_url?: string;
  datetime?: string;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    cost?: number;
    result?: DataForSeoTaskResult[];
  }>;
};

type DataForSeoLocationsResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{
      location_code: number;
      location_name: string;
      country_iso_code: string;
      location_type: string;
    }>;
  }>;
};

export type DataForSeoBusinessInfoItem = {
  type?: string;
  title?: string;
  domain?: string | null;
  url?: string | null;
  place_id?: string | null;
  cid?: string | null;
  data_id?: string | null;
  category?: string | null;
  phone?: string | null;
  description?: string | null;
  additional_categories?:
    | Array<
        | string
        | {
            title?: string | null;
          }
      >
    | null;
  category_ids?: string[] | null;
  work_hours?: unknown;
  latitude?: number | null;
  longitude?: number | null;
  rating?:
    | {
        value?: number | null;
        votes_count?: number | null;
      }
    | number
    | null;
};

type DataForSeoBusinessInfoResult = {
  items?: DataForSeoBusinessInfoItem[];
  check_url?: string;
  datetime?: string;
};

type DataForSeoBusinessInfoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    cost?: number;
    result?: DataForSeoBusinessInfoResult[];
  }>;
};

export type DataForSeoMapsSearchParams = {
  keyword: string;
  locationName: string;
  locationCode?: number;
  depth?: number;
  device?: "desktop" | "mobile";
};

export type DataForSeoMapsLiveAdvancedResult = {
  cost: number;
  checkUrl: string | null;
  datetimeUtc: string | null;
  items: DataForSeoMapsItem[];
  raw: DataForSeoResponse;
  locationCode: number;
};

export type DataForSeoResolvedBusinessCoordinates = {
  latitude: number;
  longitude: number;
  matchedBy: "domain" | "title" | "first_item";
  matchedTitle: string | null;
  matchedDomain: string | null;
  locationCode: number;
};

export type DataForSeoResolvedBusinessProfile = {
  item: DataForSeoBusinessInfoItem;
  matchedBy: "place_id" | "domain" | "title" | "first_item";
  matchedTitle: string | null;
  matchedDomain: string | null;
  locationCode: number;
};

function basicAuthHeader(login: string, password: string): string {
  const token = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${token}`;
}

const US_STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
};

const locationCodeCache = new Map<string, number>();

function normalizeMetroKey(input: string): string {
  return input.trim().toLowerCase();
}

function normalizeDomain(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const firstPathSegment = withoutProtocol.split("/")[0] ?? "";
  return firstPathSegment.replace(/^www\./, "");
}

function normalizeBusinessTitle(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlaceId(input: string | null | undefined): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim();
}

function hasFiniteCoordinates(
  item: DataForSeoBusinessInfoItem
): item is DataForSeoBusinessInfoItem & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof item.latitude === "number" &&
    Number.isFinite(item.latitude) &&
    typeof item.longitude === "number" &&
    Number.isFinite(item.longitude)
  );
}

function parseCityState(input: string): { city: string; stateAbbr: string } | null {
  const value = input.trim();
  const match = value.match(/^(.+),\s*([A-Za-z]{2})$/);

  if (!match) {
    return null;
  }

  const city = match[1].trim();
  const stateAbbr = match[2].toUpperCase();

  if (!city || !US_STATE_ABBR_TO_NAME[stateAbbr]) {
    return null;
  }

  return { city, stateAbbr };
}

function getBusinessInfoEndpoint(): string {
  return "https://api.dataforseo.com/v3/business_data/google/my_business_info/live";
}

async function fetchBusinessInfoItems(args: {
  businessName: string;
  locationCode: number;
}): Promise<DataForSeoBusinessInfoItem[]> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login) {
    throw new Error("Missing DATAFORSEO_LOGIN");
  }

  if (!password) {
    throw new Error("Missing DATAFORSEO_PASSWORD");
  }

  const businessName = args.businessName.trim();

  if (!businessName) {
    throw new Error("Missing businessName for business info lookup.");
  }

  if (
    typeof args.locationCode !== "number" ||
    !Number.isFinite(args.locationCode) ||
    args.locationCode <= 0
  ) {
    throw new Error("Missing valid locationCode for business info lookup.");
  }

  const response = await fetch(getBusinessInfoEndpoint(), {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(login, password),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        language_code: "en",
        location_code: args.locationCode,
        keyword: businessName,
      },
    ]),
  });

  const json = (await response.json()) as DataForSeoBusinessInfoResponse;

  if (!response.ok) {
    throw new Error(
      `DataForSEO business info HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  const task = json.tasks?.[0];

  if (!task) {
    throw new Error("DataForSEO business info: missing tasks[0].");
  }

  if ((task.status_code ?? 0) >= 40000) {
    throw new Error(
      `DataForSEO business info task error: ${task.status_code} ${task.status_message}`
    );
  }

  const result = task.result?.[0];
  return (result?.items ?? []).filter(
    (item): item is DataForSeoBusinessInfoItem => item.type === "google_business_info"
  );
}

export async function resolveDataForSeoUsLocationCode(args: {
  metroCityState: string;
}): Promise<number> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login) {
    throw new Error("Missing DATAFORSEO_LOGIN");
  }

  if (!password) {
    throw new Error("Missing DATAFORSEO_PASSWORD");
  }

  const cacheKey = normalizeMetroKey(args.metroCityState);
  const cached = locationCodeCache.get(cacheKey);

  if (typeof cached === "number") {
    return cached;
  }

  const parsed = parseCityState(args.metroCityState);

  if (!parsed) {
    throw new Error(
      `target_metro must be in "City, ST" format. Got: ${JSON.stringify(
        args.metroCityState
      )}`
    );
  }

  const stateName = US_STATE_ABBR_TO_NAME[parsed.stateAbbr];
  const city = parsed.city;

  const locationsEndpoint = "https://api.dataforseo.com/v3/serp/google/locations/us";

  const response = await fetch(locationsEndpoint, {
    method: "GET",
    headers: {
      Authorization: basicAuthHeader(login, password),
      "Content-Type": "application/json",
    },
  });

  const json = (await response.json()) as DataForSeoLocationsResponse;

  if (!response.ok) {
    throw new Error(
      `DataForSEO locations HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  const task = json.tasks?.[0];

  if (!task) {
    throw new Error("DataForSEO locations: missing tasks[0].");
  }

  if ((task.status_code ?? 0) >= 40000) {
    throw new Error(
      `DataForSEO locations task error: ${task.status_code} ${task.status_message}`
    );
  }

  const results = task.result ?? [];
  const wanted1 = `${city},${stateName},United States`;
  const wanted2 = `${city},${stateName},USA`;

  const match =
    results.find((row) => row.location_name === wanted1) ||
    results.find((row) => row.location_name === wanted2) ||
    results.find(
      (row) =>
        row.location_name.startsWith(`${city},`) &&
        row.location_name.includes(`,${stateName},`) &&
        (row.location_name.endsWith(",United States") ||
          row.location_name.endsWith(",USA"))
    );

  if (!match) {
    throw new Error(
      `Could not resolve DataForSEO location_code for ${JSON.stringify(
        args.metroCityState
      )}.`
    );
  }

  locationCodeCache.set(cacheKey, match.location_code);
  return match.location_code;
}

export async function resolveBusinessProfileFromDataForSeo(args: {
  businessName: string;
  locationCode: number;
  targetPlaceId?: string | null;
  targetDomain?: string | null;
}): Promise<DataForSeoResolvedBusinessProfile> {
  const items = await fetchBusinessInfoItems({
    businessName: args.businessName,
    locationCode: args.locationCode,
  });

  if (items.length === 0) {
    throw new Error("DataForSEO business info returned no business items.");
  }

  const normalizedTargetPlaceId = normalizePlaceId(args.targetPlaceId);
  const normalizedTargetDomain = normalizeDomain(args.targetDomain);
  const normalizedBusinessName = normalizeBusinessTitle(args.businessName);

  if (normalizedTargetPlaceId) {
    const placeMatch =
      items.find(
        (item) =>
          normalizePlaceId(item.place_id) === normalizedTargetPlaceId ||
          normalizePlaceId(item.cid) === normalizedTargetPlaceId ||
          normalizePlaceId(item.data_id) === normalizedTargetPlaceId
      ) ?? null;

    if (placeMatch) {
      return {
        item: placeMatch,
        matchedBy: "place_id",
        matchedTitle: placeMatch.title ?? null,
        matchedDomain: normalizeDomain(placeMatch.domain || placeMatch.url) || null,
        locationCode: args.locationCode,
      };
    }
  }

  if (normalizedTargetDomain) {
    const domainMatch =
      items.find(
        (item) =>
          normalizeDomain(item.domain) === normalizedTargetDomain ||
          normalizeDomain(item.url) === normalizedTargetDomain
      ) ?? null;

    if (domainMatch) {
      return {
        item: domainMatch,
        matchedBy: "domain",
        matchedTitle: domainMatch.title ?? null,
        matchedDomain: normalizeDomain(domainMatch.domain || domainMatch.url) || null,
        locationCode: args.locationCode,
      };
    }
  }

  const titleMatch =
    items.find(
      (item) => normalizeBusinessTitle(item.title) === normalizedBusinessName
    ) ?? null;

  if (titleMatch) {
    return {
      item: titleMatch,
      matchedBy: "title",
      matchedTitle: titleMatch.title ?? null,
      matchedDomain: normalizeDomain(titleMatch.domain || titleMatch.url) || null,
      locationCode: args.locationCode,
    };
  }

  const firstItem = items[0];

  return {
    item: firstItem,
    matchedBy: "first_item",
    matchedTitle: firstItem.title ?? null,
    matchedDomain: normalizeDomain(firstItem.domain || firstItem.url) || null,
    locationCode: args.locationCode,
  };
}

export async function resolveBusinessCoordinatesFromDataForSeo(args: {
  businessName: string;
  locationCode: number;
  targetPlaceId?: string | null;
  targetDomain?: string | null;
}): Promise<DataForSeoResolvedBusinessCoordinates> {
  const resolved = await resolveBusinessProfileFromDataForSeo({
    businessName: args.businessName,
    locationCode: args.locationCode,
    targetPlaceId: args.targetPlaceId ?? null,
    targetDomain: args.targetDomain ?? null,
  });

  if (!hasFiniteCoordinates(resolved.item)) {
    throw new Error("DataForSEO business info returned no coordinate-bearing items.");
  }

  return {
    latitude: resolved.item.latitude,
    longitude: resolved.item.longitude,
    matchedBy:
      resolved.matchedBy === "place_id"
        ? "domain"
        : resolved.matchedBy === "first_item"
          ? "first_item"
          : resolved.matchedBy,
    matchedTitle: resolved.matchedTitle,
    matchedDomain: resolved.matchedDomain,
    locationCode: resolved.locationCode,
  };
}

export async function dataForSeoMapsLiveAdvanced(
  params: DataForSeoMapsSearchParams
): Promise<DataForSeoMapsLiveAdvancedResult> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login) {
    throw new Error("Missing DATAFORSEO_LOGIN");
  }

  if (!password) {
    throw new Error("Missing DATAFORSEO_PASSWORD");
  }

  const locationCode =
    typeof params.locationCode === "number" && Number.isFinite(params.locationCode)
      ? params.locationCode
      : await resolveDataForSeoUsLocationCode({
          metroCityState: params.locationName,
        });

  const endpoint = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

  const body = [
    {
      keyword: params.keyword,
      location_code: locationCode,
      language_code: "en",
      device: params.device ?? "desktop",
      depth: params.depth ?? 20,
      search_this_area: true,
      search_places: false,
    },
  ];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(login, password),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as DataForSeoResponse;

  if (!response.ok) {
    throw new Error(
      `DataForSEO HTTP ${response.status}: ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  const task = json.tasks?.[0];

  if (!task) {
    throw new Error(
      `DataForSEO: missing tasks[0]. ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  if ((task.status_code ?? 0) >= 40000) {
    throw new Error(
      `DataForSEO task error: ${task.status_code} ${task.status_message}`
    );
  }

  const result = task.result?.[0];
  const items = (result?.items ?? []).filter((item) => item.type === "maps_search");

  return {
    cost: task.cost ?? 0,
    checkUrl: result?.check_url ?? null,
    datetimeUtc: result?.datetime ?? null,
    items,
    raw: json,
    locationCode,
  };
}
