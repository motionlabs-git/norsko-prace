/**
 * Vygeneruje obrázky pro e-maily do public/images/.
 * Spuštění: npx tsx scripts/make-email-assets.mts
 *
 * Proč zvlášť: e-mailoví klienti neumí SVG (Gmail i Outlook ho zahodí) a hero.jpg
 * má 450 kB — to by u rozesílky zdržovalo načítání a lezlo do limitů.
 */
import sharp from "sharp";
import fs from "node:fs";

const OUT = "public/images";

// Logo: rastrované ve dvojnásobku (displej 200 px) — v e-mailu se vkládá jako <img width="200">
const logo = await sharp(fs.readFileSync(`${OUT}/norsko-prace-logo.svg`), { density: 600 })
  .resize({ width: 400 })
  .png({ compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync(`${OUT}/email-logo.png`, logo);

// Hlavičková fotka: šířka 1200 (displej 600), poměr 1200×420.
// „attention" nechá sharp vybrat nejzajímavější výřez místo slepého středu.
const header = await sharp(`${OUT}/hero.jpg`)
  .resize({ width: 1200, height: 420, fit: "cover", position: sharp.strategy.attention })
  .jpeg({ quality: 78, progressive: true, mozjpeg: true })
  .toBuffer();
fs.writeFileSync(`${OUT}/email-header.jpg`, header);

for (const f of ["email-logo.png", "email-header.jpg"]) {
  const { size } = fs.statSync(`${OUT}/${f}`);
  const meta = await sharp(`${OUT}/${f}`).metadata();
  console.log(`${f.padEnd(20)} ${meta.width}×${meta.height}  ${(size / 1024).toFixed(0)} kB`);
}
