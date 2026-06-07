"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Hesla se neshodují.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Nepodařilo se změnit heslo.");
      setLoading(false);
      return;
    }

    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">Nastavit nové heslo</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Zadej své nové heslo.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">Nové heslo</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="min. 6 znaků" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">Potvrdit heslo</label>
            <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60">
            {loading ? "Ukládám…" : "Uložit heslo"}
          </button>
        </form>
      </div>
    </div>
  );
}
