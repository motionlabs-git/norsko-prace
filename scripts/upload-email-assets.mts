/**
 * Nahraje obrázky pro e-maily do veřejného úložiště Supabase.
 * Spuštění: npx tsx scripts/upload-email-assets.mts
 *
 * Proč úložiště a ne /public na webu: e-maily zůstávají ve schránkách roky.
 * Kdyby se soubor při některém nasazení přejmenoval nebo smazal, rozbily by se
 * i staré odeslané zprávy. Úložiště na nasazení nezávisí.
 */
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  process.env[t.slice(0, i).trim()] ??= t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "email-assets";
const auth = { Authorization: `Bearer ${KEY}`, apikey: KEY };

// Bucket musí být veřejný — e-mailový klient se nepřihlašuje
const mk = await fetch(`${URL_BASE}/storage/v1/bucket`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
});
console.log(mk.status === 200 ? `bucket ${BUCKET} vytvořen` : `bucket ${BUCKET}: ${(await mk.json()).message ?? mk.status}`);

const FILES: [string, string][] = [
  ["public/images/email-logo.png", "image/png"],
  ["public/images/email-header.jpg", "image/jpeg"],
];

for (const [path, type] of FILES) {
  const name = path.split("/").pop()!;
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/images/${name}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": type, "x-upsert": "true", "cache-control": "public, max-age=31536000" },
    body: fs.readFileSync(path),
  });
  const publicUrl = `${URL_BASE}/storage/v1/object/public/${BUCKET}/images/${name}`;
  const check = await fetch(publicUrl, { method: "HEAD" });
  console.log(`${res.ok ? "✅" : "❌"} ${name} → ${publicUrl}  (veřejně: HTTP ${check.status})`);
}

console.log(`\nDo .env.local i do Vercelu přidej:\nEMAIL_ASSET_BASE=${URL_BASE}/storage/v1/object/public/${BUCKET}`);
