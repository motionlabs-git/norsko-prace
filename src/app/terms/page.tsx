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
              fyzickou nebo právnickou osobou pověřenou provozem (dále jen „provozovatel“).
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

            <h2>5. Předplatné Premium</h2>
            <p>
              Základní obsah webu (inzeráty včetně popisu pozice, blog, průvodce) je zdarma. Předplatné
              <strong> Founding Premium</strong> odemyká kontaktní údaje zaměstnavatele a odkaz na přihlášení
              u všech inzerátů a sekci „Vybrané práce“. Registrovaný uživatel bez předplatného uvidí kontakt
              a odkaz na přihlášení zdarma u prvních 10 inzerátů, jejichž detail otevře; otevřením detailu
              se jeden z těchto kontaktů čerpá. Opakované otevření téhož inzerátu limit znovu nečerpá.
            </p>
            <ul>
              <li><strong>Founding Premium</strong> — 149 Kč / měsíc; cena zůstává zamčená po celou dobu
                nepřerušeného trvání předplatného</li>
            </ul>
            <p>
              Funkce, které web označuje jako připravované, nejsou součástí předplatného, dokud nejsou
              spuštěny.
            </p>
            <p>
              Uvedená cena je konečná částka, kterou zaplatíš. Předplatné se <strong>automaticky obnovuje</strong> vždy
              na další měsíc, dokud jej nezrušíš. Platby zpracovává{" "}
              <strong>Stripe Payments Europe, Ltd.</strong>; údaje o platební kartě zadáváš přímo
              u Stripe a provozovatel k nim nemá přístup.
            </p>
            <p>
              <strong>Zrušení:</strong> předplatné můžeš kdykoli zrušit ve svém profilu (Spravovat
              předplatné). Zrušení je účinné ke konci již zaplaceného období — přístup ti zůstává
              do jeho konce a další platba se neprovede.
            </p>
            <p>
              <strong>Odstoupení od smlouvy:</strong> jako spotřebitel máš právo odstoupit od smlouvy
              do 14 dnů. Aktivací předplatného výslovně žádáš o okamžité zpřístupnění digitálního
              obsahu a bereš na vědomí, že tím právo na odstoupení zaniká. Pokud přesto do 14 dnů od
              první platby odstoupíš a služby jsi využil jen v zanedbatelném rozsahu, vrátíme ti
              uhrazenou částku — napiš na{" "}
              <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>.
            </p>
            <p>
              Provozovatel si vyhrazuje právo měnit ceny nově sjednaných předplatných. Cena Founding
              Premium se po dobu nepřerušeného trvání předplatného nemění.
            </p>

            <h2>6. Zakázané chování</h2>
            <ul>
              <li>Automatické stahování obsahu (scraping) bez písemného souhlasu</li>
              <li>Vytváření falešných účtů nebo uvádění nepravdivých údajů</li>
              <li>Jakékoliv jednání poškozující provoz nebo reputaci webu</li>
              <li>Používání služby v rozporu s platnými právními předpisy</li>
            </ul>

            <h2>7. Duševní vlastnictví</h2>
            <p>
              Obsah webu (design, překlady, průvodce, texty) je duševním vlastnictvím provozovatele
              nebo je poskytnut na základě licence. Pracovní inzeráty jsou majetkem jejich původních
              autorů (NAV, Finn.no). Kopírování obsahu bez svolení je zakázáno.
            </p>

            <h2>8. Omezení odpovědnosti</h2>
            <p>
              Provozovatel nenese odpovědnost za přímé ani nepřímé škody vzniklé v souvislosti
              s využitím informací z webu, ztrátou zaměstnání, odmítnutím přihlášky ani jinými
              důsledky plynoucími ze sezónní práce v Norsku.
            </p>

            <h2>9. Změny podmínek</h2>
            <p>
              Provozovatel si vyhrazuje právo podmínky kdykoli změnit. O podstatných změnách budou
              registrovaní uživatelé informováni e-mailem. Dalším používáním služby po změně
              vyjadřujete souhlas s aktuálním zněním podmínek.
            </p>

            <h2>10. Rozhodné právo</h2>
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
