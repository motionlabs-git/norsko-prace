import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">Chyba stránky</span>
          </div>
          <h1 className="mb-6 text-7xl md:text-8xl font-extrabold text-[#C8102E]">404</h1>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 max-w-2xl">Stránka nenalezena</h2>
          <p className="mt-3 max-w-xl text-white/70 text-lg leading-relaxed">
            Omlouváme se, ale stránka, kterou hledáš, neexistuje nebo byla přesunuta. Pojď se vrátit na úvod nebo procházet pracovní nabídky v Norsku.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#9e0b21] hover:shadow-xl">
              Zpět na úvod
            </Link>
            <Link href="/prace" className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-8 py-4 text-base font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]">
              Procházet nabídky
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
