// LE VISUEL D'UN SITE INSTITUTIONNEL (lot 4b, 2026-11-26) — règles PURES.
//
// Seuls les sites au thème `institution` (les institutions générées) s'en
// servent ; la CPA et les autres sites gardent leur thème, inchangé.
import type { FamilleInstitution } from './familleInstitution'

type Rvb = { r: number; v: number; b: number }
const versRvb = (hex: string): Rvb | null => {
  const m = /^#([0-9a-f]{6})$/iu.exec(hex.trim())
  if (m === null) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, v: (n >> 8) & 255, b: n & 255 }
}
const versHex = ({ r, v, b }: Rvb) => '#' + [r, v, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')

function versTsl({ r, v, b }: Rvb): [number, number, number] {
  const R = r / 255, V = v / 255, B = b / 255
  const max = Math.max(R, V, B), min = Math.min(R, V, B), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === R ? (V - B) / d + (V < B ? 6 : 0) : max === V ? (B - R) / d + 2 : (R - V) / d + 4
  return [h * 60, s, l]
}
function depuisTsl(h: number, s: number, l: number): Rvb {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [a, bb, cc] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return { r: (a + m) * 255, v: (bb + m) * 255, b: (cc + m) * 255 }
}

/** Luminance relative (WCAG). */
function luminance({ r, v, b }: Rvb): number {
  const f = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(v) + 0.0722 * f(b)
}
/** Contraste du blanc sur cette couleur (WCAG). */
export function contrasteBlanc(hex: string): number {
  const c = versRvb(hex)
  return c === null ? 1 : 1.05 / (luminance(c) + 0.05)
}

/**
 * Une couleur par rubrique, TIRÉE DE LA COULEUR DU SITE : la même teinte de
 * base, puis des teintes voisines (±25°, ±50°), assombries jusqu'à porter du
 * texte blanc lisible (contraste ≥ 4,5). L'identité reste : la première
 * rubrique a la couleur du site (assombrie seulement si illisible).
 */
export function couleursRubriques(primaire: string | null | undefined, n: number): string[] {
  const base = versRvb(primaire ?? '') ?? { r: 30, v: 77, b: 140 }
  const [h, s, l] = versTsl(base)
  const decalages = [0, 25, -25, 50, -50, 75, -75]
  return Array.from({ length: Math.max(0, n) }, (_, i) => {
    let lum = i === 0 ? l : Math.min(l, 0.42)
    let c = i === 0 ? base : depuisTsl((h + decalages[i % decalages.length] + 360) % 360, Math.max(s, 0.45), lum)
    while (contrasteBlanc(versHex(c)) < 4.5 && lum > 0.08) { lum -= 0.04; c = depuisTsl((h + decalages[i % decalages.length] + 360) % 360, Math.max(s, 0.45), lum) }
    return versHex(c)
  })
}

/** La couleur NOMMÉE par le client (« rose vif », « vert foncé »…), ou `null`. Les plus précises d'abord. */
const COULEURS_NOMMEES: readonly [RegExp, string][] = [
  [/rose\s+(vif|fluo|fuchsia)|fuchsia|hot\s+pink|magenta/iu, '#E6007E'],
  [/bleu\s+(marine|nuit|fonc[ée])|navy/iu, '#0D2C54'],
  [/bleu\s+(ciel|clair)|sky\s+blue|light\s+blue/iu, '#0288D1'],
  [/vert\s+(fonc[ée]|sapin|for[êe]t)|dark\s+green/iu, '#1B5E20'],
  [/vert\s+(clair|pomme|lime)|light\s+green/iu, '#7CB342'],
  [/turquoise|teal/iu, '#00897B'],
  [/bordeaux|burgundy|grenat/iu, '#7B1E3A'],
  [/(?<!\p{L})(dor[ée]|gold|ocre)(?!\p{L})/iu, '#B8860B'],
  [/(?<!\p{L})(rose|pink)(?!\p{L})/iu, '#EC407A'],
  [/(?<!\p{L})(rouge|red)(?!\p{L})/iu, '#C62828'],
  [/(?<!\p{L})(orange)(?!\p{L})/iu, '#EF6C00'],
  [/(?<!\p{L})(jaune|yellow)(?!\p{L})/iu, '#F9A825'],
  [/(?<!\p{L})(vert|green)(?!\p{L})/iu, '#2E7D32'],
  [/(?<!\p{L})(bleu|blue)(?!\p{L})/iu, '#1565C0'],
  [/(?<!\p{L})(violet|purple|mauve)(?!\p{L})/iu, '#6A1B9A'],
  [/(?<!\p{L})(marron|brun|brown)(?!\p{L})/iu, '#6D4C41'],
  [/(?<!\p{L})(noir|black)(?!\p{L})/iu, '#111111'],
]
export function couleurDemandee(texte: string | null | undefined): string | null {
  const t = texte ?? ''
  // Seulement quand la couleur est DEMANDÉE (« couleur », « en rose », « color »), jamais un mot de nom propre.
  if (!/(couleur|colou?r|teinte|en\s+(rose|rouge|vert|bleu|jaune|orange|violet|noir|bordeaux|turquoise))/iu.test(t)) return null
  for (const [motif, hex] of COULEURS_NOMMEES) if (motif.test(t)) return hex
  return null
}

/** Les phrases du bandeau défilant : 3 mots et 20 à 90 signes au moins, tirées de la mission et de la présentation, 5 au plus. */
export function phrasesBandeau(...sources: (string | null | undefined)[]): string[] {
  const phrases = sources
    .flatMap((s) => (s ?? '').split(/(?<=[.!?])\s+|\s*[;•\n]\s*/u))
    .map((p) => p.trim().replace(/[.!?]+$/u, ''))
    // UNE PHRASE QUI SE TIENT SEULE : au moins 3 mots et 20 signes (« Il n'existe pas »,
    // isolée dans un bandeau, ne veut rien dire), au plus 90 signes.
    .filter((p) => p.length >= 20 && p.length <= 90 && p.split(/\s+/u).length >= 3)
  return [...new Set(phrases)].slice(0, 5)
}

/** Un chiffre clé n'est montré aux visiteurs que s'il est RÉELLEMENT rempli (il contient un chiffre). */
export function chiffreRempli(valeur: string | null | undefined): boolean {
  return /\d/u.test(valeur ?? '')
}

/** Les libellés des chiffres clés proposés, par famille — des CASES, jamais des valeurs. */
export const CHIFFRES_PAR_FAMILLE: Readonly<Record<FamilleInstitution, readonly string[]>> = {
  ministere: ['Directions', 'Agents', 'Régions couvertes', 'Programmes en cours'],
  agence_publique: ['Agents', 'Régions couvertes', 'Usagers servis par an', 'Années d’existence'],
  mairie: ['Habitants', 'Quartiers', 'Agents municipaux', 'Démarches en ligne'],
  ong: ['Bénéficiaires', 'Projets', 'Régions d’intervention', 'Partenaires'],
  ecole: ['Élèves', 'Enseignants', 'Filières', 'Taux de réussite'],
  hopital: ['Lits', 'Services', 'Consultations par an', 'Agents de santé'],
}

/**
 * UNE PHOTO D'INSTITUTION AU TCHAD EST AFRICAINE (lot 4b). La description
 * Pexels doit NOMMER l'Afrique ou un pays africain, et ne nommer aucun décor
 * d'ailleurs (« African American » est un contexte américain). Sans
 * description : refusée — on ne devine pas.
 */
const AFRIQUE = /(?<!\p{L})(africa|african|africaine?s?|sahel|sahélien|tchad|chad|n['’]?djamena|nigeria|lagos|abuja|niger|niamey|mali|bamako|burkina|ouagadougou|senegal|sénégal|dakar|cameroon|cameroun|yaound[ée]|douala|ghana|accra|kenya|nairobi|uganda|ouganda|kampala|tanzania|tanzanie|ethiopia|éthiopie|addis|sudan|soudan|zambia|zambie|malawi|rwanda|kigali|benin|bénin|togo|lomé|ivory\s+coast|côte\s+d['’]ivoire|abidjan|guinea|guinée|mauritania|mauritanie|congo|kinshasa|zimbabwe|mozambique|somalia|somalie)(?!\p{L})/iu
const AILLEURS = /african[\s-]+american|(?<!\p{L})(america|american|usa|europe|european|india|indian|indonesia|papua|haiti|haitian|brazil|asia|asian|china|chinese|japan|mexico|philippines)(?!\p{L})/iu
export function photoAfricaine(alt: string | null | undefined): boolean {
  const t = alt ?? ''
  return AFRIQUE.test(t) && !AILLEURS.test(t)
}
