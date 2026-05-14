import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const locale = await getLocale();
  const isCs = locale === "cs";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero Section */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-sm border border-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">
              {isCs ? "Chyba stránky" : "Chyba stránky"}
            </span>
          </div>

          <h1 className="mb-6 text-7xl md:text-8xl font-extrabold text-[#C8102E]">
            404
          </h1>

          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 max-w-2xl">
            {isCs
              ? "Stránka nenalezena"
              : "Stránka sa nenašla"}
          </h2>

          <p className="mt-3 max-w-xl text-white/70 text-lg leading-relaxed">
            {isCs
              ? "Omlouváme se, ale stránka, kterou hledáš, neexistuje nebo byla přesunuta. Pojď se vrátit na úvod nebo procházet pracovní nabídky v Norsku."
              : "Ospravedlňujeme sa, ale stránka, ktorú hľadáš, neexistuje alebo bola presunutá. Choď sa vrátiť na úvod alebo prechádzaj pracovné ponuky v Nórsku."}
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-8 py-4 text-base font-bold text-white shadow-lg transition hover:bg-[#9e0b21] hover:shadow-xl"
            >
              {isCs ? "Zpět na úvod" : "Späť na úvod"}
            </Link>
            <Link
              href="/prace"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {isCs ? "Procházet nabídky" : "Prehliadať ponuky"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
