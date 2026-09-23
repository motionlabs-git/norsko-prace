import Link from "next/link";

// noindex přidává Next u not-found sám — vlastní robots by jen zdvojil meta tag
export const metadata = { title: "Stránka nenalezena" };

// Nejčastější cesta sem není překlep v adrese, ale vypršelý inzerát — NAV je po uzávěrce
// stahuje a my je deaktivujeme. Text i odkazy proto míří na „najdi si jiný", ne na omluvu.
const LINKS = [
  { href: "/prace", icon: "🌱", title: "Sezónní práce", desc: "Brigády a sezóny napříč Norskem" },
  { href: "/stale-pozice", icon: "🔧", title: "Stálé pozice", desc: "Trvalé úvazky pro řemeslníky" },
  { href: "/ubytovani", icon: "🏠", title: "Ubytování", desc: "Nabídky, kde bydlení zajistí zaměstnavatel" },
  { href: "/pruvodce", icon: "🧭", title: "Průvodce", desc: "D-number, BankID, daně a první kroky" },
];

export default function NotFound() {
  return (
    <div className="bg-[var(--color-bg)]">
      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:px-8 md:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Chyba 404
          </span>
        </span>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-4xl md:text-5xl">
          Tuhle stránku jsme nenašli
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-muted)]">
          Nejspíš už vypršela lhůta u inzerátu, na který míříš — norský úřad práce nabídky po
          uzávěrce stahuje a my je pak přestáváme zobrazovat. Podobných je ale spousta dalších.
        </p>

        {/* Bez JavaScriptu: prostý GET na výpis nabídek */}
        <form
          action="/prace"
          method="get"
          role="search"
          className="mt-8 flex w-full max-w-md items-center gap-2 rounded-full bg-white p-1.5 shadow-[var(--shadow-md)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-3 h-5 w-5 flex-shrink-0 text-[var(--color-text-muted)]"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            name="q"
            maxLength={80}
            placeholder="Kuchař, svářeč, Tromsø…"
            aria-label="Hledat v nabídkách"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            className="flex-shrink-0 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Hledat
          </button>
        </form>

        <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-bg)] text-lg">
                {l.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">
                  {l.title}
                </span>
                <span className="block text-xs text-[var(--color-text-muted)]">{l.desc}</span>
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-auto h-4 w-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
                aria-hidden
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-[var(--color-text-muted)]">
          Nebo se vrať{" "}
          <Link href="/" className="font-semibold text-[var(--color-primary)] hover:underline">
            na úvodní stránku
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
