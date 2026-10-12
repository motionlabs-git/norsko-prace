/**
 * Zmenší fotky pro web — na místě, s odložením originálů.
 * Spuštění: npx tsx scripts/optimize-photos.mts [adresář]
 *
 * Proč: telefon ukládá snímky v 4000+ px a několika megabajtech. Na webu se největší
 * fotka zobrazuje v šířce kolem 720 px, takže i s rezervou na retina displeje stačí
 * 2000 px. Zároveň se odstraní metadata EXIF, ve kterých bývá i GPS poloha.
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DIR = process.argv[2] ?? "public/images/o-mne";
const BACKUP = "photo-originals";
const MAX_EDGE = 2000;
const QUALITY = 82;

fs.mkdirSync(BACKUP, { recursive: true });

const files = fs.readdirSync(DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(DIR, file);
  const backup = path.join(BACKUP, file);

  const sizeBefore = fs.statSync(src).size;
  const meta = await sharp(src).metadata();
  if ((meta.width ?? 0) <= MAX_EDGE && (meta.height ?? 0) <= MAX_EDGE && sizeBefore < 900_000) {
    console.log(`${file.padEnd(30)} přeskočeno (už je malá)`);
    continue;
  }

  if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

  // .rotate() aplikuje otočení z EXIF ještě před zahozením metadat,
  // jinak by se fotky z telefonu překlopily na bok
  const out = await sharp(backup)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(src, out);
  const sizeAfter = fs.statSync(src).size;
  const m = await sharp(src).metadata();
  before += sizeBefore;
  after += sizeAfter;
  console.log(
    `${file.padEnd(30)} ${(sizeBefore / 1024 / 1024).toFixed(1)} MB → ${(sizeAfter / 1024).toFixed(0)} kB   ${m.width}×${m.height}`
  );
}

if (before > 0) {
  console.log(
    `\ncelkem ${(before / 1024 / 1024).toFixed(1)} MB → ${(after / 1024 / 1024).toFixed(1)} MB ` +
      `(úspora ${Math.round((1 - after / before) * 100)} %)`
  );
  console.log(`originály odložené v ${BACKUP}/ (mimo git)`);
}
