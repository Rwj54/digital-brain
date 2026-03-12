import { supabaseServer } from "../supabase/server";

type CompetitorMetricRow = {
  id: string;
  project_id: string;
  competitor_domain: string;
  place_id: string | null;
  name: string | null;
  competitor_name: string | null;
  domain: string | null;
  total_reviews: number | null;
  last_seen_at: string;
};

function normalizeDomain(input: string | null | undefined): string {
  if (!input) return "";

  let value = input.trim().toLowerCase();

  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");
  value = value.replace(/\/.*$/, "");

  return value;
}

function normalizeName(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chooseKeeper(a: CompetitorMetricRow, b: CompetitorMetricRow): CompetitorMetricRow {
  const aPlace = Boolean(a.place_id);
  const bPlace = Boolean(b.place_id);

  if (aPlace && !bPlace) return a;
  if (bPlace && !aPlace) return b;

  const aReviews = typeof a.total_reviews === "number" ? a.total_reviews : -1;
  const bReviews = typeof b.total_reviews === "number" ? b.total_reviews : -1;

  if (aReviews !== bReviews) {
    return aReviews > bReviews ? a : b;
  }

  const aSeen = new Date(a.last_seen_at).getTime();
  const bSeen = new Date(b.last_seen_at).getTime();

  if (aSeen !== bSeen) {
    return aSeen > bSeen ? a : b;
  }

  const aHasName = Boolean(a.name || a.competitor_name);
  const bHasName = Boolean(b.name || b.competitor_name);

  if (aHasName && !bHasName) return a;
  if (bHasName && !aHasName) return b;

  return a;
}

export async function cleanupLegacyCompetitorDuplicates(input: {
  projectId: string;
}) {
  const projectId =
    typeof input.projectId === "string" ? input.projectId.trim() : "";

  if (!projectId) {
    throw new Error("Missing projectId.");
  }

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("gbp_competitor_metrics")
    .select(
      "id, project_id, competitor_domain, place_id, name, competitor_name, domain, total_reviews, last_seen_at"
    )
    .eq("project_id", projectId)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load gbp_competitor_metrics rows: ${error.message}`
    );
  }

  const rows = (data ?? []) as CompetitorMetricRow[];
  const rowsByDomain = new Map<string, CompetitorMetricRow[]>();

  for (const row of rows) {
    const normalizedDomain = normalizeDomain(row.domain);

    if (!normalizedDomain) {
      continue;
    }

    const existing = rowsByDomain.get(normalizedDomain);

    if (existing) {
      existing.push(row);
    } else {
      rowsByDomain.set(normalizedDomain, [row]);
    }
  }

  const idsToDelete = new Set<string>();
  const decisions: Array<{
    domain: string;
    keptId: string;
    deletedIds: string[];
  }> = [];

  for (const [domain, domainRows] of rowsByDomain.entries()) {
    if (domainRows.length < 2) {
      continue;
    }

    const namedRows = domainRows.filter((row) => {
      const displayName = row.name ?? row.competitor_name ?? "";
      return normalizeName(displayName).length > 0;
    });

    const eligibleRows = namedRows.length > 0 ? namedRows : domainRows;

    let keeper = eligibleRows[0];

    for (const row of eligibleRows.slice(1)) {
      keeper = chooseKeeper(keeper, row);
    }

    const deleteRows = domainRows.filter((row) => row.id !== keeper.id);

    if (deleteRows.length === 0) {
      continue;
    }

    for (const row of deleteRows) {
      idsToDelete.add(row.id);
    }

    decisions.push({
      domain,
      keptId: keeper.id,
      deletedIds: deleteRows.map((row) => row.id),
    });
  }

  const deleteIdList = Array.from(idsToDelete);

  if (deleteIdList.length === 0) {
    return {
      ok: true,
      projectId,
      totalRows: rows.length,
      deletedCount: 0,
      decisions,
    };
  }

  const { error: deleteError } = await supabase
    .from("gbp_competitor_metrics")
    .delete()
    .in("id", deleteIdList);

  if (deleteError) {
    throw new Error(
      `Failed to delete legacy competitor duplicates: ${deleteError.message}`
    );
  }

  return {
    ok: true,
    projectId,
    totalRows: rows.length,
    deletedCount: deleteIdList.length,
    decisions,
  };
}