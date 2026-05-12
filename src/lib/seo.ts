const BASE = "https://norsko-prace.cz";

export function buildAlternates(locale: string, path: string) {
  const csUrl = `${BASE}/cs${path}`;
  const skUrl = `${BASE}/sk${path}`;
  return {
    canonical: locale === "cs" ? csUrl : skUrl,
    languages: {
      cs: csUrl,
      sk: skUrl,
      "x-default": csUrl,
    },
  };
}

export function buildBreadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
