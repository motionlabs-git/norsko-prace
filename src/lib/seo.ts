const BASE = "https://norsko-prace.cz";

export function buildAlternates(path: string) {
  const url = `${BASE}${path}`;
  return {
    canonical: url,
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
