"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { track, AnalyticsEvent } from "@/lib/analytics";

const perks = [
  "Kontakty a přihlášení u všech nabídek, bez limitu",
  "Vybrané ověřené nabídky s ubytováním",
  "Cena 149 Kč zamčená pro první uživatele",
];

// Vyskakovací okno po vyčerpání bezplatných kontaktů.
export function UpgradeModal({ limit, onClose }: { limit: number; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="modal-backdrop-in absolute inset-0 bg-[#001849]/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        tabIndex={-1}
        className="modal-in relative w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-[var(--shadow-lg)] outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavřít"
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)]"
        >
          ✕
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-2xl">
          🔒
        </div>
        <h2 id="upgrade-modal-title" className="text-xl font-extrabold text-[var(--color-text)]">
          Využil(a) jsi všech {limit} kontaktů zdarma
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Teď už víš, co dostaneš. S Premium odemkneš kontakt u každé nabídky, kterou najdeš.
        </p>
        <ul className="mt-5 space-y-2 text-left">
          {perks.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-[var(--color-text)]">
              <span className="font-bold text-[var(--color-primary)]">✓</span> {p}
            </li>
          ))}
        </ul>
        <Link
          href="/premium"
          onClick={() => track(AnalyticsEvent.UpgradeCtaClicked, { source: "contact_limit_modal" })}
          className="cta-arrow mt-6 flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Odemknout Premium za 149 Kč/měs
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 cursor-pointer text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          Teď ne
        </button>
      </div>
    </div>
  );
}
