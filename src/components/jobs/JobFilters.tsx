"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CATEGORIES = [
  { value: "", label: { cs: "Všechny kategorie", sk: "Všetky kategórie" } },
  { value: "Jordbruk, skogbruk og fiske", label: { cs: "Zemědělství", sk: "Poľnohospodárstvo" } },
  { value: "Reiseliv og mat", label: { cs: "Gastronomie", sk: "Gastronómia" } },
  { value: "Bygg og anlegg", label: { cs: "Stavebnictví", sk: "Stavebníctvo" } },
  { value: "Transport og logistikk", label: { cs: "Doprava", sk: "Doprava" } },
  { value: "Renhold og eiendomsdrift", label: { cs: "Úklid", sk: "Upratovanie" } },
];

const ENGAGEMENT_TYPES = [
  { value: "", label: { cs: "Všechny typy", sk: "Všetky typy" } },
  { value: "Sesong", label: { cs: "Sezónní", sk: "Sezónna" } },
  { value: "Feriejobb", label: { cs: "Brigáda", sk: "Brigáda" } },
  { value: "Vikariat", label: { cs: "Zástup", sk: "Zástup" } },
  { value: "Midlertidig", label: { cs: "Dočasný", sk: "Dočasná" } },
  { value: "Fast", label: { cs: "Trvalý", sk: "Trvalá" } },
];

type Locale = "cs" | "sk";

interface JobFiltersProps {
  locale: Locale;
  category?: string;
  engagementType?: string;
  city?: string;
  cities?: string[];
}

export function JobFilters({
  locale,
  category = "",
  engagementType = "",
  city = "",
  cities = [],
}: JobFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const selectClass =
    "w-full sm:w-auto rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
      <select
        className={selectClass}
        value={category}
        onChange={(e) => navigate("category", e.target.value)}
        aria-label="Kategorie"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label[locale]}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={engagementType}
        onChange={(e) => navigate("type", e.target.value)}
        aria-label="Typ úvazku"
      >
        {ENGAGEMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label[locale]}
          </option>
        ))}
      </select>

      {cities.length > 0 && (
        <select
          className={selectClass}
          value={city}
          onChange={(e) => navigate("city", e.target.value)}
          aria-label="Město"
        >
          <option value="">
            {locale === "cs" ? "Všechna města" : "Všetky mestá"}
          </option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

    </div>
  );
}
