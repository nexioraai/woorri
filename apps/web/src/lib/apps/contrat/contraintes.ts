/**
 * LES CONTRAINTES FERMÉES — langues, devises, moyens de paiement, pays.
 *
 * Elles viennent de la LECTURE du cahier (`lectureBrief`) ; le validateur
 * refuse toute valeur que la lecture ne nomme pas. Une liste lue VIDE ne
 * laisse rien passer : un inconnu reste inconnu (le cahier de Hayine ne nomme
 * aucun moyen de paiement — §6.1 les renvoie aux capacités des fournisseurs ;
 * un écran qui écrit « Orange Money » invente). Exception : sans langue lue,
 * le français seul.
 *
 * Les noms reconnus sont une liste finie : ce juge ne voit pas un nom qu'elle
 * ne contient pas. C'est sa frontière, dite ici plutôt que comblée.
 */
import { normaliser } from './proche'

/** code ISO 639-1 → les noms sous lesquels un écran l'écrit. */
export const NOMS_DE_LANGUES: Readonly<Record<string, readonly string[]>> = {
  fr: ['Français', 'Francais', 'French', 'الفرنسية'],
  en: ['English', 'Anglais', 'الإنجليزية'],
  ar: ['العربية', 'Arabe', 'Arabic'],
  sw: ['Kiswahili', 'Swahili'],
  es: ['Español', 'Espagnol', 'Spanish'],
  pt: ['Português', 'Portugais', 'Portuguese'],
  de: ['Deutsch', 'Allemand', 'German'],
  it: ['Italiano', 'Italien', 'Italian'],
  zh: ['中文', 'Chinois', 'Chinese'],
  ru: ['Русский', 'Russe', 'Russian'],
  tr: ['Türkçe', 'Turc', 'Turkish'],
  ha: ['Hausa', 'Haoussa'],
  wo: ['Wolof'],
  ln: ['Lingala'],
  ff: ['Fulfulde', 'Peul', 'Pulaar'],
  am: ['አማርኛ', 'Amharique', 'Amharic'],
}

export const MOYENS_DE_PAIEMENT: readonly (readonly string[])[] = [
  ['Orange Money'], ['MTN Mobile Money', 'MTN MoMo', 'MoMo'], ['Airtel Money'], ['Moov Money', 'Flooz'], ['Wave'],
  ['M-Pesa', 'MPesa'], ['PayPal'], ['Stripe'], ['Mastercard'], ['carte bancaire', 'carte de crédit', 'credit card'],
  ['Apple Pay'], ['Google Pay'], ['T-Money'], ['Express Union'], ['Western Union'],
]

export const PAYS: readonly (readonly string[])[] = [
  ['Tchad', 'Chad'], ['Cameroun', 'Cameroon'], ['Nigeria'], ['Niger'], ['Sénégal', 'Senegal'], ['Côte d’Ivoire', "Côte d'Ivoire", 'Ivory Coast'],
  ['Gabon'], ['Congo'], ['Kenya'], ['Ghana'], ['Mali'], ['Burkina Faso'], ['Bénin', 'Benin'], ['Togo'], ['Guinée', 'Guinea'],
  ['Maroc', 'Morocco'], ['Algérie', 'Algeria'], ['Tunisie', 'Tunisia'], ['Égypte', 'Egypte', 'Egypt'], ['Soudan', 'Sudan'],
  ['Éthiopie', 'Ethiopie', 'Ethiopia'], ['Rwanda'], ['Ouganda', 'Uganda'], ['Tanzanie', 'Tanzania'], ['Afrique du Sud', 'South Africa'],
  ['Belgique', 'Belgium'], ['Canada'], ['États-Unis', 'Etats-Unis', 'United States'], ['Chine', 'China'],
  ['Émirats arabes unis', 'Emirats arabes unis', 'United Arab Emirates'], ['Arabie saoudite', 'Saudi Arabia'], ['Turquie', 'Turkey'],
]

/** code ISO 4217 → ses écritures. FCFA vaut XAF ou XOF. */
export const DEVISES: Readonly<Record<string, readonly string[]>> = {
  XAF: ['XAF', 'FCFA', 'F CFA'], XOF: ['XOF', 'FCFA', 'F CFA'], EUR: ['EUR', '€'], USD: ['USD', 'US$'], GBP: ['GBP', '£'],
  NGN: ['NGN', '₦'], KES: ['KES'], GHS: ['GHS'], MAD: ['MAD'], EGP: ['EGP'], ZAR: ['ZAR'], CNY: ['CNY', '¥'], AED: ['AED'],
  SAR: ['SAR'], TRY: ['TRY', '₺'], CAD: ['CAD'], CHF: ['CHF'],
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
/** Un motif par nom, compilé une fois (mesuré : la recompilation par texte coûtait l'essentiel des 6 ms par spec). */
const MOTIFS = new Map<string, RegExp>()
const present = (texte: string, nom: string): boolean => {
  let motif = MOTIFS.get(nom)
  if (motif === undefined) {
    const lettre = /^[\p{L}\p{N}]/u.test(nom) && /[\p{L}\p{N}]$/u.test(nom)
    motif = lettre ? new RegExp(`(?<![\\p{L}\\p{N}])${echapper(nom)}(?![\\p{L}\\p{N}])`, 'u') : new RegExp(echapper(nom), 'u')
    MOTIFS.set(nom, motif)
  }
  return motif.test(texte)
}

/** Tous les noms, en une expression : un sur-ensemble de ce que `present` reconnaît (sans les bornes de mot). */
const TOUS_LES_NOMS = new RegExp(
  [...Object.values(NOMS_DE_LANGUES).flat(), ...MOYENS_DE_PAIEMENT.flat(), ...PAYS.flat(), ...Object.values(DEVISES).flat()]
    .map(echapper).join('|'),
  'u',
)

export type Lecture = {
  readonly langues: readonly string[]
  readonly devises: readonly string[]
  readonly moyensPaiement: readonly string[]
  readonly pays: readonly string[]
}

export const languesPermises = (l: Lecture): readonly string[] => (l.langues.length > 0 ? l.langues : ['fr'])

/** Ce qu'un texte nomme hors de la lecture. */
export function horsLecture(texte: string, l: Lecture): { classe: 'LANGUE_HORS_LECTURE' | 'DEVISE_HORS_LECTURE' | 'PAIEMENT_HORS_LECTURE' | 'PAYS_HORS_LECTURE'; nom: string }[] {
  // Préfiltre : un texte qui ne contient AUCUN nom connu ne peut rien nommer hors lecture.
  if (!TOUS_LES_NOMS.test(texte)) return []
  const r: { classe: 'LANGUE_HORS_LECTURE' | 'DEVISE_HORS_LECTURE' | 'PAIEMENT_HORS_LECTURE' | 'PAYS_HORS_LECTURE'; nom: string }[] = []
  const langues = languesPermises(l)
  for (const [code, noms] of Object.entries(NOMS_DE_LANGUES)) {
    if (langues.includes(code)) continue
    for (const n of noms) if (present(texte, n)) r.push({ classe: 'LANGUE_HORS_LECTURE', nom: n })
  }
  const lus = (liste: readonly string[]) => new Set(liste.map(normaliser))
  const moyensLus = lus(l.moyensPaiement)
  for (const groupe of MOYENS_DE_PAIEMENT) {
    if (groupe.some((n) => moyensLus.has(normaliser(n)))) continue
    for (const n of groupe) if (present(texte, n)) { r.push({ classe: 'PAIEMENT_HORS_LECTURE', nom: n }); break }
  }
  const paysLus = lus(l.pays)
  for (const groupe of PAYS) {
    if (groupe.some((n) => paysLus.has(normaliser(n)))) continue
    for (const n of groupe) if (present(texte, n)) { r.push({ classe: 'PAYS_HORS_LECTURE', nom: n }); break }
  }
  const devisesLues = new Set(l.devises.map((d) => d.toUpperCase()))
  const ecrituresPermises = new Set([...devisesLues].flatMap((d) => DEVISES[d] ?? [d]))
  for (const [code, ecritures] of Object.entries(DEVISES)) {
    if (devisesLues.has(code)) continue
    for (const n of ecritures) {
      if (ecrituresPermises.has(n)) continue
      if (present(texte, n)) { r.push({ classe: 'DEVISE_HORS_LECTURE', nom: n }); break }
    }
  }
  return r
}
