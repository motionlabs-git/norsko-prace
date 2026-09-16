import { Resend } from "resend";

// Transakční e-maily k předplatnému (Resend). Bez RESEND_API_KEY se nic neodešle —
// jen varování v logu, aby chybějící konfigurace neshodila webhook.

const SITE = "https://norsko-prace.cz";
const FROM = process.env.EMAIL_FROM ?? "Norsko-práce.cz <info@norsko-prace.cz>";
const REPLY_TO = "info@norsko-prace.cz";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
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

const tierLabel = (tier: string | null) => (tier === "premium_plus" ? "Premium Plus" : "Premium");

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="cs"><body style="margin:0;background:#fafaf8;font-family:Manrope,Arial,sans-serif;color:#1c1c1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#003087;padding:22px 28px;color:#ffffff;font-size:18px;font-weight:800">Norsko-práce.cz</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3">${title}</h1>
${bodyHtml}
<p style="margin:28px 0 0;font-size:14px;color:#6b7280">Máš dotaz? Stačí odpovědět na tento e-mail.<br>Tým Norsko-práce.cz</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#C8102E;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px">${label}</a>`;

/** Poděkování po aktivaci předplatného. */
export function welcomeEmail(to: string, tier: string | null): EmailMessage {
  const name = tierLabel(tier);
  const perks = [
    "Kontakty na zaměstnavatele a odkazy na přihlášení u všech nabídek",
    "Sekce Vybrané práce — ověřené nabídky, často s ubytováním",
    ...(tier === "premium_plus" ? ["Prioritní podpora — odpověz na tento e-mail, kdykoli budeš potřebovat"] : []),
  ];
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
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Moc si toho vážíme — pomáháš nám udržovat nabídky aktuální a přeložené.</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:700">Co máš teď odemčené:</p>
<ul style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.7">${perks.map((p) => `<li>${p}</li>`).join("")}</ul>
<p style="margin:0 0 22px">${button(`${SITE}/prace`, "Prohlédnout nabídky →")}</p>
<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#374151">Tip: v přehledu nahoře vyber <strong>„Kdy chceš jet?"</strong> a uvidíš nabídky pro svůj termín.</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#374151">Předplatné spravuješ nebo zrušíš kdykoli <a href="${SITE}/profil" style="color:#C8102E">v profilu</a>.</p>`
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
<p style="margin:0;font-size:14px;line-height:1.6;color:#374151">Budeme rádi, když nám odpovědí na tento e-mail napíšeš, co ti chybělo. Každou zpětnou vazbu čteme.</p>`
    ),
  };
}
