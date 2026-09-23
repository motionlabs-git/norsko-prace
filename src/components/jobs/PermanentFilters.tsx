"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { TRADES } from "@/lib/trades";

const EXTENTS = [
  { value: "", label: "Plný i částečný úvazek" },
  { value: "Heltid", label: "Plný úvazek" },
  { value: "Deltid", label: "Částečný úvazek" },
];

interface Props {
  /** Skryté na landing page oboru — obor je tam daný URL */
  showTrade?: boolean;
  trade?: string;
  city?: string;
  cities?: string[];
  extent?: string;
  /** true = zobrazit jen nabídky bez požadavku na norštinu */
  withoutNorwegian?: boolean;
}

export function PermanentFilters({
  showTrade = true,
  trade = "",
  city = "",
  cities = [],
  extent = "",
  withoutNorwegian = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const selectClass =
    "w-full sm:w-auto rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer";

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
      {showTrade && (
        <select
          className={selectClass}
          value={trade}
          onChange={(e) => navigate("obor", e.target.value)}
          aria-label="Obor"
        >
          <option value="">Všechny obory</option>
          {TRADES.map((t) => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
      )}

      {cities.length > 0 && (
        <select
          className={selectClass}
          value={city}
          onChange={(e) => navigate("city", e.target.value)}
          aria-label="Město"
        >
          <option value="">Všechna města</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}

      <select
        className={selectClass}
        value={extent}
        onChange={(e) => navigate("uvazek", e.target.value)}
        aria-label="Rozsah úvazku"
      >
        {EXTENTS.map((e) => (
          <option key={e.value} value={e.value}>{e.label}</option>
        ))}
      </select>

      <button
        onClick={() => navigate("norsky", withoutNorwegian ? "" : "0")}
        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
          withoutNorwegian
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        }`}
      >
        Bez nutné norštiny
      </button>
    </div>
  );
}
