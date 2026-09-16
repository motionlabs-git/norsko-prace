import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getEntitlement, hasPremium } from "@/lib/entitlement";
import { CheckoutButton } from "@/components/premium/CheckoutButton";
import { ManageSubscriptionButton } from "@/components/premium/ManageSubscriptionButton";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = {
  title: "Premium — odemkni všechny nabídky",
  description:
    "Founding Premium za 149 Kč měsíčně: kontakty na zaměstnavatele u všech nabídek a vybrané ověřené práce v Norsku.",
};

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Jen to, co opravdu funguje — připravované funkce jsou zvlášť a nejsou součástí předplatného
const foundingFeatures = [
  "Kontakty na zaměstnavatele a přihlášení u všech nabídek",
  "Vybrané práce — ověřené nabídky, často s ubytováním",
  "Cena 149 Kč zamčená po celou dobu předplatného",
  "Zrušíš kdykoli jedním klikem v profilu",
];

const upcoming = [
  { icon: "🔔", title: "Upozornění na nové nabídky", text: "E-mail, jakmile se objeví práce podle tvého hledání." },
  { icon: "📋", title: "Průvodce administrativou", text: "D-number, BankID, daně a banka krok za krokem." },
  { icon: "✅", title: "Checklist před odjezdem", text: "Co vyřídit doma a co hned po příjezdu do Norska." },
];

export default async function PremiumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ent = await getEntitlement(user?.id);
  const alreadyPremium = hasPremium(ent);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Premium</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Odemkni celý potenciál</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/65">
            Inzeráty a popisy jsou u nás zdarma. S Premium získáš navíc kontakty na zaměstnavatele,
            vybrané ověřené nabídky a nástroje, které ti sezónu v Norsku výrazně usnadní.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm font-semibold text-white/85">
            Nejsi si jistý? Po registraci uvidíš zdarma kontakt u prvních 10 nabídek, které otevřeš.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          {alreadyPremium && (
            <div className="mb-8 flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-primary)] bg-[var(--color-primary-light)] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[var(--color-primary-dark)]">
                Máš aktivní Premium předplatné. Díky! 🎉
              </p>
              <ManageSubscriptionButton className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition" />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Founding Premium — zatím jediný prodávaný tarif */}
            <Reveal className="h-full *:h-full">
              <div className="relative flex flex-col rounded-2xl border-2 border-[var(--color-primary)] bg-white p-7 shadow-[var(--shadow-md)]">
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white">
                  Pro první uživatele
                </span>
                <h2 className="text-lg font-extrabold text-[var(--color-text)]">Founding Premium</h2>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-extrabold text-[var(--color-text)]">149 Kč</span>
                  <span className="mb-1 text-sm text-[var(--color-text-muted)]">/ měsíc</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {foundingFeatures.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-[var(--color-text)]">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
                {alreadyPremium ? (
                  <div className="mt-7 rounded-full bg-[var(--color-bg)] py-3 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                    Máš aktivní
                  </div>
                ) : (
                  <CheckoutButton plan="founding" className="cta-arrow mt-7 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition">
                    Chci Founding Premium
                  </CheckoutButton>
                )}
              </div>
            </Reveal>

            {/* Připravujeme — zatím NENÍ součástí předplatného */}
            <Reveal delay={90} className="h-full *:h-full">
              <div className="flex flex-col rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 p-7">
                <span className="self-start rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                  Připravujeme
                </span>
                <h2 className="mt-3 text-lg font-extrabold text-[var(--color-text)]">Co chystáme dál</h2>
                <ul className="mt-6 flex-1 space-y-4">
                  {upcoming.map((f) => (
                    <li key={f.title} className="flex gap-3">
                      <span className="text-lg leading-none" aria-hidden>{f.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">{f.title}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{f.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-[var(--color-text-muted)]">
                  Founding členové se o novinkách dozví jako první. Připravované funkce nejsou součástí
                  předplatného, dokud je nespustíme.
                </p>
              </div>
            </Reveal>
          </div>

          <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
            Platba přes Stripe. Předplatné můžeš kdykoli zrušit.{" "}
            <Link href="/terms" className="font-semibold text-[var(--color-primary)] hover:underline">
              Obchodní podmínky
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
