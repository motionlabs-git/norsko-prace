export const metadata = {
  title: "Zásady ochrany osobních údajů",
  description: "Informace o zpracování osobních údajů na NorskoPráce.cz.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="py-16" style={{ background: "linear-gradient(135deg, #001849 0%, #003087 100%)" }}>
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">Právní dokumenty</p>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">Zásady ochrany osobních údajů</h1>
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
            <h2>1. Správce osobních údajů</h2>
            <p>
              Provozovatel webu <strong>Norsko-práce.cz</strong> (dále jen „provozovatel") je správcem
              osobních údajů ve smyslu nařízení GDPR (EU) 2016/679. Kontakt:&nbsp;
              <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>
            </p>

            <h2>2. Jaké údaje zpracováváme</h2>
            <ul>
              <li><strong>E-mailová adresa</strong> — povinná pro vytvoření účtu</li>
              <li><strong>Jméno</strong> — volitelné, zadané při registraci</li>
              <li><strong>Technické údaje</strong> — IP adresa, typ prohlížeče, datum přístupu (logy serveru)</li>
            </ul>
            <p>Nezpracováváme žádné citlivé osobní údaje (zdravotní stav, politické názory apod.).</p>

            <h2>3. Účel a právní základ zpracování</h2>
            <ul>
              <li><strong>Správa uživatelského účtu</strong> — plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR)</li>
              <li><strong>Zasílání potvrzovacích a systémových e-mailů</strong> — plnění smlouvy</li>
              <li><strong>Bezpečnost a prevence zneužití</strong> — oprávněný zájem provozovatele (čl. 6 odst. 1 písm. f) GDPR)</li>
            </ul>
            <p>Vaše údaje <strong>neprodáváme</strong> ani nesdílíme s třetími stranami za marketingovými účely.</p>

            <h2>4. Doba uložení</h2>
            <p>
              Osobní údaje uchováváme po dobu existence vašeho účtu. Po smazání účtu jsou údaje
              odstraněny do 30 dnů, s výjimkou anonymizovaných statistických dat a záznamů
              vyžadovaných zákonem.
            </p>

            <h2>5. Příjemci údajů (zpracovatelé)</h2>
            <ul>
              <li><strong>Supabase Inc.</strong> — databáze a autentizace (EU region)</li>
              <li><strong>Vercel Inc.</strong> — hosting (EU region)</li>
              <li><strong>Resend Inc.</strong> — odesílání e-mailů</li>
            </ul>
            <p>Všichni zpracovatelé jsou smluvně zavázáni k ochraně vašich dat a splňují požadavky GDPR.</p>

            <h2>6. Vaše práva</h2>
            <ul>
              <li><strong>Přístup</strong> — právo získat informace o zpracovávání vašich údajů</li>
              <li><strong>Oprava</strong> — právo na opravu nepřesných údajů</li>
              <li><strong>Výmaz</strong> — právo na smazání účtu a osobních údajů</li>
              <li><strong>Přenositelnost</strong> — právo obdržet své údaje ve strojově čitelném formátu</li>
              <li><strong>Námitka</strong> — právo vznést námitku proti zpracování na základě oprávněného zájmu</li>
            </ul>
            <p>
              Svá práva uplatněte e-mailem na{" "}
              <a href="mailto:info@norsko-prace.cz">info@norsko-prace.cz</a>.
              Rovněž máte právo podat stížnost u Úřadu pro ochranu osobních údajů (
              <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer">uoou.cz</a>).
            </p>

            <h2>7. Soubory cookie</h2>
            <p>
              Web používá technicky nezbytné soubory cookie pro autentizaci (relační cookie Supabase).
              Analytické ani marketingové cookies nepoužíváme.
            </p>

            <h2>8. Změny zásad</h2>
            <p>
              O podstatných změnách vás budeme informovat e-mailem nebo upozorněním na webu.
              Pokračováním v používání služby po aktualizaci vyjadřujete souhlas s novými zásadami.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
