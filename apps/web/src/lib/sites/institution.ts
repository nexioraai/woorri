// LE NOM DE L'INSTITUTION DANS LES TEXTES (lot 2 « textes neutres », 2026-11-26).
//
// Les textes des espaces (profil, dossier, commandes, messages…) disaient
// « la Centrale » en dur : écrits pour la CPA, ils parlaient de la CPA sur
// n'importe quel site. Ils portent maintenant des JETONS, remplacés par la
// désignation DU SITE (colonne `sites.designation`, dans la langue du site) :
//
//   fr : {{la}} « la Centrale » · {{La}} « La Centrale » · {{de}} « de la Centrale »
//        · {{a}} « à la Centrale » · {{nu}} « Centrale »
//   en : {{the}} « the Centrale » · {{The}} « The Centrale » · {{nu}} « Centrale »
//   es : {{la}} · {{La}} · {{de}} « de la Central » · {{a}} « a la Central » · {{nu}}
//   ar : {{al}} « المركزية » (les préfixes ب، إلى… restent dans le texte)
//
// Sans désignation : un nom GÉNÉRIQUE par langue (« l’établissement »…).
// La CPA a pour désignation « la Centrale » : ses textes sont, au caractère
// près, ceux d'avant (cliquet `institution.test.ts`).
//
// PUR : aucune lecture. Importable côté navigateur.

export type Institution = {
  readonly la: string
  readonly La: string
  readonly de: string
  readonly a: string
  readonly nu: string
  readonly the: string
  readonly The: string
  readonly al: string
}

/** Le nom générique, par langue, quand le site n'a pas de désignation. */
export const DESIGNATION_GENERIQUE: Readonly<Record<'fr' | 'en' | 'es' | 'ar', string>> = {
  fr: 'l’établissement',
  en: 'the organisation',
  es: 'la institución',
  ar: 'المؤسسة',
}

const majuscule = (s: string) => (s === '' ? s : s.charAt(0).toLocaleUpperCase('fr') + s.slice(1))

function formesFr(d: string): Pick<Institution, 'la' | 'La' | 'de' | 'a' | 'nu'> {
  const t = d.trim()
  let m = /^(la|le)\s+(.+)$/iu.exec(t)
  if (m) {
    const art = m[1].toLowerCase(), nom = m[2]
    return art === 'la'
      ? { la: `la ${nom}`, La: `La ${nom}`, de: `de la ${nom}`, a: `à la ${nom}`, nu: majuscule(nom) }
      : { la: `le ${nom}`, La: `Le ${nom}`, de: `du ${nom}`, a: `au ${nom}`, nu: majuscule(nom) }
  }
  m = /^l['’]\s*(.+)$/iu.exec(t)
  if (m) return { la: `l’${m[1]}`, La: `L’${m[1]}`, de: `de l’${m[1]}`, a: `à l’${m[1]}`, nu: majuscule(m[1]) }
  m = /^les\s+(.+)$/iu.exec(t)
  if (m) return { la: `les ${m[1]}`, La: `Les ${m[1]}`, de: `des ${m[1]}`, a: `aux ${m[1]}`, nu: majuscule(m[1]) }
  // Un nom propre sans article (« Médecins du Monde ») : tel quel.
  return { la: t, La: majuscule(t), de: `de ${t}`, a: `à ${t}`, nu: majuscule(t) }
}

function formesEn(d: string): Pick<Institution, 'the' | 'The' | 'nu'> {
  const t = d.trim()
  const m = /^the\s+(.+)$/iu.exec(t)
  return m ? { the: `the ${m[1]}`, The: `The ${m[1]}`, nu: m[1] } : { the: t, The: majuscule(t), nu: t }
}

function formesEs(d: string): Pick<Institution, 'la' | 'La' | 'de' | 'a' | 'nu'> {
  const t = d.trim()
  let m = /^(la|las|los)\s+(.+)$/iu.exec(t)
  if (m) {
    const art = m[1].toLowerCase(), nom = m[2]
    return { la: `${art} ${nom}`, La: `${majuscule(art)} ${nom}`, de: `de ${art} ${nom}`, a: `a ${art} ${nom}`, nu: nom }
  }
  m = /^el\s+(.+)$/iu.exec(t)
  if (m) return { la: `el ${m[1]}`, La: `El ${m[1]}`, de: `del ${m[1]}`, a: `al ${m[1]}`, nu: m[1] }
  return { la: t, La: majuscule(t), de: `de ${t}`, a: `a ${t}`, nu: t }
}

/**
 * Les formes du nom de l'institution pour la langue du site. La désignation
 * est écrite DANS la langue du site ; les autres langues gardent le générique.
 */
export function institution(lang: string | null | undefined, designation: string | null | undefined): Institution {
  const l = ((lang ?? 'fr').slice(0, 2) as keyof typeof DESIGNATION_GENERIQUE)
  const langue: keyof typeof DESIGNATION_GENERIQUE = l in DESIGNATION_GENERIQUE ? l : 'fr'
  const d = (designation ?? '').trim()
  const de = (x: keyof typeof DESIGNATION_GENERIQUE) => (langue === x && d !== '' ? d : DESIGNATION_GENERIQUE[x])
  const fr = formesFr(de('fr')), en = formesEn(de('en')), es = formesEs(de('es'))
  const nu = langue === 'en' ? en.nu : langue === 'es' ? es.nu : langue === 'ar' ? de('ar') : fr.nu
  const pourLangue = langue === 'es' ? es : fr
  return { la: pourLangue.la, La: pourLangue.La, de: pourLangue.de, a: pourLangue.a, nu, the: en.the, The: en.The, al: de('ar') }
}

const JETON = /\{\{(la|La|de|a|nu|the|The|al)\}\}/gu

/** Remplace les jetons dans une chaîne, ou dans TOUTES les chaînes d'un objet de mots. */
export function accorder<T>(valeur: T, i: Institution): T {
  if (typeof valeur === 'string') return valeur.replace(JETON, (_, k: keyof Institution) => i[k]) as T
  if (Array.isArray(valeur)) return valeur.map((v) => accorder(v, i)) as T
  if (valeur !== null && typeof valeur === 'object') {
    const sortie: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valeur as Record<string, unknown>)) sortie[k] = accorder(v, i)
    return sortie as T
  }
  return valeur
}

/**
 * Le sigle d'un site — MIROIR de `public.initiales_du_site` (messages_reference_sigle.sql) :
 * le sigle DONNÉ entre parenthèses (2 à 6 majuscules) prime ; sinon les initiales
 * des mots d'au moins 3 lettres, 4 au plus ; sinon « REF ».
 */
export function sigleDuSite(nom: string | null | undefined): string {
  const n = nom ?? ''
  const s = /\(([A-ZÀ-Ý]{2,6})\)/u.exec(n)
  if (s) return s[1]
  const sans = n.replace(/\([^)]*\)/gu, '')
  const mots = sans.match(/[\p{L}\p{N}]{3,}/gu) ?? []
  const i = mots.map((m) => m.charAt(0)).join('').slice(0, 4).toUpperCase()
  return i !== '' ? i : 'REF'
}

/** L'exemple affiché dans le champ « référence » du suivi : le sigle du site, l'année, six X. */
export function exempleDeReference(nom: string | null | undefined, annee: number = new Date().getFullYear()): string {
  return `${sigleDuSite(nom)}-${annee}-XXXXXX`
}
