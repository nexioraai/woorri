// ════════════════════════════════════════════════════════════════════
//  UNE IMAGE PNG D'UNE SEULE COULEUR — PRODUITE, PAS DESSINÉE.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE FICHIER EXISTE, ET CE QU'IL DÉBLOQUE.
//
// Mesuré le 2026-10-16 sur le manifeste d'une application réellement émise :
// les icônes y étaient déclarées en SVG, `sizes: "any"`. Or les critères
// d'installabilité de Chrome demandent une icône 192×192 ET une 512×512, et
// la documentation donne le PNG comme le format éprouvé — le support du SVG
// y est décrit comme limité, et les sources se contredisent.
//   https://developer.chrome.com/docs/lighthouse/pwa/installable-manifest
//
// On ne parie pas. On émet les deux PNG EN PLUS du SVG : la déclaration est
// alors valide sous toutes les lectures, et l'application s'installe sur
// Android comme sur iPhone.
//
// ── POURQUOI UNE COULEUR UNIE, ET CE QUE ÇA NE FAIT PAS.
//
// Dessiner la lettre de l'application en PNG demanderait de rastériser une
// police. Le moteur n'embarque aucun rasteriseur, et en écrire un serait un
// chantier sans rapport avec le sien.
//
// Le SVG — qui PORTE la lettre — reste déclaré en premier : les navigateurs
// qui le savent lire l'emploient. Les PNG sont le repli qui rend
// l'installation possible, et ils portent la COULEUR de l'application, pas
// une couleur quelconque.
//
// LA VRAIE SOURCE RESTE `app.brandIconPngBase64`, qui existe déjà au contrat
// et que l'émetteur natif consomme déjà. Aucun document généré ne l'a jamais
// portée (le prompt interdit au générateur de l'inventer). Le jour où la
// chaîne la produira, c'est elle qu'il faudra préférer — et le dire ici vaut
// mieux que de laisser croire que le carré de couleur est l'objectif.
//
// ── POURQUOI UN ENCODEUR À LA MAIN.
//
// Aucune dépendance n'est ajoutée pour cela, et il n'en faut pas : un PNG
// d'une seule couleur est le cas le plus simple du format. On emploie la
// palette indexée sur 1 bit — tous les pixels valent l'index 0 — ce qui rend
// l'image minuscule AVANT même toute compression.
//
// La compression DEFLATE est en blocs STOCKÉS (BTYPE=00). C'est du DEFLATE
// valide, lisible par tout décodeur, et cela évite d'embarquer un
// compresseur. Coût mesuré : ~33 Ko pour 512×512, ~4,8 Ko pour 192×192.
// Une implémentation de Huffman gagnerait 30 Ko et introduirait une classe
// de bogues que personne ici n'a besoin de porter.

const TABLE_CRC = ((): Uint32Array => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (octets: Uint8Array): number => {
  let c = 0xffffffff;
  for (const o of octets) c = (TABLE_CRC[(c ^ o) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Adler-32 — la somme de contrôle que l'enveloppe zlib exige. */
const adler32 = (octets: Uint8Array): number => {
  let a = 1;
  let b = 0;
  for (const o of octets) {
    a = (a + o) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
};

const be32 = (n: number): Uint8Array =>
  new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);

const concat = (morceaux: readonly Uint8Array[]): Uint8Array => {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const m of morceaux) {
    out.set(m, o);
    o += m.length;
  }
  return out;
};

/** Un bloc PNG : longueur, type, données, CRC du type ET des données. */
const bloc = (type: string, donnees: Uint8Array): Uint8Array => {
  // Les noms de blocs PNG sont de l'ASCII pur ("IHDR", "PLTE"…), mais on
  // lit les unités de code plutôt que de disperser la chaîne : la règle de
  // lint a raison sur le fond, et un nom de bloc ne contiendra jamais autre
  // chose que ces quatre lettres.
  const nom = new Uint8Array(type.length);
  for (let i = 0; i < type.length; i += 1) nom[i] = type.charCodeAt(i);
  const corps = concat([nom, donnees]);
  return concat([be32(donnees.length), corps, be32(crc32(corps))]);
};

/** DEFLATE en blocs STOCKÉS, enveloppé en zlib. */
const zlibStocke = (brut: Uint8Array): Uint8Array => {
  const morceaux: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  const MAX = 65535;
  for (let i = 0; i < brut.length; i += MAX) {
    const tranche = brut.subarray(i, Math.min(i + MAX, brut.length));
    const dernier = i + MAX >= brut.length ? 1 : 0;
    const len = tranche.length;
    morceaux.push(
      new Uint8Array([dernier, len & 0xff, (len >>> 8) & 0xff, ~len & 0xff, (~len >>> 8) & 0xff]),
      tranche,
    );
  }
  morceaux.push(be32(adler32(brut)));
  return concat(morceaux);
};

/** `#RRGGBB` en trois octets. Refuse tout ce qui n'est pas cette forme. */
const composantes = (hex: string): [number, number, number] => {
  const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/u.exec(hex);
  if (m === null) throw new Error(`couleur illisible : ${hex}`);
  return [
    Number.parseInt(m[1] ?? "0", 16),
    Number.parseInt(m[2] ?? "0", 16),
    Number.parseInt(m[3] ?? "0", 16),
  ];
};

/**
 * Un carré PNG plein, de `cote` pixels, dans la couleur donnée.
 *
 * Déterministe : mêmes entrées, mêmes octets, toujours. C'est ce qui permet
 * aux cliquets de comparer deux émissions sans se soucier de l'heure.
 */
export function pngUni(cote: number, couleurHex: string): Uint8Array {
  const [r, v, b] = composantes(couleurHex);
  const ihdr = concat([
    be32(cote),
    be32(cote),
    // profondeur 1 bit · type 3 (palette) · compression 0 · filtre 0 · pas d'entrelacement
    new Uint8Array([1, 3, 0, 0, 0]),
  ]);
  // Une seule entrée de palette : tous les pixels la désignent.
  const plte = new Uint8Array([r, v, b]);

  const octetsParLigne = Math.ceil(cote / 8);
  const brut = new Uint8Array(cote * (1 + octetsParLigne));
  // Tout est à zéro : octet de filtre 0 (« aucun ») et index 0 partout. Rien
  // à écrire — et c'est pour cela que ce format a été choisi.

  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc("IHDR", ihdr),
    bloc("PLTE", plte),
    bloc("IDAT", zlibStocke(brut)),
    bloc("IEND", new Uint8Array(0)),
  ]);
}

/** Les octets en base64 — la forme sous laquelle la carte des fichiers porte un `.png`. */
export function enBase64(octets: Uint8Array): string {
  const T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < octets.length; i += 3) {
    const a = octets[i] ?? 0;
    const b = octets[i + 1];
    const c = octets[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += (T[(n >>> 18) & 63] ?? "") + (T[(n >>> 12) & 63] ?? "");
    out += b === undefined ? "=" : (T[(n >>> 6) & 63] ?? "");
    out += c === undefined ? "=" : (T[n & 63] ?? "");
  }
  return out;
}
