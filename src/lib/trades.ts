/**
 * Obory stálých pozic — manuální řemesla oblíbená mezi Čechy a Slováky v Norsku.
 *
 * `navCategories` jsou přesné hodnoty NAV `occupationCategories[].level2`
 * (ověřeno proti živému feedu). Podle nich se inzerát zařadí do oboru;
 * co se netrefí do žádného, do stálých pozic vůbec nespadne.
 */

export const TRADE_SLUGS = ["elektrikar", "svarec", "mechanik", "instalater", "ridic"] as const;
export type TradeSlug = (typeof TRADE_SLUGS)[number];

export interface Trade {
  slug: TradeSlug;
  /** Název v množném čísle — dlaždice a filtry */
  label: string;
  /** Do nadpisu stránky: „Práce <title> v Norsku" */
  title: string;
  icon: string;
  badgeClass: string;
  accentClass: string;
  /** NAV level2 kategorie spadající do oboru */
  navCategories: string[];
  /** Úvodní odstavec landing page */
  intro: string;
  /** Meta description */
  description: string;
}

export const TRADES: Trade[] = [
  {
    slug: "elektrikar",
    label: "Elektrikáři",
    title: "elektrikář",
    icon: "⚡",
    badgeClass: "bg-amber-50 text-amber-800",
    accentClass: "bg-amber-500",
    navCategories: ["Elektriker/elektro", "Elektro/elektronikk"],
    intro:
      "Elektrikáři patří v Norsku k nejžádanějším řemeslům — poptávka je stabilní po celý rok a týká se jak montáží v novostavbách, tak servisu a průmyslové automatizace. Pro samostatnou práci na norských instalacích je potřeba uznání kvalifikace, řada firem ale nabírá i do týmu pod vedením norského mistra.",
    description:
      "Aktuální nabídky práce pro elektrikáře v Norsku — trvalé úvazky přeložené do češtiny, s kontaktem na zaměstnavatele.",
  },
  {
    slug: "svarec",
    label: "Svářeči",
    title: "svářeč",
    icon: "🔥",
    badgeClass: "bg-orange-50 text-orange-800",
    accentClass: "bg-orange-500",
    navCategories: ["Platearbeider og sveiser"],
    intro:
      "Svářeči a klempíři najdou práci hlavně v loďařství, offshore průmyslu a kovovýrobě podél celého pobřeží. Zaměstnavatelé nejčastěji požadují platné mezinárodní certifikáty podle EN ISO 9606 — ty z Česka i Slovenska v Norsku uznávají.",
    description:
      "Nabídky práce pro svářeče v Norsku — trvalé pozice v loďařství, průmyslu a kovovýrobě, přeložené do češtiny.",
  },
  {
    slug: "mechanik",
    label: "Mechanici a servisáci",
    title: "mechanik",
    icon: "🔧",
    badgeClass: "bg-slate-100 text-slate-700",
    accentClass: "bg-slate-500",
    navCategories: ["Mekaniker", "Maskinteknikk og mekanikk"],
    intro:
      "Nejširší z oborů — patří sem automechanici, mechanici těžké techniky, průmysloví údržbáři i servisní technici výrobních linek. Právě u servisu strojů bývá požadavek na norštinu mírnější, protože se hodně pracuje podle technické dokumentace v angličtině.",
    description:
      "Práce mechanika a servisního technika v Norsku — trvalé úvazky v průmyslu, dopravě i autoservisech, přeložené do češtiny.",
  },
  {
    slug: "instalater",
    label: "Instalatéři",
    title: "instalatér",
    icon: "🚰",
    badgeClass: "bg-sky-50 text-sky-700",
    accentClass: "bg-sky-500",
    navCategories: ["Rørlegger"],
    intro:
      "Instalatéři (norsky rørlegger) pracují na vodě, topení i vzduchotechnice — typicky v malých firmách o pár lidech, kde se počítá s prací na více zakázkách v regionu. Řidičský průkaz skupiny B bývá podmínkou.",
    description:
      "Nabídky práce pro instalatéry v Norsku — trvalé pozice ve vodoinstalacích a topenářství, přeložené do češtiny.",
  },
  {
    slug: "ridic",
    label: "Řidiči",
    title: "řidič",
    icon: "🚚",
    badgeClass: "bg-purple-50 text-purple-700",
    accentClass: "bg-purple-600",
    navCategories: ["Tog-, sporvogn- og vegtrafikk", "Truckfører"],
    intro:
      "Řidiči nákladních vozů, autobusů a vysokozdvižných vozíků. České i slovenské řidičské průkazy včetně profesní způsobilosti v Norsku platí, u autobusové dopravy ale zaměstnavatelé skoro vždy vyžadují norštinu kvůli komunikaci s cestujícími.",
    description:
      "Práce řidiče v Norsku — trvalé úvazky v kamionové, autobusové a skladové dopravě, přeložené do češtiny.",
  },
];

const BY_SLUG = new Map(TRADES.map((t) => [t.slug, t]));
const BY_CATEGORY = new Map(TRADES.flatMap((t) => t.navCategories.map((c) => [c, t.slug] as const)));

export function getTrade(slug: string | null | undefined): Trade | null {
  if (!slug) return null;
  return BY_SLUG.get(slug as TradeSlug) ?? null;
}

/** Obor podle NAV kategorií inzerátu; null = do stálých pozic nepatří. */
export function tradeForCategories(
  categories: { level1?: string; level2?: string | null }[] | undefined
): TradeSlug | null {
  for (const cat of categories ?? []) {
    const slug = BY_CATEGORY.get(cat.level2 ?? "");
    if (slug) return slug;
  }
  return null;
}

/** URL výpisu stálých pozic se zachovanými filtry. */
export function buildPermanentHref(
  base: string,
  params: { trade?: string; city?: string; extent?: string; withoutNorwegian?: boolean; search?: string; page?: number }
) {
  const q = new URLSearchParams();
  if (params.search) q.set("q", params.search);
  if (params.trade) q.set("obor", params.trade);
  if (params.city) q.set("city", params.city);
  if (params.extent) q.set("uvazek", params.extent);
  if (params.withoutNorwegian) q.set("norsky", "0");
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return `${base}${s ? `?${s}` : ""}`;
}

