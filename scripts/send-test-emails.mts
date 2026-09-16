// Test transakčních e-mailů (Resend). Používá stejné šablony i odesílání jako produkce.
// Spuštění: npx tsx scripts/send-test-emails.mts tvuj@email.cz
// Vyžaduje RESEND_API_KEY v .env.local (volitelně EMAIL_FROM).
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const to = process.argv[2];
const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Chybí RESEND_API_KEY v .env.local"); process.exit(1); }
if (!to) { console.error("Zadej adresu: npx tsx scripts/send-test-emails.mts tvuj@email.cz"); process.exit(1); }

// Ověřené domény — z neověřené Resend odeslat nedovolí
const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
const body = (await res.json().catch(() => ({}))) as { data?: { name: string; status: string }[] };
if (res.status !== 200) { console.error("Resend nevrátil domény:", res.status, JSON.stringify(body).slice(0, 200)); process.exit(1); }
const domains = body.data ?? [];
console.log(domains.length ? "domény v Resendu:" : "žádné domény — posílat půjde jen z onboarding@resend.dev na adresu vlastníka účtu");
for (const d of domains) console.log(`  ${d.name} — ${d.status}`);

const from = process.env.EMAIL_FROM ?? "Norsko-práce.cz <info@norsko-prace.cz>";
const fromDomain = from.match(/@([^>\s]+)/)?.[1];
if (fromDomain && fromDomain !== "resend.dev" && !domains.some((d) => d.name === fromDomain && d.status === "verified")) {
  console.log(`\n⚠️  Doména ${fromDomain} není ověřená → odeslání nejspíš selže.`);
  console.log(`   Pro první test: EMAIL_FROM="Norsko-práce.cz <onboarding@resend.dev>" a posílej na adresu svého Resend účtu.`);
}

const { sendEmail, welcomeEmail, cancellationEmail } = await import("@/lib/email");
for (const msg of [welcomeEmail(to, "premium"), cancellationEmail(to, "2026-10-16T13:50:03.000Z")]) {
  try {
    await sendEmail(msg);
    console.log(`✅ odesláno: „${msg.subject}"`);
  } catch (err) {
    console.log(`❌ selhalo: „${msg.subject}" — ${err instanceof Error ? err.message : err}`);
  }
}
