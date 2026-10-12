import Link from "next/link";
import { setMarketingOptIn, verifyUnsubscribe } from "@/lib/marketing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Odhlášení z novinek",
  robots: { index: false, follow: false },
};

/**
 * Odhlášení z patičky e-mailu. Funguje bez přihlášení — adresa nese podepsaný token,
 * takže nejde odhlásit cizí účet přepsáním id v odkazu.
 *
 * Odhlašuje se rovnou při otevření, bez potvrzovacího tlačítka: poštovní klienti sice
 * odkazy předběžně načítají, ale u odhlášení je nechtěné odhlášení menší zlo než
 * nefunkční odkaz. Zpět to jde jedním klikem.
 */
export default async function OdhlasitPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string }>;
}) {
  const { u: userId, t: token } = await searchParams;
  const valid = Boolean(userId && token && verifyUnsubscribe(userId, token));

  let done = false;
  if (valid && userId) {
    try {
      await setMarketingOptIn(userId, false);
      done = true;
    } catch (err) {
      console.error("odhlášení:", err instanceof Error ? err.message : err);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-bg)] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        {done ? (
          <>
            <div className="mb-4 text-4xl">✅</div>
            <h1 className="text-xl font-extrabold text-[var(--color-text)]">Hotovo, novinky ti už nepřijdou</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Potvrzení o registraci a platbách chodí dál — ta se týkají tvého účtu a vypnout se nedají.
              Kdybys to chtěl vrátit, přepneš to kdykoli v profilu.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">🤔</div>
            <h1 className="text-xl font-extrabold text-[var(--color-text)]">Odkaz nesedí</h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              Odhlašovací odkaz je neplatný nebo neúplný. Odhlásit se můžeš i přímo v profilu —
              stačí se přihlásit.
            </p>
          </>
        )}

        <div className="mt-7 flex flex-col gap-2">
          <Link
            href="/profil"
            className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Otevřít profil
          </Link>
          <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
            Zpět na úvodní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
