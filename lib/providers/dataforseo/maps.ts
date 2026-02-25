// DataForSEO Maps Live Advanced provider
// Uses location_code resolved from "City, ST" (US) for reliability.

type DataForSeoMapsItem = {
  type?: string; // "maps_search"
  title?: string;
  domain?: string | null;
  place_id?: string;
  rating?: {
    value?: number;
    votes_count?: number;
  } | null;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    cost?: number;
    result?: Array<{
      items?: DataForSeoMapsItem[];
      check_url?: string;
      datetime?: string;
    }>;
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
      location_type: string; // e.g. "City", "State", "Country"
    }>;
  }>;
};

export type DataForSeoMapsSearchParams = {
  keyword: string;      // e.g. "landscaper Council Bluffs, IA"
  locationName: string; // "City, ST" per your system spec
  depth?: number;       // default 20
  device?: "desktop" | "mobile";
};

function basicAuthHeader(login: string, password: string) {
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

function parseCityState(input: string): { city: string; stateAbbr: string } | null {
  const s = input.trim();
  // Expect "City, ST"
  const m = s.match(/^(.+),\s*([A-Za-z]{2})$/);
  if (!m) return null;
  const city = m[1].trim();
  const stateAbbr = m[2].toUpperCase();
  if (!city || !US_STATE_ABBR_TO_NAME[stateAbbr]) return null;
  return { city, stateAbbr };
}

async function resolveUsLocationCode(args: {
  metroCityState: string; // "Council Bluffs, IA"
  login: string;
  password: string;
}): Promise<number> {
  const cached = locationCodeCache.get(args.metroCityState);
  if (cached) return cached;

  const parsed = parseCityState(args.metroCityState);
  if (!parsed) {
    throw new Error(
      `target_metro must be in "City, ST" format. Got: ${JSON.stringify(args.metroCityState)}`
    );
  }

  const stateName = US_STATE_ABBR_TO_NAME[parsed.stateAbbr];
  const city = parsed.city;

  // Locations endpoint (free):
  // GET https://api.dataforseo.com/v3/serp/google/locations/$country  where $country = "us"
  // :contentReference[oaicite:3]{index=3}
  const locationsEndpoint = "https://api.dataforseo.com/v3/serp/google/locations/us";

  const res = await fetch(locationsEndpoint, {
    method: "GET",
    headers: {
      Authorization: basicAuthHeader(args.login, args.password),
      "Content-Type": "application/json",
    },
  });

  const json = (await res.json()) as DataForSeoLocationsResponse;

  if (!res.ok) {
    throw new Error(
      `DataForSEO locations HTTP ${res.status}: ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  const task = json.tasks?.[0];
  if (!task) throw new Error(`DataForSEO locations: missing tasks[0].`);

  if ((task.status_code ?? 0) >= 40000) {
    throw new Error(`DataForSEO locations task error: ${task.status_code} ${task.status_message}`);
  }

  const results = task.result ?? [];

  // DataForSEO location_name format is typically: "City,State,United States"
  // Example shown in their response docs: "Alaska,United States" for State.
  // :contentReference[oaicite:4]{index=4}
  const wanted1 = `${city},${stateName},United States`;
  const wanted2 = `${city},${stateName},USA`;

  const match =
    results.find((r) => r.location_name === wanted1) ||
    results.find((r) => r.location_name === wanted2) ||
    // fallback: contains city + stateName + United States
    results.find(
      (r) =>
        r.location_name.startsWith(`${city},`) &&
        r.location_name.includes(`,${stateName},`) &&
        (r.location_name.endsWith(",United States") || r.location_name.endsWith(",USA"))
    );

  if (!match) {
    throw new Error(
      `Could not resolve DataForSEO location_code for ${JSON.stringify(
        args.metroCityState
      )}. Try a nearby larger city metro (e.g., "Omaha, NE") or we can add a UI picker.`
    );
  }

  locationCodeCache.set(args.metroCityState, match.location_code);
  return match.location_code;
}

export async function dataForSeoMapsLiveAdvanced(params: DataForSeoMapsSearchParams) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login) throw new Error("Missing DATAFORSEO_LOGIN");
  if (!password) throw new Error("Missing DATAFORSEO_PASSWORD");

  const locationCode = await resolveUsLocationCode({
    metroCityState: params.locationName,
    login,
    password,
  });

  // Maps Live Advanced endpoint:
  // POST https://api.dataforseo.com/v3/serp/google/maps/live/advanced
  // :contentReference[oaicite:5]{index=5}
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

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(login, password),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as DataForSeoResponse;

  if (!res.ok) {
    throw new Error(`DataForSEO HTTP ${res.status}: ${JSON.stringify(json).slice(0, 600)}`);
  }

  const task = json.tasks?.[0];
  if (!task) {
    throw new Error(`DataForSEO: missing tasks[0]. ${JSON.stringify(json).slice(0, 600)}`);
  }

  if ((task.status_code ?? 0) >= 40000) {
    // DataForSEO returns detailed validation codes/messages here
    // :contentReference[oaicite:6]{index=6}
    throw new Error(`DataForSEO task error: ${task.status_code} ${task.status_message}`);
  }

  const result = task.result?.[0];
  const items = (result?.items ?? []).filter((i) => i.type === "maps_search");

  return {
    cost: task.cost ?? 0,
    checkUrl: result?.check_url ?? null,
    datetimeUtc: result?.datetime ?? null,
    items,
    raw: json,
  };
}