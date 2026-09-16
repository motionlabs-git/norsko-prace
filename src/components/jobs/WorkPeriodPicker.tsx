"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { cs } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { track, AnalyticsEvent } from "@/lib/analytics";

// Datumy v URL jako YYYY-MM-DD v místním čase (toISOString by posunul den kvůli časové zóně)
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (d: Date) => d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" });
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const later = (a: Date, b: Date) => (a > b ? a : b);

// Rychlé volby podle dnešního data: nejbližší léto (čer–srp) a zima (pro–dub)
function presets(today: Date): { label: string; range: DateRange }[] {
  const y = today.getFullYear();
  const m = today.getMonth();
  const summer = m > 7 ? y + 1 : y;
  const winter = m >= 4 ? y : y - 1;
  return [
    { label: "Hned (30 dní)", range: { from: today, to: addDays(today, 30) } },
    { label: `Léto ${summer}`, range: { from: later(new Date(summer, 5, 1), today), to: new Date(summer, 7, 31) } },
    {
      label: `Zima ${winter}/${String((winter + 1) % 100).padStart(2, "0")}`,
      range: { from: later(new Date(winter, 11, 1), today), to: new Date(winter + 1, 3, 30) },
    },
  ];
}

const rdpTheme = {
  "--rdp-accent-color": "var(--color-primary)",
  "--rdp-accent-background-color": "var(--color-primary-light)",
  "--rdp-today-color": "var(--color-primary)",
} as CSSProperties;

export function WorkPeriodPicker({
  initialFrom = "",
  initialTo = "",
  initialOnlyKnown = false,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialOnlyKnown?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  // Dnešek zjišťujeme až při otevření (ne při renderu) — žádný rozdíl server/klient
  const [today, setToday] = useState<Date | null>(null);
  const [range, setRange] = useState<DateRange | undefined>(
    initialFrom ? { from: fromIso(initialFrom), to: fromIso(initialTo || initialFrom) } : undefined
  );
  const [onlyKnown, setOnlyKnown] = useState(initialOnlyKnown);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      const now = new Date();
      setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    setOpen((o) => !o);
  }

  function navigate(next: { from: string; to: string; onlyKnown: boolean } | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("od", next.from);
      params.set("do", next.to);
      if (next.onlyKnown) params.set("termin", "1");
      else params.delete("termin");
      track(AnalyticsEvent.FilterUsed, { filter: "period", from: next.from, to: next.to, onlyKnown: next.onlyKnown });
    } else {
      params.delete("od");
      params.delete("do");
      params.delete("termin");
    }
    params.delete("page");
    setOpen(false);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function apply() {
    if (!range?.from) return;
    navigate({ from: toIso(range.from), to: toIso(range.to ?? range.from), onlyKnown });
  }

  const active = Boolean(initialFrom);
  const label = active
    ? `${fmt(fromIso(initialFrom))} – ${fmt(fromIso(initialTo || initialFrom))}`
    : "Kdy chceš jet?";

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center rounded-full border text-sm font-semibold transition-colors ${
          active
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex cursor-pointer items-center gap-2 py-2.5 pl-4 pr-4"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {label}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => navigate(null)}
            aria-label="Zrušit termín"
            className="-ml-2 mr-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-xs hover:bg-white/20"
          >
            ✕
          </button>
        )}
      </div>

      {open && today && (
        <div
          role="dialog"
          aria-label="Vyber termín příjezdu a odjezdu"
          className="modal-in absolute left-0 top-full z-40 mt-2 w-[min(92vw,620px)] rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-lg)]"
        >
          <p className="mb-3 text-sm font-bold text-[var(--color-text)]">Kdy chceš v Norsku pracovat?</p>

          <div className="mb-3 flex flex-wrap gap-2">
            {presets(today).map((p) => {
              const pFrom = toIso(p.range.from!);
              const pTo = toIso(p.range.to!);
              const selected = initialFrom === pFrom && initialTo === pTo;
              return (
                // Rychlá volba filtruje hned (bez „Použít")
                <button
                  key={p.label}
                  type="button"
                  onClick={() => navigate({ from: pFrom, to: pTo, onlyKnown })}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div style={rdpTheme} className="overflow-x-auto">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              locale={cs}
              weekStartsOn={1}
              numberOfMonths={2}
              disabled={{ before: today }}
              startMonth={today}
              defaultMonth={range?.from ?? today}
              excludeDisabled
            />
          </div>

          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {range?.from
              ? `Příjezd ${fmt(range.from)} · odjezd ${range.to ? fmt(range.to) : "— vyber"}`
              : "Nebo v kalendáři klikni na den příjezdu a pak na den odjezdu."}{" "}
            Ukážeme nabídky, jejichž termín se s tvým překrývá (±14 dní).
          </p>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={onlyKnown}
              onChange={(e) => setOnlyKnown(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Jen nabídky s uvedeným termínem
          </label>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRange(undefined);
                if (active) navigate(null);
              }}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg)]"
            >
              Zrušit
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!range?.from}
              className="cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Použít
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
