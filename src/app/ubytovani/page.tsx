import Link from "next/link";

export const revalidate = 86400;

export const metadata = {
  title: "Jak najít ubytování v Norsku",
  description: "Průvodce hledáním ubytování v Norsku. Hybel.no, Finn.no, tipy pro komunikaci s pronajímateli a co čekat.",
};

const STEPS = [
  { number: "01", icon: "🔍", title: "Kde hledat", desc: "Začni na Hybel.no — největší norský portál s pronájmy. Finn.no/eiendom/leie je druhá nejlepší volba s více typy nabídek. Obě stránky mají anglické rozhraní.", color: "border-[var(--color-primary)]", iconBg: "bg-[var(--color-primary-light)]" },
  { number: "02", icon: "✉️", title: "Co napsat pronajímateli", desc: "Piš anglicky — většina Norů angličtinu ovládá výborně. Uveď: kdy nastupuješ do práce, jak dlouho plánuješ zůstat, jestli kouříš a zda máš domácí zvíře. Krátce a věcně.", color: "border-blue-500", iconBg: "bg-blue-50" },
  { number: "03", icon: "📋", title: "Co očekávat", desc: "Standardně se platí 1–2 měsíce kauce (depositum) předem. Smlouva (leieavtale) by měla být písemná. Nájemné se většinou platí 1. v měsíci na norský bankovní účet.", color: "border-amber-500", iconBg: "bg-amber-50" },
  { number: "04", icon: "🏠", title: "Typy ubytování", desc: "Hybel = pokoj v domě pronajímatele (sdílená kuchyně/koupelna, levnější). Leilighet = samostatný byt. Pro sezónní práci je hybel nejběžnější a nejdostupnější volba.", color: "border-emerald-500", iconBg: "bg-emerald-50" },
];

const TIPS = [
  { type: "tip", icon: "✅", text: "Reaguj rychle — dobré nabídky zmizí do 24–48 hodin." },
  { type: "tip", icon: "✅", text: "Filtruj podle lokality přesně tam, kde budeš pracovat — doprava v Norsku je drahá." },
  { type: "tip", icon: "✅", text: "Hybel.no umožňuje nastavit e-mailové notifikace na nové inzeráty — využij to." },
  { type: "warning", icon: "⚠️", text: "Nikdy neposílej zálohu bez podepsané smlouvy a osobního ověření pronajímatele." },
  { type: "warning", icon: "⚠️", text: "Vyhýbej se nabídkám, kde pronajímatel žádá platbu přes Western Union nebo MoneyGram." },
  { type: "tip", icon: "✅", text: "Facebook skupiny jako 'Czesi a Slováci v Norsku' mohou mít tipy na ubytování od krajanů." },
];

const GROUPS = [
  { city: "Bergen", name: "BOLIG TIL SALGS/LEIE I BERGEN OG OMEGN", url: "https://www.facebook.com/groups/212581239285088/", members: "Prodej i pronájem, velká aktivita" },
  { city: "Bergen", name: "Rent in Bergen, Norway", url: "https://www.facebook.com/groups/1721966478021587", members: "Zaměřeno na expaty a krátkodobé pronájmy" },
  { city: "Oslo", name: "OSLO Boliger til leie/ønskes leid", url: "https://www.facebook.com/groups/1493950923987765", members: "Největší osloská skupina na pronájmy" },
  { city: "Tvé město", name: "Jak najít skupinu pro jiná města →", url: null, members: 'Hledej: "Rent in [město]" nebo "Leie [město]" nebo "Bolig [město]"' },
];

const FB_ICON = <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
const ARROW_ICON = <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" /></svg>;

export default function UbytovaniPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Průvodce ubytováním</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-5xl">Jak najít ubytování v Norsku</h1>
          <p className="mt-3 max-w-xl text-white/65">Bez ubytování od zaměstnavatele? Žádný problém. Tady je přesný postup jak si najít bydlení před příjezdem.</p>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: "💰", value: "6 000–12 000 NOK", label: "Průměrné nájemné / měsíc", note: "závisí na lokalitě a typu" },
              { icon: "🌐", value: "Hybel.no", label: "Nejlepší platforma", note: "největší výběr, anglické rozhraní" },
              { icon: "📅", value: "2–4 týdny", label: "Hledej dopředu", note: "před nástupem do práce" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
                <div className="mb-2 text-3xl">{stat.icon}</div>
                <p className="text-xl font-extrabold text-[var(--color-text)]">{stat.value}</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{stat.label}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-8 text-2xl font-extrabold text-[var(--color-text)]">Postup krok za krokem</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.number} className={`rounded-2xl border-l-[3px] bg-white border border-[var(--color-border)] p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${step.color}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${step.iconBg}`}>{step.icon}</div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Krok {step.number}</span>
                </div>
                <h3 className="mb-2 text-base font-extrabold text-[var(--color-text)]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 border-y border-[var(--color-border)]">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-2 text-2xl font-extrabold text-[var(--color-text)]">Kde hledat — přímé odkazy</h2>
          <p className="mb-8 text-[var(--color-text-muted)]">Obě platformy jsou zdarma a mají anglické rozhraní.</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow-sm">H</div>
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--color-text)]">Hybel.no</h3>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Doporučeno</span>
                </div>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-muted)]">Největší norský web zaměřený čistě na pronájmy. Najdeš zde hybler (pokoje), leiligheter (byty) i kolektivy. Filtrování podle města, ceny a dostupnosti.</p>
              <a href="https://www.hybel.no/leiebolig/?type=Hybel,Leilighet&available=true" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">
                Hledat na Hybel.no {ARROW_ICON}
              </a>
            </div>
            <div className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-2xl font-black text-white shadow-sm">F</div>
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--color-text)]">Finn.no</h3>
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">Široký výběr</span>
                </div>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-[var(--color-text-muted)]">Norský eBay — obrovský výběr inzerátů včetně pronájmů. Sekce &apos;Eiendom til leie&apos; nabízí od pokojů až po rodinné domy.</p>
              <a href="https://www.finn.no/realestate/lettings/search.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700">
                Hledat na Finn.no {ARROW_ICON}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1877F2] text-white">{FB_ICON}</div>
            <h2 className="text-2xl font-extrabold text-[var(--color-text)]">Facebook skupiny</h2>
          </div>
          <p className="mb-8 text-[var(--color-text-muted)]">Místní FB skupiny jsou skvělý doplněk — pronajímatelé zde inzerují nabídky, které nenajdeš jinde.</p>
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <div key={group.name} className={`flex flex-col rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all ${group.url ? "hover:-translate-y-0.5 hover:shadow-md" : ""}`}>
                <div className="mb-3 flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white text-xs font-black ${group.url ? "bg-[#1877F2]" : "bg-gray-300"}`}>
                    {group.url ? <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> : "🔎"}
                  </div>
                  <div className="flex-1">
                    <span className="mb-1 inline-flex items-center rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-bold text-[var(--color-text-muted)] border border-[var(--color-border)]">{group.city}</span>
                    <p className="mt-1 text-sm font-bold leading-snug text-[var(--color-text)]">{group.name}</p>
                  </div>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-[var(--color-text-muted)]">{group.members}</p>
                {group.url ? (
                  <a href={group.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1.5 self-start rounded-full bg-[#1877F2]/10 px-4 py-1.5 text-xs font-bold text-[#1877F2] transition hover:bg-[#1877F2] hover:text-white">
                    Přejít do skupiny {ARROW_ICON}
                  </a>
                ) : (
                  <div className="mt-auto rounded-xl bg-[var(--color-bg)] border border-dashed border-[var(--color-border)] px-4 py-2">
                    <code className="text-xs text-[var(--color-text-muted)]">🔎 Hledat na Facebooku →</code>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5">
            <p className="text-sm font-bold text-blue-900">💡 Tip: Jak najít skupinu pro jakékoli norské město</p>
            <p className="mt-1 text-sm text-blue-800">Na Facebooku hledej: &quot;Rent in Stavanger&quot;, &quot;Leie Tromsø&quot;, &quot;Bolig Trondheim&quot; nebo &quot;[město] bolig til leie&quot;. Výsledky filtruj na Skupiny.</p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="mb-8 text-2xl font-extrabold text-[var(--color-text)]">Tipy a varování</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TIPS.map((tip, i) => (
              <div key={i} className={`flex gap-3 rounded-xl border px-5 py-4 ${tip.type === "tip" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                <span className="mt-0.5 text-lg leading-none">{tip.icon}</span>
                <p className={`text-sm leading-relaxed ${tip.type === "tip" ? "text-emerald-800" : "text-amber-800"}`}>{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 px-4">
        <div className="mx-auto max-w-6xl md:px-8">
          <div className="relative overflow-hidden rounded-3xl p-10 text-white" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #034a3e 100%)" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white opacity-[0.05]" />
            <div className="relative">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-white/70">Máš ubytování?</p>
              <h2 className="mb-1 text-2xl font-extrabold md:text-3xl">Teď najdi práci</h2>
              <p className="mb-7 text-white/70">Stovky sezónních nabídek z Norska přeložených do češtiny.</p>
              <Link href="/prace" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:opacity-90">
                Procházet nabídky práce
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
