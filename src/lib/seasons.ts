/**
 * Sezóny jako pojmenované rozsahy dat nad existujícím filtrem termínu.
 *
 * Záměrně bez sloupce v databázi: „zimní sezóna" = práce, jejíž období se potká
 * s 1. 11. – 30. 4., což filtr v getJobs() (work_start/work_end) už umí. Jeden
 * zdroj pravdy, žádná migrace, žádné druhé pravidlo, které by se mohlo rozejít.
 */

export type SeasonKey = "zima" | "leto";

export interface Season {
  key: SeasonKey;
  /** Krátký název do tlačítka; rok doplní seasonLabel() */
  label: string;
  icon: string;
  /** Měsíce (1–12), které sezóna pokrývá — pro popisky */
  monthsLabel: string;
  /** Od kterých měsíců v roce má smysl sezónu vůbec nabízet */
  offeredInMonths: number[];
}

export const SEASONS: Season[] = [
  {
    key: "zima",
    label: "Zimní sezóna",
    icon: "❄️",
    monthsLabel: "listopad – duben",
    // Zimní nabídky vycházejí od konce srpna; v květnu až červenci už nemá co nabízet
    offeredInMonths: [8, 9, 10, 11, 12, 1, 2, 3, 4],
  },
  {
    key: "leto",
    label: "Letní sezóna",
    icon: "☀️",
    monthsLabel: "květen – září",
    // Letní nábor běží od ledna (dohodnuto) do srpna; v září už sezóna dobíhá
    // a nabízet ji nemá smysl — zbývalo by z ní pár dní.
    offeredInMonths: [1, 2, 3, 4, 5, 6, 7, 8],
  },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Nejbližší (nebo právě probíhající) okno sezóny.
 * `from` se nikdy nedívá do minulosti — nikdo nehledá práci na loňskou zimu.
 */
export function seasonRange(key: SeasonKey, today: Date): { from: string; to: string; year: number } {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  if (key === "zima") {
    // Zima přelomová: listopad Y → duben Y+1. Do dubna ještě běží ta „loňská".
    const startYear = m >= 5 ? y : y - 1;
    const start = new Date(Date.UTC(startYear, 10, 1)); // 1. 11.
    const end = new Date(Date.UTC(startYear + 1, 3, 30)); // 30. 4.
    return { from: iso(start > today ? start : today), to: iso(end), year: startYear };
  }

  // Léto: květen → září daného roku; po září se nabízí až to příští
  const startYear = m <= 9 ? y : y + 1;
  const start = new Date(Date.UTC(startYear, 4, 1)); // 1. 5.
  const end = new Date(Date.UTC(startYear, 8, 30)); // 30. 9.
  return { from: iso(start > today ? start : today), to: iso(end), year: startYear };
}

/** „Zimní sezóna 2026/27" nebo „Letní sezóna 2027" */
export function seasonLabel(season: Season, today: Date): string {
  const { year } = seasonRange(season.key, today);
  if (season.key === "zima") return `${season.label} ${year}/${String((year + 1) % 100).padStart(2, "0")}`;
  return `${season.label} ${year}`;
}

/** Které sezóny teď nabízet — mimo své okno by ukazovaly prázdno. */
export function offeredSeasons(today: Date): Season[] {
  const m = today.getMonth() + 1;
  return SEASONS.filter((s) => s.offeredInMonths.includes(m));
}

export function getSeason(key: string | null | undefined): Season | null {
  return SEASONS.find((s) => s.key === key) ?? null;
}
