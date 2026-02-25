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

export type DataForSeoMapsSearchParams = {
  keyword: string;        // e.g. "flower shop Omaha, NE"
  locationName: string;   // e.g. "Omaha, NE"
  depth?: number;         // default 20
  device?: "desktop" | "mobile";
};

function basicAuthHeader(login: string, password: string) {
  const token = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${token}`;
}

export async function dataForSeoMapsLiveAdvanced(params: DataForSeoMapsSearchParams) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login) throw new Error("Missing DATAFORSEO_LOGIN");
  if (!password) throw new Error("Missing DATAFORSEO_PASSWORD");

  const endpoint = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

  const body = [
    {
      keyword: params.keyword,
      location_name: params.locationName,
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
    throw new Error(
      `DataForSEO HTTP ${res.status}: ${JSON.stringify(json).slice(0, 600)}`
    );
  }

  const task = json.tasks?.[0];
  if (!task) {
    throw new Error(`DataForSEO: missing tasks[0]. ${JSON.stringify(json).slice(0, 600)}`);
  }

  if ((task.status_code ?? 0) >= 40000) {
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