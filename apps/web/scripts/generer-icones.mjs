// ============================================================
// GÉNÉRATEUR D'ICÔNES DERIBFY — 100 % open source, aucun service externe.
//
// LE DÉFAUT QU'IL CORRIGE : `src/app/favicon.ico` pesait 25 931 octets, soit
// EXACTEMENT le fichier livré par `create-next-app`. Ce n'était pas un mauvais
// logo, c'était l'absence de logo — et Google affichait donc le triangle de
// Vercel à côté de deribfy.com.
//
// SOURCE DE L'IMAGE, dans cet ordre :
//   1. `assets/logo-deribfy.png` (ou .svg/.jpg) s'il existe — LE VRAI LOGO ;
//   2. sinon, un MONOGRAMME dérivé de la palette officielle (CLAUDE.md).
//
// Déposer le vrai logo et relancer ce script suffit à tout remplacer : aucune
// icône n'est écrite à la main, elles sont toutes DÉRIVÉES d'une seule source.
//
// Usage : node scripts/generer-icones.mjs
// ============================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ICI = dirname(fileURLToPath(import.meta.url));
const APP = join(ICI, "..", "src", "app");
const PUBLIC = join(ICI, "..", "public");
const ASSETS = join(ICI, "..", "assets");

// Palette officielle — CLAUDE.md, section « Design system ».
const ACCENT = "#FA5D1E";
const FOND = "#0A050E";

/** Les sources acceptées pour un vrai logo, par ordre de préférence. */
const SOURCES = ["logo-deribfy.svg", "logo-deribfy.png", "logo-deribfy.jpg", "logo-deribfy.webp"];

/**
 * Le monogramme de repli.
 *
 * Pensé pour 16 px AVANT d'être pensé pour 512 : à cette taille une lettre fine
 * disparaît. D'où le fond plein, le contraste maximal de la palette, et une
 * seule forme. Un logo illisible en favicon ne vaut pas mieux qu'aucun logo.
 */
const monogramme = (taille) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 512 512">
     <rect width="512" height="512" rx="112" fill="${FOND}"/>
     <path d="M150 116h104c86 0 148 58 148 140s-62 140-148 140H150V116zm82 66v148h22c46 0 78-30 78-74s-32-74-78-74h-22z"
           fill="${ACCENT}"/>
   </svg>`,
);

async function sourceDeBase() {
  for (const nom of SOURCES) {
    const chemin = join(ASSETS, nom);
    if (existsSync(chemin)) {
      console.log(`  source : ${nom} (vrai logo)`);
      // `contain` et non `cover` : un logo ne se rogne pas — c'est la même règle
      // que pour les photos produit, et pour la même raison.
      return sharp(readFileSync(chemin))
        .resize(512, 512, { fit: "contain", background: FOND })
        .flatten({ background: FOND })
        .png()
        .toBuffer();
    }
  }
  console.log("  source : MONOGRAMME (aucun logo dans assets/ — voir PROGRESS.md)");
  return sharp(monogramme(512)).png().toBuffer();
}

/**
 * Conteneur ICO écrit à la main.
 *
 * `sharp` ne sait pas produire d'ICO, et aucune dépendance supplémentaire n'est
 * justifiée pour un format dont l'en-tête tient en seize octets. Les PNG sont
 * embarqués tels quels — accepté par tous les navigateurs depuis Vista.
 */
function construireIco(images) {
  const enTete = Buffer.alloc(6);
  enTete.writeUInt16LE(0, 0); // réservé
  enTete.writeUInt16LE(1, 2); // type 1 = icône
  enTete.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entrees = images.map(({ taille, donnees }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(taille >= 256 ? 0 : taille, 0); // 0 signifie 256
    e.writeUInt8(taille >= 256 ? 0 : taille, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // réservé
    e.writeUInt16LE(1, 4); // plans
    e.writeUInt16LE(32, 6); // bits par pixel
    e.writeUInt32LE(donnees.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += donnees.length;
    return e;
  });

  return Buffer.concat([enTete, ...entrees, ...images.map((i) => i.donnees)]);
}

async function principal() {
  console.log("Génération des icônes Deribfy");
  const base = await sourceDeBase();

  const png = (taille) => sharp(base).resize(taille, taille, { fit: "contain", background: FOND }).png({ compressionLevel: 9 }).toBuffer();

  // ── favicon.ico — 16, 32, 48. Les trois tailles que les navigateurs et les
  // résultats Google demandent réellement.
  const ico = construireIco(
    await Promise.all([16, 32, 48].map(async (taille) => ({ taille, donnees: await png(taille) }))),
  );
  writeFileSync(join(APP, "favicon.ico"), ico);
  console.log(`  favicon.ico          ${ico.length} octets (16, 32, 48)`);

  // ── Conventions de fichier Next : Next émet lui-même les <link>.
  writeFileSync(join(APP, "icon.png"), await png(512));
  writeFileSync(join(APP, "apple-icon.png"), await png(180));
  console.log("  icon.png             512×512");
  console.log("  apple-icon.png       180×180");

  // ── Tailles du manifeste. Multiples de 48, comme Google Search les attend.
  const dossier = join(PUBLIC, "icons");
  if (!existsSync(dossier)) mkdirSync(dossier, { recursive: true });
  for (const taille of [48, 96, 192, 512]) {
    writeFileSync(join(dossier, `icon-${taille}.png`), await png(taille));
    console.log(`  public/icons/icon-${taille}.png`);
  }

  // ── Image Open Graph par défaut : 1200×630, la seule taille que Facebook,
  // LinkedIn et WhatsApp rendent sans recadrer.
  await sharp({
    create: { width: 1200, height: 630, channels: 4, background: FOND },
  })
    .composite([{ input: await png(320), gravity: "centre" }])
    .png()
    .toFile(join(PUBLIC, "og-deribfy.png"));
  console.log("  public/og-deribfy.png 1200×630");

  console.log("Terminé.");
}

await principal();
