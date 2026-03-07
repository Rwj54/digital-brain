type DiscoverRankCandidatesInput = {
  keyword: string;
  metro: string;
};

type DataForSeoMapsItem = {
  rank_absolute?: number;
  title?: string;
  data_id?: string;
  category?: string;
  address?: string;
  rating?:
    | {
        value?: number;
        votes_count?: number;
        rating_max?: number;
      }
    | number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
};

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

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function resolveLocationCode(metro: string): number {
  const normalized = metro.trim().toLowerCase();

  if (normalized === "omaha, nebraska") {
    return 2840;
  }

  throw new Error(`Unsupported metro for rank discovery: ${metro}`);
}

function normalizeMapsItems(payload: any): RankCandidate[] {
  const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const normalized: RankCandidate[] = [];

  for (const task of tasks) {
    const results = Array.isArray(task?.result) ? task.result : [];

    for (const result of results) {
      const items = Array.isArray(result?.items) ? result.items : [];

      items.forEach((item: DataForSeoMapsItem, index: number) => {
        const ratingValue =
          typeof item?.rating === "number"
            ? item.rating
            : typeof item?.rating?.value === "number"
              ? item.rating.value
              : null;

        const reviewsCount =
          typeof item?.rating === "object" &&
          item?.rating !== null &&
          typeof item.rating.votes_count === "number"
            ? item.rating.votes_count
            : typeof item?.reviews === "number"
              ? item.reviews
              : null;

        normalized.push({
          rankPosition:
            typeof item?.rank_absolute === "number"
              ? item.rank_absolute
              : index + 1,
          title: item?.title ?? null,
          dataId: item?.data_id ?? null,
          category: item?.category ?? null,
          address: item?.address ?? null,
          rating: ratingValue,
          reviewsCount,
          latitude: typeof item?.latitude === "number" ? item.latitude : null,
          longitude:
            typeof item?.longitude === "number" ? item.longitude : null,
          rawResult: item,
        });
      });
    }
  }

  return normalized.sort((a, b) => a.rankPosition - b.rankPosition);
}

export async function discoverRankCandidates(
  input: DiscoverRankCandidatesInput
) {
  const login = getRequiredEnv("DATAFORSEO_LOGIN");
  const password = getRequiredEnv("DATAFORSEO_PASSWORD");

  const keyword = input.keyword.trim();
  const metro = input.metro.trim();

  if (!keyword) {
    throw new Error("Missing keyword.");
  }

  if (!metro) {
    throw new Error("Missing metro.");
  }

  const locationCode = resolveLocationCode(metro);
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/maps/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword,
          location_code: locationCode,
          language_code: "en",
          device: "desktop",
          os: "windows",
          depth: 20,
        },
      ]),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `DataForSEO request failed with status ${response.status}: ${responseText}`
    );
  }

  const payload = await response.json();
  const candidates = normalizeMapsItems(payload);

  return {
    ok: true,
    keyword,
    metro,
    candidates,
    rawResponse: payload,
  };
}