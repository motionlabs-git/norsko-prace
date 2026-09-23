/**
 * Sdílená filtrační logika pro NAV i Finn.no.
 * Udržuje jeden zdroj pravdy pro blokované kategorie a klíčová slova.
 */

// Povolené NAV occupation kategorie (level1).
// POZOR: musí přesně sedět na hodnoty z feedu — dřívější názvy „Industriarbeid",
// „Transport og logistikk", „Renhold og eiendomsdrift" a „Jordbruk, skogbruk og fiske"
// v NAV neexistují, takže se ty obory roky nesbíraly vůbec.
export const ALLOWED_OCCUPATION_CATEGORIES = new Set([
  "Reiseliv og mat",        // gastronomie, hotely
  "Bygg og anlegg",         // stavebnictví
  "Natur og miljø",         // zemědělství, lesnictví, zahradnictví
  "Håndverkere",            // řemesla (elektrikář, svářeč, mechanik, instalatér…)
  "Industri og produksjon", // průmysl a výroba
  "Transport og lager",     // doprava a sklad
]);

// Blokované NAV occupation kategorie — vždy vyloučit
export const BLOCKED_OCCUPATION_CATEGORIES = new Set([
  // Aktuální názvy z feedu
  "Helse og sosial",
  "Salg og service",
  "Kontor og økonomi",
  "Utdanning",
  "IT",
  "Sikkerhet og beredskap",
  "Kultur og kreative yrker",
  // Starší / alternativní názvy — necháváme pro jistotu
  "Helse, pleie og omsorg",
  "Pleie og omsorg",
  "Sosial og omsorg",
  "Sykepleier",
  "Butikk og dagligvare",
  "Salg, markedsføring og reklame",
  "Kontor og administrasjon",
  "Økonomi, regnskap og finans",
  "IT og software",
  "Juridisk",
  "Undervisning",
  "Skole og undervisning",
  "Barnevern",
  "Sosialt arbeid",
]);

// Blokovaná klíčová slova v norském titulu — platí pro NAV i Finn
export const BLOCKED_TITLE_KEYWORDS = [
  // Zdravotnictví / péče (norsky i dánsky — Finn feed obsahuje i dánské inzeráty)
  "sykepleie",       // pokrývá sykepleier, anestesisykepleier, intensivsykepleier…
  "sygeplejer",      // dánsky (sygeplejerske, anæstesisygeplejerske)
  "sygepleje",       // dánsky varianta
  "hjelpepleier",
  "helsefagarbeider",
  "helsearbeider",
  "helsesekretær",
  "pleieassistent",
  "omsorgsarbeider",
  "omsorgsperson",
  "vernepleier",
  "ergoterapeut",
  "fysioterapeut",
  "jordmor",         // porodní asistentka
  "bioingeni",       // bioingeniør / bioingenior (laborant)
  "radiograf",
  "farmasøyt",
  "apoteker",
  "tannlege",
  "tannhelse",
  "tannpleier",
  "anestesi",
  "anæstesi",        // dánsky
  "legevakt",
  "fastlege",
  "ambulanse",
  "sosionom",
  "miljøterapeut",
  "audiograf",
  "overlege",
  "psykolog",
  "barnehagelærer",
  "sykehjem",
  "hjemmepleie",
  "hjemmesykepleie",
  // Obchod / prodej / retail
  "butikkmedarbeider",
  "butikkleder",
  "butikksjef",
  "salgsmedarbeider",
  "salgsassistent",
  "kassemedarbeider",
  "kasserer",
  // Vzdělávání
  "barnehageassistent",
  "skolefritid",
];

// Sezónní/dočasné typy úvazku
export const SEASONAL_ENGAGEMENT_TYPES = new Set([
  "Sesong", "Feriejobb", "Vikariat", "Midlertidig",
  "sesong", "feriejobb", "vikariat", "midlertidig",
]);

// Stálé úvazky. Engasjement/Åremål/Prosjekt jsou sice na dobu určitou, ale jde
// o roční a víceleté kontrakty — pro člověka stěhujícího se do Norska totéž co trvalá práce.
export const PERMANENT_ENGAGEMENT_TYPES = new Set([
  "Fast", "Engasjement", "Åremål", "Prosjekt",
]);

/**
 * Vrátí true pokud norský titul obsahuje blokované klíčové slovo.
 * Platí pro NAV i Finn.no joby.
 */
export function hasBlockedTitle(titleNo: string): boolean {
  const lower = titleNo.toLowerCase();
  return BLOCKED_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Vrátí true pokud NAV kategorie (level1) je na blacklistu.
 */
export function hasBlockedCategory(categoryLevel1: string | null | undefined): boolean {
  if (!categoryLevel1) return false;
  return BLOCKED_OCCUPATION_CATEGORIES.has(categoryLevel1);
}

/**
 * Vrátí true pokud NAV kategorie (level1) je na allowlistu.
 */
export function isAllowedCategory(categoryLevel1: string | null | undefined): boolean {
  if (!categoryLevel1) return false;
  return ALLOWED_OCCUPATION_CATEGORIES.has(categoryLevel1);
}
