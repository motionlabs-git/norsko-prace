"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;
  const isCs = locale === "cs";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/${locale}/auth/callback?next=/${locale}/auth/reset-password`,
    });

    if (error) {
      setError(isCs ? "Nepodařilo se odeslat e-mail." : "Nepodarilo sa odoslať e-mail.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-4 text-4xl">✉️</div>
          <h2 className="text-xl font-extrabold text-[var(--color-text)]">
            {isCs ? "Zkontroluj e-mail" : "Skontroluj e-mail"}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {isCs
              ? `Pokud účet s e-mailem ${email} existuje, poslali jsme ti odkaz pro reset hesla.`
              : `Ak účet s e-mailom ${email} existuje, poslali sme ti odkaz na reset hesla.`}
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition"
          >
            {isCs ? "Zpět na přihlášení" : "Späť na prihlásenie"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--color-text)]">
            {isCs ? "Zapomenuté heslo" : "Zabudnuté heslo"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {isCs
              ? "Zadej svůj e-mail a pošleme ti odkaz pro reset hesla."
              : "Zadaj svoj e-mail a pošleme ti odkaz na reset hesla."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[var(--color-text)]">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="tvuj@email.cz"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--color-primary)] py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading
              ? isCs ? "Odesílám…" : "Odosielam…"
              : isCs ? "Odeslat odkaz" : "Odoslať odkaz"}
          </button>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
            >
              {isCs ? "Zpět na přihlášení" : "Späť na prihlásenie"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
