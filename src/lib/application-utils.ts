const AGGREGATOR_DOMAINS = new Set([
  "finn.no", "jobbnorge.no", "jobbsafari.no",
  "karriere.no", "stepstone.no", "monster.no",
]);

export function getApplicationType(url: string | null): "direct" | "portal" | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace("www.", "");
    return AGGREGATOR_DOMAINS.has(host) ? "portal" : "direct";
  } catch {
    return null;
  }
}
