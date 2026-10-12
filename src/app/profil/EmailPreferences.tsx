"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Přepínač rozesílky novinek. Zapisuje přímo do profilu pod RLS — uživatel
 * smí měnit jen svůj řádek, takže k tomu není potřeba serverová routa.
 */
export function EmailPreferences({ userId, initialOptIn }: { userId: string; initialOptIn: boolean }) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(initialOptIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !optIn;
    setSaving(true);
    setError(null);
    // Přepínač se překlopí hned, ať to nedrhne; při chybě se vrátí zpátky
    setOptIn(next);

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ marketing_opt_in: next, marketing_changed_at: new Date().toISOString() })
      .eq("id", userId);

    setSaving(false);
    if (dbError) {
      setOptIn(!next);
      setError("Nastavení se nepodařilo uložit, zkus to prosím znovu.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
        E-maily
      </h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">Novinky a nové nabídky</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Občasný e-mail o novinkách na webu a zajímavých pracovních nabídkách.
            Potvrzení o registraci a platbách chodí vždy, ta se tímhle nevypínají.
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          role="switch"
          aria-checked={optIn}
          aria-label="Dostávat e-maily o novinkách"
          className={`relative mt-1 h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${
            optIn ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
          }`}
        >
          {/* Kolečko ukotvené zleva (left-0.5); posun 20 px = šířka dráhy 44 − kolečko 20 − 2× okraj 2.
              Dřív se posouvalo od statické pozice, takže při zapnutí vyjelo mimo tlačítko. */}
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              optIn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
        {optIn ? "Odebíráš novinky." : "Novinky ti nechodí."}
      </p>
      {error && <p className="mt-2 text-xs font-semibold text-[#C8102E]">{error}</p>}
    </div>
  );
}
