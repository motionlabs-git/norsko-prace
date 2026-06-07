export const metadata = {
  title: "Podmínky použití",
  description: "Podmínky použití služby Norsko-práce.cz.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">Právní dokumenty</p>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">Podmínky použití</h1>
          <p className="mt-3 text-sm text-white/60">Poslední aktualizace: 12. 5. 2025</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="prose prose-base max-w-none
            prose-headings:font-extrabold prose-headings:text-[var(--color-text)] prose-headings:tracking-tight
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3
            prose-p:text-[var(--color-text)] prose-p:leading-relaxed
            prose-a:text-[var(--color-primary)] prose-a:no-underline hover:prose-a:underline
            prose-ul:pl-5 prose-li:my-1 prose-li:text-[var(--color-text)]
          ">
            <h2>1. Provozovatel</h2>
            <p>
              Tyto podmínky upravují používání webu <strong>Norsko-práce.cz</strong> provozovaného
              fyzickou nebo právnickou osobou pověřenou provozem (dále jen „provozovatel").
              Kontakt: <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>
            </p>

            <h2>2. Popis služby</h2>
            <p>
              Norsko-práce.cz je informační platforma agregující sezónní pracovní nabídky z norského
              portálu NAV (Arbeidsplassen.no) a Finn.no, přeložené automaticky do češtiny.
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
          </div>
        </div>
      </section>
    </div>
  );
}
