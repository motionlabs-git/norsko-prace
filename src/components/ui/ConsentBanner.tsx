"use client";

import Link from "next/link";

// Souhlas s analytickými cookies (PostHog). Zobrazí se, dokud uživatel nezvolí.
// Volba se ukládá do localStorage a řídí opt-in/opt-out v providers.tsx.
export function ConsentBanner({ onChoice }: { onChoice: (choice: "granted" | "denied") => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="consent-banner-in mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          Používáme analytické cookies (PostHog), abychom rozuměli, jak web používáš, a mohli
          ho zlepšovat. Více v{" "}
          <Link href="/privacy" className="font-semibold text-[var(--color-primary)] hover:underline">
            zásadách ochrany soukromí
          </Link>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onChoice("denied")}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] transition"
          >
            Odmítnout
          </button>
          <button
            type="button"
            onClick={() => onChoice("granted")}
            className="cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition"
          >
            Přijmout
          </button>
        </div>
      </div>
    </div>
  );
}
