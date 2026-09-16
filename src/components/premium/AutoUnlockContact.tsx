"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track, AnalyticsEvent } from "@/lib/analytics";
import { UpgradeModal } from "./UpgradeModal";

// Otevření detailu = čerpání jednoho bezplatného kontaktu. Běží až po mountu v prohlížeči,
// ne při renderu na serveru — jinak by kontakty spotřeboval už prefetch odkazů v přehledu.
// Po úspěchu server stránku překreslí s kontaktem (router.refresh).
export function AutoUnlockContact({ jobId, limit }: { jobId: string; limit: number }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"loading" | "limit" | "error">("loading");

  const unlock = useCallback(async () => {
    try {
      const res = await fetch("/api/contact-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.status === 401) return router.push(`/auth/login?next=${window.location.pathname}`);
      if (res.status === 403) return setState("limit");
      if (!res.ok) throw new Error();
      const { remaining } = (await res.json()) as { remaining: number | null };
      track(AnalyticsEvent.ContactUnlocked, { job_id: jobId, remaining });
      router.refresh();
    } catch {
      setState("error");
    }
  }, [jobId, router]);

  useEffect(() => {
    if (started.current) return; // StrictMode v dev spouští efekt dvakrát
    started.current = true;
    void unlock();
  }, [unlock]);

  if (state === "limit") return <ContactLimitReached jobId={jobId} limit={limit} />;

  if (state === "error") {
    return (
      <>
        <p className="mb-4 text-sm text-red-600">Kontakt se nepodařilo načíst.</p>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            void unlock();
          }}
          className="cursor-pointer rounded-full border border-[var(--color-primary)] px-5 py-2 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-primary-light)]"
        >
          Zkusit znovu
        </button>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2" aria-live="polite">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      <p className="text-sm font-semibold text-[var(--color-text)]">Načítám kontakt…</p>
    </div>
  );
}

// Limit vyčerpán: zamčená karta + vyskakovací okno hned po otevření detailu.
export function ContactLimitReached({ jobId, limit }: { jobId: string; limit: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    track(AnalyticsEvent.ContactLimitReached, { job_id: jobId });
  }, [jobId]);

  return (
    <>
      <p className="mb-2 text-2xl">🔒</p>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Využil(a) jsi všech {limit} kontaktů zdarma.
      </p>
      <Link
        href="/premium"
        onClick={() => track(AnalyticsEvent.UpgradeCtaClicked, { source: "contact_card" })}
        className="cta-arrow inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        Odemknout s Premium
      </Link>
      {open && <UpgradeModal limit={limit} onClose={() => setOpen(false)} />}
    </>
  );
}
