import { buildAlternates } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";
  return {
    title: isCs ? "Podmínky použití" : "Podmienky používania",
    description: isCs
      ? "Podmínky použití služby Norsko-práce.cz."
      : "Podmienky používania služby Norsko-práce.cz.",
    alternates: buildAlternates(locale, "/terms"),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const isCs = locale === "cs";

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero */}
      <section
        className="py-16"
        style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">
            {isCs ? "Právní dokumenty" : "Právne dokumenty"}
          </p>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">
            {isCs ? "Podmínky použití" : "Podmienky používania"}
          </h1>
          <p className="mt-3 text-sm text-white/60">
            {isCs ? "Poslední aktualizace: 12. 5. 2025" : "Posledná aktualizácia: 12. 5. 2025"}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="prose prose-base max-w-none
            prose-headings:font-extrabold prose-headings:text-[var(--color-text)] prose-headings:tracking-tight
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
            prose-p:text-[var(--color-text)] prose-p:leading-relaxed
            prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
            prose-ul:pl-5 prose-li:my-1 prose-li:text-[var(--color-text)]
          ">

          {isCs ? (
            <>
              <h2>1. Provozovatel</h2>
              <p>
                Tyto podmínky upravují používání webu <strong>Norsko-práce.cz</strong> provozovaného
                fyzickou nebo právnickou osobou pověřenou provozem (dále jen „provozovatel").
                Kontakt: <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>
              </p>

              <h2>2. Popis služby</h2>
              <p>
                Norsko-práce.cz je informační platforma agregující sezónní pracovní nabídky z norského
                portálu NAV (Arbeidsplassen.no) a Finn.no, přeložené automaticky do češtiny a slovenštiny.
                Služba slouží výhradně k informačním účelům — nejsme pracovní agentura ani
                zprostředkovatel zaměstnání.
              </p>

              <h2>3. Uživatelský účet</h2>
              <ul>
                <li>Registrací potvrzujete, že jste starší 16 let.</li>
                <li>Jste zodpovědní za bezpečnost svého hesla a aktivitu na svém účtu.</li>
                <li>Jeden uživatel může mít pouze jeden účet.</li>
                <li>Provozovatel si vyhrazuje právo zablokovat účet při porušení těchto podmínek.</li>
              </ul>

              <h2>4. Přesnost informací</h2>
              <p>
                Pracovní nabídky jsou přebírány automaticky z externích zdrojů a překládány strojově.
                Provozovatel <strong>neručí</strong> za aktuálnost, správnost ani úplnost zobrazených
                informací. Před podáním přihlášky vždy ověřte aktuální stav přímo u zaměstnavatele.
              </p>

              <h2>5. Zakázané chování</h2>
              <ul>
                <li>Automatické stahování obsahu (scraping) bez písemného souhlasu</li>
                <li>Vytváření falešných účtů nebo uvádění nepravdivých údajů</li>
                <li>Jakékoliv jednání poškozující provoz nebo reputaci webu</li>
                <li>Používání služby v rozporu s platnými právními předpisy</li>
              </ul>

              <h2>6. Duševní vlastnictví</h2>
              <p>
                Obsah webu (design, překlady, průvodce, texty) je duševním vlastnictvím provozovatele
                nebo je poskytnut na základě licence. Pracovní inzeráty jsou majetkem jejich původních
                autorů (NAV, Finn.no). Kopírování obsahu bez svolení je zakázáno.
              </p>

              <h2>7. Omezení odpovědnosti</h2>
              <p>
                Provozovatel nenese odpovědnost za přímé ani nepřímé škody vzniklé v souvislosti
                s využitím informací z webu, ztrátou zaměstnání, odmítnutím přihlášky ani jinými
                důsledky plynoucími ze sezónní práce v Norsku.
              </p>

              <h2>8. Změny podmínek</h2>
              <p>
                Provozovatel si vyhrazuje právo podmínky kdykoli změnit. O podstatných změnách budou
                registrovaní uživatelé informováni e-mailem. Dalším používáním služby po změně
                vyjadřujete souhlas s aktuálním zněním podmínek.
              </p>

              <h2>9. Rozhodné právo</h2>
              <p>
                Tyto podmínky se řídí právem České republiky. Případné spory budou řešeny
                příslušnými soudy České republiky.
              </p>
            </>
          ) : (
            <>
              <h2>1. Prevádzkovateľ</h2>
              <p>
                Tieto podmienky upravujú používanie webu <strong>Norsko-práce.cz</strong> prevádzkovaného
                fyzickou alebo právnickou osobou poverenou prevádzkou (ďalej len „prevádzkovateľ").
                Kontakt: <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>
              </p>

              <h2>2. Popis služby</h2>
              <p>
                Norsko-práce.cz je informačná platforma agregujúca sezónne pracovné ponuky z nórskeho
                portálu NAV (Arbeidsplassen.no) a Finn.no, preložené automaticky do češtiny a slovenčiny.
                Služba slúži výhradne na informačné účely — nie sme pracovná agentúra ani
                sprostredkovateľ zamestnania.
              </p>

              <h2>3. Používateľský účet</h2>
              <ul>
                <li>Registráciou potvrdzujete, že máte viac ako 16 rokov.</li>
                <li>Ste zodpovední za bezpečnosť svojho hesla a aktivitu na svojom účte.</li>
                <li>Jeden používateľ môže mať iba jeden účet.</li>
                <li>Prevádzkovateľ si vyhradzuje právo zablokovať účet pri porušení týchto podmienok.</li>
              </ul>

              <h2>4. Presnosť informácií</h2>
              <p>
                Pracovné ponuky sú preberané automaticky z externých zdrojov a prekladané strojovo.
                Prevádzkovateľ <strong>nezodpovedá</strong> za aktuálnosť, správnosť ani úplnosť
                zobrazených informácií. Pred podaním prihlášky vždy overte aktuálny stav priamo
                u zamestnávateľa.
              </p>

              <h2>5. Zakázané správanie</h2>
              <ul>
                <li>Automatické sťahovanie obsahu (scraping) bez písomného súhlasu</li>
                <li>Vytváranie falošných účtov alebo uvádzanie nepravdivých údajov</li>
                <li>Akékoľvek konanie poškodzujúce prevádzku alebo reputáciu webu</li>
                <li>Používanie služby v rozpore s platnými právnymi predpismi</li>
              </ul>

              <h2>6. Duševné vlastníctvo</h2>
              <p>
                Obsah webu (dizajn, preklady, sprievodcovia, texty) je duševným vlastníctvom
                prevádzkovateľa alebo je poskytnutý na základe licencie. Pracovné inzeráty sú
                majetkom ich pôvodných autorov (NAV, Finn.no). Kopírovanie obsahu bez súhlasu je zakázané.
              </p>

              <h2>7. Obmedzenie zodpovednosti</h2>
              <p>
                Prevádzkovateľ nezodpovedá za priame ani nepriame škody vzniknuté v súvislosti
                s využitím informácií z webu, stratou zamestnania, odmietnutím prihlášky ani inými
                dôsledkami plynúcimi zo sezónnej práce v Nórsku.
              </p>

              <h2>8. Zmeny podmienok</h2>
              <p>
                Prevádzkovateľ si vyhradzuje právo podmienky kedykoľvek zmeniť. O podstatných zmenách
                budú registrovaní používatelia informovaní e-mailom. Ďalším používaním služby po zmene
                vyjadrujete súhlas s aktuálnym znením podmienok.
              </p>

              <h2>9. Rozhodné právo</h2>
              <p>
                Tieto podmienky sa riadia právom Českej republiky. Prípadné spory budú riešené
                príslušnými súdmi Českej republiky.
              </p>
            </>
          )}
          </div>
        </div>
      </section>
    </div>
  );
}
