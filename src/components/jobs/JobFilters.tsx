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
  accommodation?: boolean;
}

export function JobFilters({
  locale,
  category = "",
  engagementType = "",
  city = "",
  cities = [],
  accommodation = false,
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

  const toggleAccommodation = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (accommodation) {
      params.delete("ubytovani");
    } else {
      params.set("ubytovani", "1");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, accommodation]);

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

      <button
        onClick={toggleAccommodation}
        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
          accommodation
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        }`}
      >
        <svg viewBox="0 0 24 24" fill={accommodation ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {locale === "cs" ? "S ubytováním" : "S ubytovaním"}
      </button>

    </div>
  );
}
