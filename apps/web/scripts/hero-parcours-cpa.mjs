// CPA — les images du hero « parcours » (demande du 2026-11-11) : cinq étapes
// du métier de la Centrale, de l'achat à la distribution.
//
// DÉPENSE APPROUVÉE par le propriétaire le 2026-11-11, plafond 2 $ pour le jeu
// complet. Le script génère UNE étape par appel (argument), pour valider le
// style sur une image avant de payer les autres. Rien n'est publié : les
// images sont écrites dans le dossier passé en argument, pour relecture.
//
//   node --env-file=.env.local scripts/hero-parcours-cpa.mjs <etape> <dossier>
//   étapes : achat | chargement | acheminement | dechargement | distribution
//
// Règles de contenu : aucune marque, aucun logo, aucun texte lisible dans
// l'image (pas de faux médicament de marque — contrainte réglementaire), des
// personnes et des lieux plausibles au Tchad.
import { writeFileSync } from 'node:fs'

const STYLE = 'Photorealistic cinematic photograph, premium editorial look, shallow depth of field, warm natural Sahel light, rich but natural colors, subtle deep green accents (#1F6B4A) on packaging and clothing, clean composition with calm empty space on the left third for a headline. Setting: Chad, Central Africa. Absolutely no text, no letters, no numbers, no logos, no brand names anywhere in the image.'

const ETAPES = {
  achat: 'A pharmaceutical procurement officer in a modern office in N\'Djamena reviews an order on a tablet, beside neatly stacked sealed plain white medicine cartons with a green band; sample boxes of generic unbranded medicines on the desk.',
  chargement: 'Inside a clean, well-lit pharmaceutical warehouse, a worker drives a forklift loading pallets of sealed plain white cartons with a green band into a white delivery truck at a loading dock.',
  acheminement: 'A white delivery truck with plain green stripes drives on a red laterite road across the Sahel at golden hour, acacia trees, wide landscape, a light trail of dust behind it.',
  dechargement: 'In front of a small rural health centre in Chad, two workers unload sealed plain white cartons with a green band from a white truck, a nurse in uniform checks the delivery on a clipboard.',
  distribution: 'Inside a bright rural health centre pharmacy in Chad, a nurse in uniform hands a plain unbranded medicine box to a smiling mother holding her child; shelves of neatly arranged supplies behind.',
}

const [etape, dossier] = process.argv.slice(2)
if (!ETAPES[etape] || !dossier) { console.error(`Usage : <etape> <dossier> — étapes : ${Object.keys(ETAPES).join(' | ')}`); process.exit(2) }
if (!process.env.OPENAI_API_KEY) { console.error('OPENAI_API_KEY absente'); process.exit(2) }

const r = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-image-1.5', prompt: `${ETAPES[etape]} ${STYLE}`,
    size: '1536x1024', quality: 'high', output_format: 'webp', output_compression: 85, n: 1,
  }),
})
const d = await r.json()
if (!r.ok) { console.error(`🔴 HTTP ${r.status} : ${JSON.stringify(d).slice(0, 400)}`); process.exit(1) }
const b64 = d.data?.[0]?.b64_json
if (!b64) { console.error('🔴 aucune image rendue'); process.exit(1) }
const fichier = `${dossier}/parcours-${etape}.webp`
writeFileSync(fichier, Buffer.from(b64, 'base64'))
console.log(`🟢 ${fichier} — ${Math.round(Buffer.from(b64, 'base64').length / 1024)} Ko · usage : ${JSON.stringify(d.usage ?? null)}`)
