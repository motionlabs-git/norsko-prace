"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { track, AnalyticsEvent } from "@/lib/analytics";

// Vyhledávání podle klíčových slov. Stav drží URL (?q=…), takže jde sdílet a funguje zpět/vpřed;
// ostatní filtry zůstávají zachované.
export function JobSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  function go(q: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    if (trimmed) track(AnalyticsEvent.Search, { q: trimmed });
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="flex w-full max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 shadow-[var(--shadow-lg)]"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="ml-3 h-5 w-5 flex-shrink-0 text-[var(--color-text-muted)]" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Kuchař, sklad, Tromsø, ubytování…"
        aria-label="Hledat v nabídkách"
        maxLength={80}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (initialQuery) go("");
          }}
          aria-label="Vymazat hledání"
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)]"
        >
          ✕
        </button>
      )}
      <button
        type="submit"
        className="flex-shrink-0 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
      >
        Hledat
      </button>
    </form>
  );
}
