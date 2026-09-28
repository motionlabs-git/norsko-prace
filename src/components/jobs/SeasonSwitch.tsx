"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { SeasonKey } from "@/lib/seasons";

interface Props {
  /** Nabízené sezóny s hotovými popisky — počítá je server, ať se vzhled neliší po hydrataci */
  seasons: { key: SeasonKey; label: string; icon: string; monthsLabel: string; count: number }[];
  active: SeasonKey | null;
}

export function SeasonSwitch({ seasons, active }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const select = useCallback(
    (key: SeasonKey | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key) params.set("sezona", key);
      else params.delete("sezona");
      // Sezóna a ruční termín jsou dvě cesty k témuž — druhou zahodíme, ať si neodporují
      params.delete("od");
      params.delete("do");
      params.delete("termin");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/prace?${qs}` : "/prace");
    },
    [router, searchParams]
  );

  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border";
  const on = "border-transparent bg-white text-[var(--color-primary)] shadow-[var(--shadow-sm)]";
  const off = "border-white/25 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => select(null)} className={`${base} ${active === null ? on : off}`}>
        Všechny nabídky
      </button>
      {seasons.map((s) => (
        <button
          key={s.key}
          onClick={() => select(s.key)}
          className={`${base} ${active === s.key ? on : off}`}
          title={`${s.monthsLabel} · ${s.count} nabídek`}
        >
          <span aria-hidden>{s.icon}</span>
          {s.label}
          <span className={active === s.key ? "text-[var(--color-text-muted)]" : "text-white/55"}>{s.count}</span>
        </button>
      ))}
    </div>
  );
}
