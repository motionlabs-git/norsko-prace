/**
 * Náhledy všech e-mailů do public/ — otevři http://localhost:3001/emaily.html
 * Spuštění: npx tsx scripts/email-previews.mts
 */
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const { welcomeEmail, cancellationEmail, signupConfirmationTemplate } = await import("@/lib/email");

const previews: { file: string; label: string; note: string; html: string }[] = [
  {
    file: "email-potvrzeni-registrace.html",
    label: "Potvrzení registrace",
    note: "Posílá Supabase Auth — šablonu je potřeba vložit do jeho nastavení",
    html: signupConfirmationTemplate(),
  },
  {
    file: "email-potvrzeni-platby.html",
    label: "Potvrzení platby (Premium)",
    note: "Odchází automaticky po zaplacení, ze Stripe webhooku",
    html: welcomeEmail("ukazka@example.com", "premium").html,
  },
  {
    file: "email-zruseni.html",
    label: "Zrušení předplatného",
    note: "Potvrzení, že platby končí a přístup dobíhá",
    html: cancellationEmail("ukazka@example.com", "2026-10-16T13:50:03.000Z").html,
  },
];

for (const p of previews) fs.writeFileSync(`public/${p.file}`, p.html);

const index = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Náhledy e-mailů</title>
<style>body{margin:0;background:#f1f0ec;font-family:system-ui,sans-serif;color:#1c1c1c;padding:32px 16px}
.wrap{max-width:760px;margin:0 auto}h1{font-size:22px;margin:0 0 20px}
a.card{display:block;background:#fff;border-radius:16px;padding:18px 20px;margin-bottom:12px;text-decoration:none;color:inherit}
a.card:hover{box-shadow:0 4px 16px rgb(0 0 0/.08)}b{display:block;font-size:16px;margin-bottom:4px}
span{font-size:13px;color:#6b7280}</style></head><body><div class="wrap">
<h1>Náhledy e-mailů</h1>
${previews.map((p) => `<a class="card" href="/${p.file}"><b>${p.label}</b><span>${p.note}</span></a>`).join("\n")}
<a class="card" href="/email-preview.html"><b>Novinky (rozesílka)</b><span>Hromadný e-mail o novinkách na webu</span></a>
</div></body></html>`;
fs.writeFileSync("public/emaily.html", index);

console.log("Náhledy:");
for (const p of previews) console.log(`  http://localhost:3001/${p.file}  — ${p.label}`);
console.log("\nRozcestník: http://localhost:3001/emaily.html");
