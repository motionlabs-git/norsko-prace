import Link from "next/link";
import Image from "next/image";

export const revalidate = 86400;

export const metadata = {
  title: "Můj příběh — kdo stojí za Norsko-práce.cz",
  description:
    "Jmenuju se Jindra, je mi 24 a čtvrtým rokem pracuji v Norsku. Jak jsem se k práci dostal a proč jsem založil Norsko-práce.cz.",
  alternates: { canonical: "https://norsko-prace.cz/o-mne" },
};

/**
 * Místo pro fotku. Až budou soubory, stačí sem dát <Image src="/images/o-mne/…" …>
 * a placeholder smazat — rozměry jsou už nastavené podle poměru stran.
 */
function PhotoPlaceholder({
  label,
  ratio,
  className = "",
}: {
  label: string;
  ratio: "portrait" | "landscape" | "square";
  className?: string;
}) {
  const aspect =
    ratio === "portrait"
      ? "aspect-[4/5]"
      : ratio === "square"
        ? "aspect-square"
        : "aspect-[16/9]";
  return (
    <div
      className={`flex ${aspect} w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] p-6 text-center ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-8 w-8 text-[var(--color-text-muted)]"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <p className="text-sm font-semibold text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]/70">
        {ratio === "portrait"
          ? "poměr 4:5"
          : ratio === "square"
            ? "poměr 1:1"
            : "poměr 16:9"}
      </p>
    </div>
  );
}

const INSTAGRAM_URL = "https://www.instagram.com/jindrisko/";

/**
 * Fotka s poměrem stran a volitelným popiskem.
 * `ratio` odpovídá tomu, co fotka opravdu je — nechceme nic odřezávat,
 * všechny nahrané snímky jsou 4:3 nebo 3:4.
 */
function Photo({
  src,
  alt,
  caption,
  ratio,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 720px",
  objectPosition,
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio: "portrait" | "landscape" | "square";
  priority?: boolean;
  sizes?: string;
  /** Kde v obrázku leží výřez, když se poměr liší od originálu (např. "center 64%") */
  objectPosition?: string;
}) {
  const aspect =
    ratio === "portrait"
      ? "aspect-[3/4]"
      : ratio === "square"
        ? "aspect-square"
        : "aspect-[4/3]";
  return (
    <figure className="m-0">
      <div
        className={`relative ${aspect} w-full overflow-hidden rounded-2xl bg-[var(--color-bg)]`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={objectPosition ? { objectPosition } : undefined}
          className="object-cover"
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-[var(--color-text-muted)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Galerie dole na stránce. Přidání další fotky = soubor do public/images/o-mne/
 * a jeden řádek sem. Prázdný seznam vykreslí místa na fotky.
 */
const GALLERY: { src: string; alt: string }[] = [
  { src: "/images/o-mne/Via_ferrata_Oda.jpeg", alt: "Via ferrata Oda" },
  { src: "/images/o-mne/Ledovec.jpeg", alt: "Ledovec" },
  { src: "/images/o-mne/Vyhled_na_ledovce.jpeg", alt: "Výhled na ledovce" },
  { src: "/images/o-mne/Koupani_ve_vodopadu.jpeg", alt: "Koupání ve vodopádu" },
];

export default function OMnePage() {
  return (
    <div className="bg-[var(--color-bg)]">
      {/* Hero: text vlevo, portrét vpravo */}
      <section
        className="py-16 md:py-20"
        style={{
          background: "linear-gradient(135deg, #001849 0%, #003087 100%)",
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-[1.2fr_1fr] md:px-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
              <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                Můj příběh
              </span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Ahoj, jmenuju se Jindra
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
              Je mi 24 a už čtvrtým rokem pracuji v Norsku. Z počátku pouze jako
              sezonní pracovník, poslední rok jsem tu už na stálo.
            </p>
            <div className="mt-8 border-t border-white/15 pt-6">
              <p className="mb-4 max-w-md text-white/55">
                Jak se člověk z Česka ocitne v Norsku a zůstane tu čtvrtý rok?
                Nic velkolepého za tím není — spíš jedna zpráva, kterou jsem
                tehdy poslal.
              </p>
              <a
                href="#pribeh"
                className="group inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Číst celý příběh
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                  className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a.75.75 0 01.75.75v9.44l3.72-3.72a.75.75 0 111.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 111.06-1.06l3.72 3.72V3.75A.75.75 0 0110 3z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 p-2">
            {/* Poměr 3:4 odpovídá původní fotce, takže se nic neodřízne */}
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/o-mne/uvodni.jpeg"
                alt="Jindra v Norsku"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 420px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Příběh */}
      <section id="pribeh" className="scroll-mt-20 py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] md:text-3xl">
            Jak jsem se k práci dostal?
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Zcela upřímně… velikou náhodou. Po první pracovní zkušenosti ještě v
            Čechách mě napadlo vyzkoušet něco šíleného, pro mě v té době
            nepředstavitelného — zkusit život jinde.
          </p>

          <blockquote className="my-10 border-l-4 border-[#C8102E] pl-6">
            <p className="text-xl font-bold leading-snug text-[var(--color-text)] md:text-2xl">
              Dobře si vzpomínám na ten pocit. Jak začít? Kde práci hledat? Umím
              se vůbec domluvit?
            </p>
          </blockquote>

          <p className="text-lg leading-relaxed text-[var(--color-text-muted)]">
            Naštěstí jsem si v té době vzpomněl na známého, který už za sebou
            pracovní zkušenost v zahraničí měl, a to právě v Norsku. Po
            neúspěchu s agenturou a její prací v Holandsku (nedoporučuji to ani
            zkoušet) jsem napsal právě jemu. Dostal jsem kontakt, napsal jsem
            první zprávu — a po prvních pár měsících jsem věděl, že tady nejsem
            rozhodně naposledy.
          </p>

          <div className="my-12">
            {/* Fotka je na výšku; výřez posunutý dolů (64 %), aby v ležatém formátu
                zůstal vysílač i lidi pod ním */}
            <Photo
              src="/images/o-mne/Floyen_mountain.jpeg"
              alt="Výhled z hory Fløyen nad Bergenem"
              caption="Fløyen nad Bergenem"
              ratio="landscape"
              objectPosition="center 64%"
            />
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] md:text-3xl">
            Proč tenhle web
          </h2>

          <p className="mt-5 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Jelikož jsem se poslední sezónu postaral o nábor nových lidí, viděl
            jsem, jak veliký zájem by o práci právě v Norsku byl. Zároveň vím,
            co to všechno obnáší a jaké jsou rozdíly mezi Norskem a Českem.
          </p>

          <p className="mt-5 text-lg leading-relaxed text-[var(--color-text-muted)]">
            Všechno tohle jsem zabalil do jednoho balíčku a vytvořil platformu,
            která ti zaručí pohodovou práci. Veškeré informace a nástroje jsou
            ti otevřeny.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            <Photo
              src="/images/o-mne/Fonnabu.jpeg"
              alt="Chata Fonnabu v norských horách"
              caption="Fonnabu"
              ratio="portrait"
              sizes="(max-width: 640px) 100vw, 350px"
            />
            <Photo
              src="/images/o-mne/Jezero_pod_Fonnabu.jpeg"
              alt="Bondhusvatnet"
              caption="Bondhusvatnet"
              ratio="portrait"
              sizes="(max-width: 640px) 100vw, 350px"
            />
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section className="border-t border-[var(--color-border)] bg-white py-14">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] md:text-3xl">
            Zasekl ses někde v procesu?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
            Pokud máš s jakýmkoliv krokem problém, napiš mi na e-mail nebo na
            Instagram. Pokusím se ti pomoci.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:info@norsko-prace.cz"
              className="cta-arrow inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-[#9e0b21]"
            >
              Napsat e-mail
            </a>
            {/* TODO: doplnit skutečný odkaz na Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-7 py-3.5 text-base font-medium text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.053 1.805.249 2.227.415.562.218.96.479 1.382.9.422.422.682.82.9 1.382.166.422.362 1.057.415 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.053 1.17-.249 1.805-.415 2.227-.218.562-.479.96-.9 1.382-.422.422-.82.682-1.382.9-.422.166-1.057.362-2.227.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.053-1.805-.249-2.227-.415-.562-.218-.96-.479-1.382-.9-.422-.422-.682-.82-.9-1.382-.166-.422-.362-1.057-.415-2.227C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.053-1.17.249-1.805.415-2.227.218-.562.479-.96.9-1.382.422-.422.82-.682 1.382-.9.422-.166 1.057-.362 2.227-.415C8.416 2.175 8.796 2.163 12 2.163zm0 5.675a4.162 4.162 0 100 8.324 4.162 4.162 0 000-8.324zm0 6.863a2.701 2.701 0 110-5.402 2.701 2.701 0 010 5.402zm5.3-7.025a.972.972 0 11-1.944 0 .972.972 0 011.944 0z" />
              </svg>
              Instagram
            </a>
          </div>
          <p className="mt-10 text-sm text-[var(--color-text-muted)]">
            Nebo se rovnou podívej na{" "}
            <Link
              href="/prace"
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              aktuální nabídky práce
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Galerie z ručně vybraných fotek (viz GALLERY) + odkaz na sítě.
          Automatické tahání z Instagramu jsme zavrhli: Meta API má tokeny s šedesátidenní
          platností, které je potřeba hlídat, a za to tahle sekce nestojí. */}
      <section className="border-t border-[var(--color-border)] py-14">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fde8ec] px-3.5 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C8102E]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#C8102E]">
                  Instagram
                </span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] md:text-3xl">
                Jak to v Norsku vypadá
              </h2>
              <p className="mt-2 max-w-xl text-[var(--color-text-muted)]">
                Fotky z výletů po Norsku. Více najdeš u mě na instagramu.
              </p>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-semibold text-[var(--color-primary)] hover:underline"
            >
              Sledovat na Instagramu →
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GALLERY.length > 0
              ? GALLERY.map((photo) => (
                  <div
                    key={photo.src}
                    className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--color-bg)]"
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 640px) 50vw, 280px"
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ))
              : Array.from({ length: 6 }, (_, i) => (
                  <PhotoPlaceholder
                    key={i}
                    label={`Fotka ${i + 1}`}
                    ratio="square"
                  />
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}
