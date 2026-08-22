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

/**
 * Normalizuje surové `application_due` (volný text z NAV feedu) na ISO timestamp,
 * nebo null pokud lhůta není známá / je to text jako "Snarest"/"ASAP".
 * Podporuje: ISO (YYYY-MM-DD[THH:MM:SS]) a DD.MM.YYYY / DD-MM-YYYY / DD/MM/YYYY.
 * `new Date()` misparsuje DD.MM.YYYY jako MM.DD — proto to parsujeme explicitně.
 */
export function parseApplicationDue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO formát — new Date() ho parsuje spolehlivě
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // DD.MM.YYYY (den, měsíc, rok explicitně — přesně 4 číslice roku)
  const dm = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = parseInt(dm[2], 10);
    const year = parseInt(dm[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // "Snarest", "ASAP", překlepy (např. rok "20226") → bez pevné lhůty
  return null;
}
