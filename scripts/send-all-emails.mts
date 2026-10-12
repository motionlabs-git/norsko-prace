/**
 * Pošle na zadanou adresu všechny e-maily, které služba odesílá — ke kontrole,
 * jak vypadají ve skutečné schránce (náhled v prohlížeči se od Gmailu i Seznamu liší).
 *
 * Spuštění: npx tsx scripts/send-all-emails.mts tvuj@email.cz
 */
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const to = process.argv[2];
if (!to) { console.error("Zadej adresu: npx tsx scripts/send-all-emails.mts tvuj@email.cz"); process.exit(1); }
if (!process.env.RESEND_API_KEY) { console.error("Chybí RESEND_API_KEY v .env.local"); process.exit(1); }

const { sendEmail, welcomeEmail, cancellationEmail, announcementEmail, signupConfirmationTemplate } =
  await import("@/lib/email");

const SITE = "https://norsko-prace.cz";

// Potvrzení registrace posílá Supabase ze své šablony, ne náš kód. Pro kontrolu
// ho složíme ručně a zástupnou značku nahradíme ukázkovým odkazem.
const confirmHtml = signupConfirmationTemplate().replace(/\{\{ \.ConfirmationURL \}\}/g, `${SITE}/auth/callback?code=UKAZKA`);

const messages = [
  {
    popis: "1/4 Potvrzení registrace (šablona pro Supabase)",
    msg: {
      to,
      subject: "Potvrď svůj e-mail — Norsko-práce.cz",
      html: confirmHtml,
      text: `Vítej na Norsko-práce.cz. Potvrď prosím svůj e-mail: ${SITE}/auth/callback?code=UKAZKA`,
    },
  },
  { popis: "2/4 Potvrzení platby (Premium)", msg: welcomeEmail(to, "premium") },
  { popis: "3/4 Zrušení předplatného", msg: cancellationEmail(to, "2026-11-16T13:50:03.000Z") },
  {
    popis: "4/4 Rozesílka novinek (aktuální znění)",
    msg: announcementEmail(to, {
      subject: "Něco o mně",
      headline: "Tohle není nabídka práce",
      intro:
        "Ahoj, většinou ti píšu, když na webu přibyly nové nabídky. Dneska ne. Přidal jsem tam stránku o sobě — kdo za Norsko-práce.cz stojí, jak jsem se do Norska vůbec dostal a proč mě napadlo tohle dělat. Je to na pár minut čtení a je u toho i pár fotek z hor.",
      items: [],
      ctaLabel: "Přečíst →",
      ctaUrl: `${SITE}/o-mne`,
      unsubscribeUrl: `${SITE}/odhlasit`,
      heroImage: "email-header-pribeh.jpg",
    }),
  },
];

for (const { popis, msg } of messages) {
  try {
    await sendEmail(msg);
    console.log(`✅ ${popis} — „${msg.subject}"`);
  } catch (err) {
    console.log(`❌ ${popis} — ${err instanceof Error ? err.message : err}`);
  }
  // Resend má limit na počet požadavků za sekundu
  await new Promise((r) => setTimeout(r, 700));
}
console.log(`\nVšechno odesláno na ${to}. Zkontroluj i složku s nevyžádanou poštou.`);
