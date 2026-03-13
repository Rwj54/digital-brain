export function formatDomain(input: string) {
  const raw = (input || "").trim();
  if (!raw) return "—";

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).hostname.replace(/^www\./, "");
    }
  } catch {
    // ignore malformed URLs
  }

  return raw.replace(/^www\./, "").replace(/\/+$/, "");
}