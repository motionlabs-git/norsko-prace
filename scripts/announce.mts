/**
 * Rozesílka novinek uživatelům — náhled, test, import kontaktů a příprava rozesílky.
 *
 *   npx tsx scripts/announce.mts --preview              → vykreslí HTML do email-preview.html
 *   npx tsx scripts/announce.mts --test tvuj@email.cz   → pošle jeden testovací e-mail
 *   npx tsx scripts/announce.mts --contacts             → nahraje uživatele ze Supabase do Resendu
 *   npx tsx scripts/announce.mts --broadcast <segmentId> → založí rozesílku jako KONCEPT
 *
 * Rozesílku samotnou nespouští — odešleš ji až po kontrole v Resendu.
 * Obsah e-mailu se upravuje dole v konstantě ANNOUNCEMENT.
 */
import fs from "node:fs";
// Typ staticky (za běhu se maže), hodnoty až po načtení .env.local — email.ts čte EMAIL_FROM při importu
import type { Announcement } from "@/lib/email";

for (const line of fs.readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const { announcementEmail } = await import("@/lib/email");

const SITE = "https://norsko-prace.cz";

// ── Obsah rozesílek ──────────────────────────────────────────────────────────
// Píšeme z pohledu čtenáře: co s tím může udělat, ne co jsme naprogramovali.
// Novou rozesílku přidej jako další položku a přepni ACTIVE níž.

const ANNOUNCEMENTS = {
  "stale-pozice": {
    subject: "Novinka: stálé pozice v Norsku pro řemeslníky",
    headline: "Nově i práce na stálo",
    intro:
      "Dosud jsi u nás našel jen sezónní nabídky. Od teď přidáváme i trvalé úvazky pro řemeslníky — a rovnou několik dalších věcí, které hledání usnadní.",
    items: [
      {
        title: "Stálé pozice",
        text:
          "Elektrikáři, svářeči, mechanici, instalatéři a řidiči. Trvalý úvazek, každý obor má vlastní stránku a u nabídek je vidět, jestli zaměstnavatel vyžaduje norštinu.",
        href: `${SITE}/stale-pozice`,
        hrefLabel: "Prohlédnout stálé pozice",
      },
      {
        title: "Vyhledávání podle klíčových slov",
        text:
          "Napiš „kuchař“, „sklad“ nebo třeba „Tromsø“ a uvidíš jen nabídky, které sedí. Funguje i bez diakritiky.",
        href: `${SITE}/prace`,
        hrefLabel: "Zkusit hledání",
      },
      {
        title: "Filtr podle termínu",
        text:
          "Zadáš, odkdy dokdy chceš v Norsku být, a my vybereme nabídky, které se do tvého termínu vejdou.",
      },
      {
        title: "Jen aktuální nabídky",
        text:
          "Pročistili jsme databázi a zrychlili napojení na norský úřad práce. Inzeráty po lhůtě už se nezobrazují.",
      },
    ],
    ctaLabel: "Prohlédnout nabídky →",
    ctaUrl: `${SITE}/prace`,
    outro:
      "Chybí ti nějaký obor nebo něco nefunguje, jak by mělo? Odepiš na tento e-mail — čteme každou zprávu.",
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
  },

  // A — krátký dopis. Žádné dlaždice, jen pár vět a odkaz.
  "pribeh-dopis": {
    subject: "Něco o mně",
    headline: "Tohle není nabídka práce",
    intro:
      "Ahoj, většinou ti píšu, když na webu přibyly nové nabídky. Dneska ne. Přidal jsem tam stránku o sobě — kdo za Norsko-práce.cz stojí, jak jsem se do Norska vůbec dostal a proč mě napadlo tohle dělat. Je to na pár minut čtení a je u toho i pár fotek z hor.",
    items: [],
    ctaLabel: "Přečíst →",
    ctaUrl: `${SITE}/o-mne`,
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    heroImage: "email-header-pribeh.jpg",
  },

  // B — vypráví a končí v nejlepším; na web se jde dočíst zbytek.
  "pribeh-zprava": {
    subject: "Před čtyřmi roky jsem poslal jednu zprávu",
    headline: "Před čtyřmi roky jsem poslal jednu zprávu",
    intro:
      "Měl jsem za sebou nepovedenou zkušenost s agenturou, norsky jsem neuměl ani slovo a netušil jsem, kde začít. Pak jsem si vzpomněl na známého, který v Norsku pracoval, a napsal mu. Po pár měsících jsem věděl, že tady nejsem naposledy — a dneska je to čtvrtý rok.",
    items: [],
    ctaLabel: "Jak to dopadlo →",
    ctaUrl: `${SITE}/o-mne`,
    outro:
      "Sepsal jsem to celé na web, i s tím, proč jsem Norsko-práce.cz vlastně založil. Máš otázku? Odepiš, rád poradím.",
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    heroImage: "email-header-pribeh.jpg",
  },

  "muj-pribeh": {
    subject: "Kdo za Norsko-práce.cz vlastně stojí",
    headline: "Konečně jsem o sobě něco napsal",
    intro:
      "Většinu e-mailů ode mě dostáváš o nabídkách práce. Tenhle je jiný. Často se mě ptáte, kdo web vlastně dělá a jestli za ním nestojí agentura — tak jsem o tom sepsal stránku.",
    items: [
      {
        title: "Jmenuju se Jindra a v Norsku jsem čtvrtým rokem",
        text:
          "Nejdřív sezónně, teď na stálo. Dostal jsem se sem velkou náhodou — po nepovedené zkušenosti s agenturou a jedné zprávě známému, který tu už pracoval.",
      },
      {
        title: "Proč tenhle web vznikl",
        text:
          "Loni jsem měl na starost nábor nových lidí a viděl jsem, kolik Čechů a Slováků by se sem chtělo podívat. Většina se zasekne na tom, že neví, kde začít.",
      },
      {
        title: "A pár fotek z Norska",
        text:
          "Fonnabu, Bondhusvatnet, ledovce i via ferrata. Protože tohle je ta druhá polovina toho, proč tu člověk zůstane.",
      },
    ],
    ctaLabel: "Přečíst můj příběh →",
    ctaUrl: `${SITE}/o-mne`,
    outro:
      "Zasekl ses někde v procesu, nebo tě něco zajímá? Napiš mi — stačí odpovědět na tento e-mail.",
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    heroImage: "email-header-pribeh.jpg",
  },
} satisfies Record<string, Announcement>;

/** Která rozesílka se právě připravuje — náhled, test i koncept berou tuhle. */
const ACTIVE: keyof typeof ANNOUNCEMENTS = "pribeh-dopis";
const ANNOUNCEMENT: Announcement = ANNOUNCEMENTS[ACTIVE];

// ── Režimy ───────────────────────────────────────────────────────────────────
const [mode, arg] = process.argv.slice(2);
const key = process.env.RESEND_API_KEY;

if (mode === "--preview") {
  const msg = announcementEmail("nahled@example.com", { ...ANNOUNCEMENT, unsubscribeUrl: `${SITE}/odhlasit` });
  fs.writeFileSync("email-preview.html", msg.html);
  fs.writeFileSync("email-preview.txt", msg.text);
  console.log(`Předmět: ${msg.subject}`);
  console.log("HTML:  email-preview.html  (otevři v prohlížeči)");
  console.log("Text:  email-preview.txt   (verze pro klienty bez HTML)");
} else if (mode === "--test") {
  if (!arg) { console.error("Zadej adresu: --test tvuj@email.cz"); process.exit(1); }
  const { sendEmail } = await import("@/lib/email");
  await sendEmail(announcementEmail(arg, { ...ANNOUNCEMENT, unsubscribeUrl: `${SITE}/odhlasit` }));
  console.log(`✅ testovací e-mail odeslán na ${arg}`);
} else if (mode === "--list") {
  const { marketingRecipients } = await import("@/lib/marketing");
  const { recipients, skipped } = await marketingRecipients();
  console.log(`příjemců: ${recipients.length}`);
  console.log(`přeskočeno: ${skipped.unconfirmed} bez potvrzené adresy, ${skipped.optedOut} odhlášených`);
  for (const r of recipients.slice(0, 5)) console.log("  ", r.email);
  if (recipients.length > 5) console.log(`   … a dalších ${recipients.length - 5}`);
} else if (mode === "--send") {
  if (!key) { console.error("Chybí RESEND_API_KEY"); process.exit(1); }
  if (arg !== "potvrzuji") {
    console.error("Rozesílka se spouští takto:  --send potvrzuji");
    console.error("(pojistka proti nechtěnému odeslání stovce lidí)");
    process.exit(1);
  }

  const { marketingRecipients } = await import("@/lib/marketing");
  const { recipients, skipped } = await marketingRecipients();
  console.log(`odesílám „${ANNOUNCEMENT.subject}" na ${recipients.length} adres`);
  console.log(`(přeskočeno ${skipped.unconfirmed} nepotvrzených, ${skipped.optedOut} odhlášených)\n`);

  const FROM = process.env.EMAIL_FROM ?? "Norsko-práce.cz <info@norsko-prace.cz>";
  let sent = 0;
  // Resend přijímá nejvýš 100 zpráv v jednom dávkovém volání
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const payload = chunk.map((r) => {
      // Každý příjemce dostane vlastní odhlašovací odkaz se svým podpisem
      const msg = announcementEmail(r.email, { ...ANNOUNCEMENT, unsubscribeUrl: r.unsubscribeUrl });
      return { from: FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, headers: msg.headers };
    });
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`dávka ${i / 100 + 1} selhala: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
      process.exit(1);
    }
    sent += chunk.length;
    console.log(`  odesláno ${sent}/${recipients.length}`);
  }
  console.log("\n✅ hotovo");
} else {
  console.log(`Použití:
  npx tsx scripts/announce.mts --preview            náhled do email-preview.html
  npx tsx scripts/announce.mts --test tvuj@email.cz jeden testovací e-mail
  npx tsx scripts/announce.mts --list               komu by rozesílka šla
  npx tsx scripts/announce.mts --send potvrzuji     ostrá rozesílka`);
}
