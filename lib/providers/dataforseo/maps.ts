type DataForSeoMapsItem = {
  type?: string;
  title?: string;
  domain?: string | null;
  place_id?: string;
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

async function resolveUsLocationCode(args: {
  metroCityState: string;
  login: string;
  password: string;
}): Promise<number> {
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

  const locationsEndpoint =
    "https://api.dataforseo.com/v3/serp/google/locations/us";

  const response = await fetch(locationsEndpoint, {
    method: "GET",
    headers: {
      Authorization: basicAuthHeader(args.login, args.password),
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
      : await resolveUsLocationCode({
          metroCityState: params.locationName,
          login,
          password,
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