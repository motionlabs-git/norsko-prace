import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer
      style={{ background: "#0d1117" }}
      className="mt-0 border-t border-white/10"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Image
                src="/images/norsko-prace-logo-dark.svg"
                alt="NorskoPráce"
                width={163}
                height={32}
              />
            </div>
            <p className="text-sm text-white/45 leading-relaxed">
              {t("description")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
              Navigace
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/prace" className="text-sm text-white/60 hover:text-white transition-colors">
                  {nav("jobs")}
                </Link>
              </li>
              <li>
                <Link href="/vybrane" className="text-sm text-white/60 hover:text-white transition-colors">
                  {nav("selected")}
                </Link>
              </li>
              <li>
                <Link href="/ubytovani" className="text-sm text-white/60 hover:text-white transition-colors">
                  {nav("accommodation")}
                </Link>
              </li>
              <li>
                <Link href="/pruvodce" className="text-sm text-white/60 hover:text-white transition-colors">
                  {nav("guides")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm text-white/60 hover:text-white transition-colors">
                  {nav("blog")}
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">
              Hledáš práci?
            </h3>
            <p className="text-sm text-white/50 mb-4 leading-relaxed">
              Stovky sezónních nabídek v češtině — aktualizováno každý den.
            </p>
            <Link
              href="/prace"
              className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#9e0b21] transition"
            >
              Procházet inzeráty →
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} NorskoPráce. {t("rights")}.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              GDPR
            </Link>
            <Link
              href="/terms"
              className="text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              Podmínky použití
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
              <span className="text-xs text-white/25">Norsko-práce.cz</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
