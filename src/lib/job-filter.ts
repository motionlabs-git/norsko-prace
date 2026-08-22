/**
 * Sdílená filtrační logika pro NAV i Finn.no.
 * Udržuje jeden zdroj pravdy pro blokované kategorie a klíčová slova.
 */

// Povolené NAV occupation kategorie (level1)
export const ALLOWED_OCCUPATION_CATEGORIES = new Set([
  "Jordbruk, skogbruk og fiske",
  "Reiseliv og mat",
  "Bygg og anlegg",
  "Transport og logistikk",
  "Renhold og eiendomsdrift",
  "Industriarbeid",
  "Natur og miljø",
]);

// Blokované NAV occupation kategorie — vždy vyloučit
export const BLOCKED_OCCUPATION_CATEGORIES = new Set([
  "Helse, pleie og omsorg",
  "Helse og sosial",
  "Pleie og omsorg",
  "Sosial og omsorg",
  "Sykepleier",
  "Butikk og dagligvare",
  "Salg, markedsføring og reklame",
  "Salg og service",
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
