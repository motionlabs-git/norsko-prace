/**
 * Souhlas s rozesílkou novinek.
 *
 * Pravidla, která z toho plynou:
 *  - posíláme jen tomu, kdo má `profiles.marketing_opt_in = true` a potvrzenou adresu,
 *  - odhlásit jde z profilu (přihlášený) i z patičky e-mailu (bez přihlášení, přes token),
 *  - transakční zprávy (potvrzení platby, zrušení předplatného) sem nepatří —
 *    ty se posílají vždy, protože jsou k uzavřené smlouvě.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase";

const SITE = "https://norsko-prace.cz";

/**
 * Podpis odhlašovacího odkazu. Bez něj by stačilo v adrese přepsat id
 * a odhlásit kohokoli jiného. Platnost neomezujeme — odkaz ve staré zprávě
 * musí fungovat i za rok.
 */
function sign(userId: string): string {
  const secret = process.env.CRON_SECRET ?? "";
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE}/odhlasit?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = sign(userId);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vypne (nebo zapne) rozesílku pro daný účet. */
export async function setMarketingOptIn(userId: string, optIn: boolean): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ marketing_opt_in: optIn, marketing_changed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(`profiles: ${error.message}`);
}

export interface Recipient {
  id: string;
  email: string;
  unsubscribeUrl: string;
}

/**
 * Komu smíme poslat novinky: potvrzená adresa (jinak se e-mail odrazí)
 * a nevypnutá rozesílka.
 */
export async function marketingRecipients(): Promise<{ recipients: Recipient[]; skipped: { unconfirmed: number; optedOut: number } }> {
  const db = supabaseAdmin();

  const users: { id: string; email: string }[] = [];
  let unconfirmed = 0;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (!u.email) continue;
      if (!u.email_confirmed_at) { unconfirmed++; continue; }
      users.push({ id: u.id, email: u.email });
    }
    if (data.users.length < 200) break;
  }

  const { data: profiles, error } = await db.from("profiles").select("id, marketing_opt_in");
  if (error) throw new Error(`profiles: ${error.message}`);
  const optOut = new Set((profiles ?? []).filter((p) => p.marketing_opt_in === false).map((p) => p.id as string));

  const recipients = users
    .filter((u) => !optOut.has(u.id))
    .map((u) => ({ id: u.id, email: u.email, unsubscribeUrl: unsubscribeUrl(u.id) }));

  return {
    recipients,
    skipped: { unconfirmed, optedOut: users.length - recipients.length },
  };
}
