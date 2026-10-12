import { Resend } from "resend";

// Transakční e-maily k předplatnému (Resend). Bez RESEND_API_KEY se nic neodešle —
// jen varování v logu, aby chybějící konfigurace neshodila webhook.

const SITE = "https://norsko-prace.cz";
// Obrázky v e-mailu musí být na veřejné adrese, která přežije i nasazení webu —
// odeslané zprávy zůstávají ve schránkách roky. Proto veřejný bucket v Supabase
// (naplní ho scripts/upload-email-assets.mts). EMAIL_ASSET_BASE to případně přebije.
const STORAGE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/email-assets`
  : SITE;
const ASSETS = process.env.EMAIL_ASSET_BASE ?? STORAGE;
const FROM = process.env.EMAIL_FROM ?? "Norsko-práce.cz <info@norsko-prace.cz>";
const REPLY_TO = "info@norsko-prace.cz";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Např. List-Unsubscribe u hromadných e-mailů */
  headers?: Record<string, string>;
}

let client: Resend | null = null;

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`E-mail „${msg.subject}" neodeslán: chybí RESEND_API_KEY`);
    return;
  }
  client ??= new Resend(key);
  const { error } = await client.emails.send({ from: FROM, replyTo: REPLY_TO, ...msg });
  if (error) throw new Error(`Resend: ${error.message}`);
}

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Dlaždice se seznamem — jeden vzhled pro novinky i výhody předplatného. */
function cards(items: { title: string; text: string; href?: string; hrefLabel?: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items
    .map(
      (i) => `<tr><td style="padding:0 0 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafaf8;border-radius:14px">
<tr><td style="padding:16px 18px">
<p style="margin:0 0 5px;font-size:15px;font-weight:800;color:#1c1c1c">${esc(i.title)}</p>
<p style="margin:0;font-size:14px;line-height:1.65;color:#4b5563">${esc(i.text)}</p>
${
  i.href
    ? `<p style="margin:10px 0 0"><a href="${esc(i.href)}" style="font-size:14px;font-weight:700;color:#046353;text-decoration:none">${esc(i.hrefLabel ?? "Vyzkoušet")} →</a></p>`
    : ""
}
</td></tr></table></td></tr>`
    )
    .join("")}</table>`;
}

const tierLabel = (tier: string | null) => (tier === "premium_plus" ? "Premium Plus" : "Premium");

interface LayoutOptions {
  /** Absolutní URL hlavičkové fotky (600 px na šířku po zobrazení) */
  heroUrl?: string;
  /** Skrytý text, který klienti ukazují vedle předmětu ve schránce */
  preheader?: string;
  /** Patička pod kartou — u hromadných e-mailů odhlašovací odkaz */
  footerHtml?: string;
}

// E-mailové klienty umí jen tabulkový layout a inline styly; SVG ani moderní CSS ne.
// Obrázky musí být na absolutní adrese — proto public/images/email-*.{png,jpg}.
function layout(title: string, bodyHtml: string, opts: LayoutOptions = {}): string {
  const { heroUrl, preheader, footerHtml = "" } = opts;
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f1f0ec;font-family:Manrope,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1c1c;-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f0ec;padding:32px 12px"><tr><td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="padding:22px 28px 18px">
<img src="${ASSETS}/images/email-logo.png" width="200" height="39" alt="Norsko-práce.cz" style="display:block;border:0;outline:none;width:200px;height:auto">
</td></tr>
${heroUrl ? `<tr><td style="font-size:0;line-height:0"><img src="${heroUrl}" width="600" alt="" style="display:block;border:0;outline:none;width:100%;max-width:600px;height:auto"></td></tr>` : ""}
<tr><td style="padding:30px 28px 8px">
<h1 style="margin:0 0 16px;font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-0.4px;color:#1c1c1c">${title}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:24px 28px 26px">
<div style="border-top:1px solid #ececec;padding-top:18px;font-size:13px;line-height:1.6;color:#6b7280">
Tým Norsko-práce.cz
</div>
</td></tr></table>

${footerHtml}
</td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#C8102E;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1;padding:15px 28px;border-radius:9999px">${label}</a>`;

/** Poděkování po aktivaci předplatného. */
export function welcomeEmail(to: string, tier: string | null): EmailMessage {
  const name = tierLabel(tier);
  const perkCards = [
    {
      title: "Kontakty na zaměstnavatele",
      text: "U každé nabídky uvidíš e-mail, telefon nebo odkaz na přihlášení — bez hledání po norských stránkách.",
      href: `${SITE}/prace`,
      hrefLabel: "Otevřít nabídky",
    },
    {
      title: "Vybrané inzeráty",
      text: "Ručně procházené nabídky, u kterých zaměstnavatel často řeší i ubytování.",
      href: `${SITE}/vybrane`,
      hrefLabel: "Zobrazit vybrané",
    },
    ...(tier === "premium_plus"
      ? [{ title: "Prioritní podpora", text: "Odepiš na tenhle e-mail, kdykoli budeš potřebovat poradit." }]
      : []),
  ];
  const perks = perkCards.map((c) => `${c.title} — ${c.text}`);
  return {
    to,
    subject: `Díky! Tvoje ${name} je aktivní 🎉`,
    text: [
      `Ahoj,`,
      ``,
      `díky, že sis aktivoval(a) ${name}. Moc si toho vážíme — pomáháš nám udržovat nabídky aktuální a přeložené.`,
      ``,
      `Co máš teď odemčené:`,
      ...perks.map((p) => `- ${p}`),
      ``,
      `Prohlédnout nabídky: ${SITE}/prace`,
      `Tip: v přehledu nahoře vyber „Kdy chceš jet?" a uvidíš nabídky pro svůj termín.`,
      ``,
      `Předplatné spravuješ nebo zrušíš kdykoli v profilu: ${SITE}/profil`,
      ``,
      `Máš dotaz? Stačí odpovědět na tento e-mail.`,
      `Tým Norsko-práce.cz`,
    ].join("\n"),
    html: layout(
      `Díky! Tvoje ${name} je aktivní 🎉`,
      `<p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#374151">Moc si toho vážíme — pomáháš nám udržovat nabídky aktuální a přeložené.</p>
${cards(perkCards)}
<p style="margin:18px 0 22px">${button(`${SITE}/prace`, "Prohlédnout nabídky →")}</p>
<p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#4b5563">Tip: v přehledu nahoře vyber <strong>„Kdy chceš jet?"</strong> a uvidíš nabídky pro svůj termín.</p>
<p style="margin:0;font-size:14px;line-height:1.65;color:#4b5563">Předplatné spravuješ nebo zrušíš kdykoli <a href="${SITE}/profil" style="color:#046353;font-weight:600">v profilu</a>.</p>`,
      { heroUrl: `${ASSETS}/images/email-header.jpg`, preheader: `${name} je aktivní — kontakty na zaměstnavatele máš odemčené.` }
    ),
  };
}

/** Potvrzení, že zákazník předplatné zrušil (přístup trvá do konce zaplaceného období). */
export function cancellationEmail(to: string, periodEnd: string | null): EmailMessage {
  const until = periodEnd
    ? new Date(periodEnd).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const access = until ? `Premium ti zůstává až do ${until}` : "Premium ti zůstává do konce zaplaceného období";
  return {
    to,
    subject: "Předplatné je zrušené — přístup ti zatím zůstává",
    text: [
      `Ahoj,`,
      ``,
      `potvrzujeme zrušení tvého předplatného. ${access}, další platba už neproběhne.`,
      ``,
      `Rozmyslel(a) sis to? Do konce období ho obnovíš jedním klikem v profilu: ${SITE}/profil`,
      ``,
      `Budeme rádi, když nám odpovědí na tento e-mail napíšeš, co ti chybělo. Každou zpětnou vazbu čteme.`,
      ``,
      `Tým Norsko-práce.cz`,
    ].join("\n"),
    html: layout(
      "Předplatné je zrušené",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Potvrzujeme zrušení tvého předplatného. <strong>${access}</strong>, další platba už neproběhne.</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6">Rozmyslel(a) sis to? Do konce období ho obnovíš jedním klikem v profilu.</p>
<p style="margin:0 0 22px">${button(`${SITE}/profil`, "Otevřít profil")}</p>
<p style="margin:0;font-size:14px;line-height:1.65;color:#4b5563">Budeme rádi, když nám odpovědí na tento e-mail napíšeš, co ti chybělo. Každou zpětnou vazbu čteme.</p>`,
      { preheader: access }
    ),
  };
}

// ── Hromadné oznámení (novinky na webu) ──────────────────────────────────────

export interface AnnouncementItem {
  /** Krátký nadpis novinky */
  title: string;
  /** Jedna až dvě věty — co to znamená pro čtenáře, ne co jsme naprogramovali */
  text: string;
  /** Volitelný odkaz „Vyzkoušet" */
  href?: string;
  hrefLabel?: string;
}

export interface Announcement {
  subject: string;
  /** Nadpis v těle e-mailu; obvykle jiný než předmět, ať se neopakuje */
  headline: string;
  intro: string;
  items: AnnouncementItem[];
  ctaLabel: string;
  ctaUrl: string;
  outro?: string;
  /**
   * Odkaz na odhlášení. U rozesílky přes Resend Broadcast sem patří přesně
   * `{{{RESEND_UNSUBSCRIBE_URL}}}` — Resend ho nahradí adresou pro každého příjemce.
   */
  unsubscribeUrl: string;
  /** Vlastní hlavičková fotka (název souboru v úložišti); jinak výchozí email-header.jpg */
  heroImage?: string;
}

/**
 * Šablona pro oznámení novinek — jeden tvar pro všechny další rozesílky.
 * Obsah se předává strukturovaně, takže text i HTML verze vždy sedí k sobě
 * a odhlašovací odkaz nejde zapomenout (u hromadných e-mailů je povinný).
 */
export function announcementEmail(to: string, a: Announcement): EmailMessage {
  const itemsHtml = cards(a.items);

  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:#6b7280;text-decoration:none;font-weight:600">${label}</a>`;
  const footerHtml = `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td style="padding:22px 28px 6px;text-align:center;font-size:13px;line-height:1.8;color:#6b7280">
${link(`${SITE}/prace`, "Sezónní práce")} &nbsp;·&nbsp; ${link(`${SITE}/stale-pozice`, "Stálé pozice")} &nbsp;·&nbsp; ${link(`${SITE}/pruvodce`, "Průvodce")}
</td></tr>
<tr><td style="padding:4px 28px 8px;text-align:center;font-size:12px;line-height:1.7;color:#9ca3af">
Tento e-mail ti přišel, protože máš účet na <a href="${SITE}" style="color:#9ca3af">Norsko-práce.cz</a>.<br>
<a href="${a.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Odhlásit odběr novinek</a>
</td></tr></table>`;

  const text = [
    a.intro,
    "",
    ...a.items.flatMap((i) => [`${i.title}`, i.text, ...(i.href ? [i.href] : []), ""]),
    // Šipka patří do tlačítka, v textové verzi by vypadala jako překlep
    `${a.ctaLabel.replace(/\s*→\s*$/, "")}: ${a.ctaUrl}`,
    ...(a.outro ? ["", a.outro] : []),
    "",
    "Tým Norsko-práce.cz",
    "",
    `Odhlásit odběr novinek: ${a.unsubscribeUrl}`,
  ].join("\n");

  const html = layout(
    a.headline,
    `<p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#374151">${esc(a.intro)}</p>
${itemsHtml}
<p style="margin:18px 0 ${a.outro ? "22px" : "0"}">${button(a.ctaUrl, a.ctaLabel)}</p>
${a.outro ? `<p style="margin:0;font-size:14px;line-height:1.65;color:#4b5563">${esc(a.outro)}</p>` : ""}`,
    { heroUrl: `${ASSETS}/images/${a.heroImage ?? "email-header.jpg"}`, preheader: a.intro, footerHtml }
  );

  return {
    to,
    subject: a.subject,
    text,
    html,
    // Odhlášení jedním klikem — vyžadují to Gmail i Seznam u hromadné pošty
    headers: a.unsubscribeUrl.startsWith("http")
      ? {
          "List-Unsubscribe": `<${a.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  };
}

// ── Potvrzení registrace (šablona pro Supabase Auth) ─────────────────────────

/**
 * HTML pro Supabase → Authentication → Email Templates → Confirm signup.
 * Supabase si e-mail posílá sám, proto vracíme jen řetězec se svými zástupnými
 * značkami — `{{ .ConfirmationURL }}` doplní odkaz pro konkrétního uživatele.
 */
export function signupConfirmationTemplate(): string {
  return layout(
    "Ještě potvrď svůj e-mail",
    `<p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#374151">Vítej na Norsko-práce.cz. Klikni na tlačítko a účet bude hotový — pak už uvidíš sezónní i stálé nabídky z Norska přeložené do češtiny.</p>
<p style="margin:0 0 22px">${button("{{ .ConfirmationURL }}", "Potvrdit e-mail →")}</p>
${cards([
  { title: "Sezónní práce", text: "Brigády v gastronomii, zemědělství a stavebnictví — často i s ubytováním." },
  { title: "Stálé pozice", text: "Trvalé úvazky pro elektrikáře, svářeče, mechaniky, instalatéry a řidiče." },
  { title: "5 kontaktů zdarma", text: "U prvních pěti nabídek uvidíš kontakt na zaměstnavatele bez předplatného." },
])}
<p style="margin:18px 0 0;font-size:13px;line-height:1.65;color:#6b7280">Pokud jsi se neregistroval(a) ty, e-mail klidně smaž — bez potvrzení se účet nezaloží.</p>`,
    { heroUrl: `${ASSETS}/images/email-header.jpg`, preheader: "Jeden klik a účet je hotový." }
  );
}
