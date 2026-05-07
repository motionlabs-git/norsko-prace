"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Props {
  userId: string;
  initialName: string;
  locale: string;
}

export function ProfileForm({ userId, initialName, locale }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isCs = locale === "cs";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSave}>
        <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
          {isCs ? "Jméno" : "Meno"}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
            placeholder={isCs ? "Tvoje jméno" : "Tvoje meno"}
            className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "…" : saved ? "✓" : isCs ? "Uložit" : "Uložiť"}
          </button>
        </div>
      </form>

      <div className="border-t border-[var(--color-border)] pt-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-full border border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {loggingOut ? "…" : isCs ? "Odhlásit se" : "Odhlásiť sa"}
        </button>
      </div>
    </>
  );
}
