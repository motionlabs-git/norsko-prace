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

const { announcementEmail, sendEmail } = await import("@/lib/email");

const SITE = "https://norsko-prace.cz";

// ── Obsah rozesílky ──────────────────────────────────────────────────────────
// Píšeme z pohledu čtenáře: co s tím může udělat, ne co jsme naprogramovali.
const ANNOUNCEMENT: Announcement = {
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
  // U rozesílky Resend nahradí za odkaz konkrétního příjemce
  unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
};

// ── Režimy ───────────────────────────────────────────────────────────────────
const [mode, arg] = process.argv.slice(2);
const key = process.env.RESEND_API_KEY;

async function resendApi(path: string, init?: RequestInit) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body as Record<string, unknown>;
}

if (mode === "--preview") {
  const msg = announcementEmail("nahled@example.com", { ...ANNOUNCEMENT, unsubscribeUrl: `${SITE}/profil` });
  fs.writeFileSync("email-preview.html", msg.html);
  fs.writeFileSync("email-preview.txt", msg.text);
  console.log(`Předmět: ${msg.subject}`);
  console.log("HTML:  email-preview.html  (otevři v prohlížeči)");
  console.log("Text:  email-preview.txt   (verze pro klienty bez HTML)");
} else if (mode === "--test") {
  if (!arg) { console.error("Zadej adresu: --test tvuj@email.cz"); process.exit(1); }
  // V testu musí být odhlašovací odkaz skutečná adresa, ne zástupný text rozesílky
  await sendEmail(announcementEmail(arg, { ...ANNOUNCEMENT, unsubscribeUrl: `${SITE}/profil` }));
  console.log(`✅ testovací e-mail odeslán na ${arg}`);
} else if (mode === "--contacts") {
  if (!key) { console.error("Chybí RESEND_API_KEY"); process.exit(1); }
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const emails: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    // Jen potvrzené adresy — nepotvrzené by kazily doručitelnost
    for (const u of data.users) if (u.email && u.email_confirmed_at) emails.push(u.email);
    if (data.users.length < 200) break;
  }
  console.log(`uživatelů s potvrzenou adresou: ${emails.length}`);

  // Výchozí je „General" — segment, který Resend zakládá sám a na který míří
  // rozesílka vytvořená v jeho rozhraní. Jiný lze zadat: --contacts Novinky
  const segmentName = arg ?? "General";
  const segments = (await resendApi("/segments")) as { data?: { id: string; name: string }[] };
  let segment = (segments.data ?? []).find((s) => s.name === segmentName);
  if (!segment) {
    const created = (await resendApi("/segments", {
      method: "POST",
      body: JSON.stringify({ name: segmentName }),
    })) as { id: string };
    segment = { id: created.id, name: segmentName };
    console.log(`vytvořen segment „${segmentName}" (${created.id})`);
  } else {
    console.log(`segment „${segmentName}" (${segment.id})`);
  }

  let added = 0, skipped = 0;
  const problems: string[] = [];
  for (const email of emails) {
    try {
      await resendApi("/contacts", {
        method: "POST",
        body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment.id }] }),
      });
      added++;
    } catch (err) {
      // Existující kontakt je v pořádku; cokoli jiného musí být vidět, ne spolknuté
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      if (problems.length < 3 && !/already exists/i.test(msg)) problems.push(`${email}: ${msg}`);
    }
  }
  console.log(`přidáno ${added}, přeskočeno ${skipped}`);
  for (const p of problems) console.log("  ⚠️ ", p);

  const check = (await resendApi(`/segments/${segment.id}/contacts`)) as { data?: unknown[] };
  console.log(`v segmentu je teď ${check.data?.length ?? 0} kontaktů`);
} else if (mode === "--broadcast") {
  if (!key) { console.error("Chybí RESEND_API_KEY"); process.exit(1); }
  if (!arg) { console.error("Zadej segment: --broadcast <segmentId>"); process.exit(1); }
  const msg = announcementEmail("", ANNOUNCEMENT);
  const created = (await resendApi("/broadcasts", {
    method: "POST",
    body: JSON.stringify({
      segmentId: arg,
      from: process.env.EMAIL_FROM ?? "Norsko-práce.cz <info@norsko-prace.cz>",
      replyTo: "info@norsko-prace.cz",
      subject: ANNOUNCEMENT.subject,
      name: ANNOUNCEMENT.subject,
      previewText: ANNOUNCEMENT.intro.slice(0, 90),
      html: msg.html,
      text: msg.text,
    }),
  })) as { id: string };
  console.log(`✅ rozesílka připravená jako koncept (${created.id})`);
  console.log("   Zkontroluj ji v Resendu (Broadcasts) a odešli tlačítkem — skript nic neposílá.");
} else {
  console.log(`Použití:
  npx tsx scripts/announce.mts --preview
  npx tsx scripts/announce.mts --test tvuj@email.cz
  npx tsx scripts/announce.mts --contacts
  npx tsx scripts/announce.mts --broadcast <segmentId>`);
}
