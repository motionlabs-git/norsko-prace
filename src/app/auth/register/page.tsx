"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "Účet s tímto e-mailem již existuje."
        : error.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 text-4xl">✉️</div>
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">Zkontroluj e-mail</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Poslali jsme ti potvrzovací odkaz na <strong>{email}</strong>. Po potvrzení se můžeš přihlásit.
          </p>
          <Link href="/auth/login" className="mt-6 inline-block rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90">
            Přihlásit se
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">Vytvořit účet</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Už máš účet?{" "}
            <Link href="/auth/login" className="font-semibold text-[var(--color-primary)] hover:underline">Přihlásit se</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">Jméno</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Jana Nováková" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="tvuj@email.cz" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">Heslo</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="min. 6 znaků" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--color-border)] accent-[var(--color-primary)]" />
            <span className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Souhlasím s{" "}
              <Link href="/terms" className="font-semibold text-[var(--color-primary)] hover:underline">podmínkami použití</Link>{" "}
              a{" "}
              <Link href="/privacy" className="font-semibold text-[var(--color-primary)] hover:underline">zásadami ochrany osobních údajů</Link>.
            </span>
          </label>

          <button type="submit" disabled={loading || !agreed}
            className="w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60">
            {loading ? "Registruji…" : "Vytvořit účet"}
          </button>
        </form>
      </div>
    </div>
  );
}
