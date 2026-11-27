/**
 * LE JUGE DE LA LECTURE PUBLIQUE — ce qu'un visiteur sans compte peut lire
 * doit être ce que la page publique lui montre (2026-11-23).
 *
 * ── LE DÉFAUT MESURÉ, ET POURQUOI IL FALLAIT UN JUGE.
 *
 * `lecturePublique: true` ouvrait la table entière. Sur atitta, la page de
 * suivi téléchargeait chaque véhicule — plaque et client compris — pour n'en
 * afficher qu'un état ; sur la place de marché, un `.filter(x => !x.masque)`
 * cachait à l'écran des produits que la base rendait à tout le monde. Aucun
 * des juges existants ne regardait ce qu'un visiteur RECEVAIT.
 *
 * La base tient désormais colonnes et lignes (`lecturePubliqueEmise`). Ce
 * juge vérifie que la déclaration et le code s'accordent, AVANT livraison :
 *
 *   ① `sans-champs`      table publique sans colonnes publiques valides :
 *                        le visiteur ne recevra rien, la page sera vide ;
 *   ② `lecture-entiere`  aucune lecture de la table ne se borne à ses
 *                        colonnes publiques (`select('*')`) : chez le
 *                        visiteur la base la refuse, la page est vide ;
 *   ③ `champ-non-lu`     une colonne déclarée publique qu'aucune lecture
 *                        bornée ne demande : lisible par tous, montrée
 *                        nulle part — c'est la fuite d'atitta ;
 *   ④ `tri-a-l-ecran`    une colonne vrai/faux de la table publique sert à
 *                        trier des lignes dans un `.filter(` sans être une
 *                        condition de ligne déclarée : la base rendrait les
 *                        lignes cachées — c'est la fuite de la place de
 *                        marché.
 *
 * ── CE QU'IL NE VOIT PAS, ET IL FAUT LE DIRE.
 *
 * Il lit le CODE, pas l'écran : « demandé par une lecture bornée » approche
 * « affiché », sans l'égaler. Une colonne lue pour servir de clé de
 * recherche (la plaque d'atitta) et jamais montrée passerait ③. Il ne sait
 * pas non plus quelle lecture appartient à la face publique : une lecture
 * bornée écrite dans la gestion compte comme publique. La règle de la
 * consigne couvre le premier cas ; aucun cliquet ne le mesure.
 */
import { lectureParCleLue, lecturePubliqueDe, lecturePubliqueLue, nomColonne, nomTable, type EntiteDeclaree } from './entites-declarees'

export type DefautLecturePublique =
  | { readonly genre: 'sans-champs'; readonly table: string; readonly motif: string }
  | { readonly genre: 'lecture-entiere'; readonly table: string }
  | { readonly genre: 'champ-non-lu'; readonly table: string; readonly champ: string }
  | { readonly genre: 'tri-a-l-ecran'; readonly table: string; readonly champ: string }
  | { readonly genre: 'par-cle-refusee'; readonly table: string; readonly motif: string }
  | { readonly genre: 'par-cle-non-appelee'; readonly table: string }

/** Une lecture `from('t')…select('…')`, telle que le code l'écrit. */
type Lecture = { readonly table: string; readonly colonnes: readonly string[] | null; readonly filtres: readonly string[] }

const IDENT = /^[a-z_][a-z0-9_]*$/u

/**
 * LES LECTURES DU CODE. `colonnes` vaut `null` quand la lecture n'est pas une
 * simple liste de colonnes (`*`, rien, une jointure, un alias) : elle ne se
 * borne donc à rien.
 */
export function lecturesDuCode(fichiers: ReadonlyMap<string, string>): Lecture[] {
  const lectures: Lecture[] = []
  const motif = /\.from\(\s*(['"`])([a-z_][a-z0-9_]*)\1\s*\)/gu
  for (const [chemin, code] of fichiers) {
    if (chemin.startsWith('systeme/') || !/\.(?:tsx?|jsx?)$/u.test(chemin)) continue
    for (const m of code.matchAll(motif)) {
      const table = m[2] ?? ''
      const debut = (m.index ?? 0) + m[0].length
      // LA CHAÎNE s'arrête au premier `;` — au plus 600 signes.
      const reste = code.slice(debut, debut + 600)
      const fin = reste.indexOf(';')
      const chaine = fin < 0 ? reste : reste.slice(0, fin)
      const sel = /^\s*\.select\(\s*(?:(['"`])([^'"`]*)\1|([A-Za-z_$][\w$]*))?\s*[,)]/u.exec(chaine)
      if (sel === null) continue // une écriture, pas une lecture
      // ── UNE CONSTANTE SE RÉSOUT (2026-11-27). Mesuré le 26 : `.select(
      // COLONNES_PUBLIQUES)` était pris pour une ÉCRITURE et ignoré — deux
      // modifications justes refusées. Une constante introuvable dans le
      // fichier compte comme une lecture qui ne se borne à rien.
      const brut = sel[3] === undefined ? sel[2] : constanteDe(code, sel[3]) ?? '*'
      const morceaux = brut === undefined ? [] : brut.split(',').map((x) => x.trim()).filter((x) => x !== '')
      const colonnes = morceaux.length > 0 && morceaux.every((x) => IDENT.test(x)) ? morceaux : null
      const filtres = [...chaine.matchAll(/\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|order|contains|textSearch)\(\s*(['"`])([a-z_][a-z0-9_]*)\1/gu)].map((f) => f[2] ?? '')
      lectures.push({ table, colonnes, filtres })
    }
  }
  return lectures
}

/** La valeur d'une constante de texte du fichier (`const X = 'a, b'`), ou `null`. */
function constanteDe(code: string, nom: string): string | null {
  const echappe = nom.replace(/\$/gu, '\\$')
  const m = new RegExp(`\\bconst\\s+${echappe}\\s*(?::\\s*string\\s*)?=\\s*(['"\`])([^'"\`]*)\\1`, 'u').exec(code)
  return m === null ? null : (m[2] ?? null)
}

/** Les colonnes vrai/faux qu'un `.filter(` du code consulte. */
export function colonnesTrieesALEcran(fichiers: ReadonlyMap<string, string>, booleens: readonly string[]): Set<string> {
  const vues = new Set<string>()
  if (booleens.length === 0) return vues
  for (const [chemin, code] of fichiers) {
    if (chemin.startsWith('systeme/') || !/\.(?:tsx?|jsx?)$/u.test(chemin)) continue
    for (const m of code.matchAll(/\.filter\(/gu)) {
      const corps = code.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 240)
      for (const b of booleens) if (new RegExp(`\\.${b}\\b`, 'u').test(corps)) vues.add(b)
    }
  }
  return vues
}

/** Le code appelle-t-il `.rpc('<fonction>'` hors de `systeme/` ? */
function appelleLaFonction(fichiers: ReadonlyMap<string, string>, fonction: string): boolean {
  const motif = new RegExp(`\\.rpc\\(\\s*(['"\`])${fonction}\\1`, 'u')
  for (const [chemin, code] of fichiers) {
    if (chemin.startsWith('systeme/') || !/\.(?:tsx?|jsx?)$/u.test(chemin)) continue
    if (motif.test(code)) return true
  }
  return false
}

export function jugerLecturePublique(
  entites: readonly EntiteDeclaree[],
  fichiers: ReadonlyMap<string, string>,
): DefautLecturePublique[] {
  const defauts: DefautLecturePublique[] = []
  // ── LA LECTURE PAR CLÉ (É1) : la déclaration doit s'ouvrir, et la page doit
  //    passer par la fonction — pas par `.from(t).select`, que la base rend vide.
  for (const e of entites) {
    if (e.lectureParCle === undefined) continue
    const t = nomTable(e)
    const lue = lectureParCleLue(e)
    if (!lue.ok) defauts.push({ genre: 'par-cle-refusee', table: t, motif: lue.motif })
    else if (!appelleLaFonction(fichiers, `${t}_par_cle`)) defauts.push({ genre: 'par-cle-non-appelee', table: t })
  }
  const publiques = entites.filter(lecturePubliqueDe)
  if (publiques.length === 0) return defauts
  const lectures = lecturesDuCode(fichiers)
  for (const e of publiques) {
    const t = nomTable(e)
    const lue = lecturePubliqueLue(e)
    if (!lue.ok) {
      defauts.push({ genre: 'sans-champs', table: t, motif: lue.motif })
      continue
    }
    const permises = new Set(lue.colonnes)
    const bornees = lectures.filter(
      (l) => l.table === t && l.colonnes !== null && l.colonnes.every((c) => permises.has(c)) && l.filtres.every((c) => permises.has(c)),
    )
    // Aucune lecture bornée : UN défaut, pas un par colonne — le reproche
    // « lis exactement ces colonnes » couvre déjà chacune.
    if (bornees.length === 0) defauts.push({ genre: 'lecture-entiere', table: t })
    const demandees = new Set(bornees.flatMap((l) => [...(l.colonnes ?? []), ...l.filtres]))
    const conditions = new Set(lue.conditions.map((c) => c.champ))
    for (const c of lue.colonnes) {
      // `id` est toujours accordé (une clé de liste) ; une colonne de
      // condition a la même valeur sur toutes les lignes rendues.
      if (c === 'id' || conditions.has(c)) continue
      if (bornees.length > 0 && !demandees.has(c)) defauts.push({ genre: 'champ-non-lu', table: t, champ: c })
    }
    const booleens = e.fields.filter((f) => f.type === 'boolean').map(nomColonne).filter((c) => !conditions.has(c))
    for (const c of colonnesTrieesALEcran(fichiers, booleens)) defauts.push({ genre: 'tri-a-l-ecran', table: t, champ: c })
  }
  return defauts
}

/** Le reproche envoyé au modèle, ou `null`. */
export function reprocheLecturePublique(d: readonly DefautLecturePublique[]): string | null {
  if (d.length === 0) return null
  const ligne = (x: DefautLecturePublique): string => {
    switch (x.genre) {
      case 'sans-champs':
        return `- « ${x.table} » est publique mais ne dit pas ce que le visiteur reçoit (${x.motif}) : ajoute "champsPublics" à sa déclaration — sans lui, la page publique est VIDE.`
      case 'lecture-entiere':
        return `- « ${x.table} » : aucune lecture ne se borne à ses colonnes publiques. La page publique doit lire EXACTEMENT ces colonnes (select('id, …')), jamais « * » — chez le visiteur la base refuse le reste.`
      case 'champ-non-lu':
        return `- « ${x.table}.${x.champ} » est déclaré public mais aucune lecture ne le demande : n'importe qui le lirait sans le voir. Retire-le de "champsPublics" s'il n'est pas affiché.`
      case 'tri-a-l-ecran':
        return `- « ${x.table}.${x.champ} » trie des lignes à l'écran seulement : la base les rendrait quand même à tout le monde. Déclare "lignesPubliques": [{"champ": "${x.champ}", "vaut": …}].`
      case 'par-cle-refusee':
        return `- « ${x.table} » : la lecture par clé ne s'ouvre pas (${x.motif}). La clé est un champ texte "unique": true de la table, et "champs" nomme des colonnes qui existent.`
      case 'par-cle-non-appelee':
        return `- « ${x.table} » se lit par clé, mais aucune page n'appelle base.rpc('${x.table}_par_cle', { p_cle: … }). Chez le visiteur, c'est le SEUL chemin : une lecture .from('${x.table}') lui rend une liste vide.`
    }
  }
  return 'CE QU’UN VISITEUR SANS COMPTE RECEVRAIT N’EST PAS CE QUE LA PAGE LUI MONTRE :\n' + d.map(ligne).join('\n')
}

/**
 * À LA LIVRAISON, CE QUI RESTE EN DÉFAUT SE FERME — jamais ne s'ouvre.
 *
 * Le dernier tour de la boucle est livré tel quel. Si le défaut y reste, la
 * fuite ne part pas avec lui : une colonne publique jamais lue sort de
 * `champsPublics` ; une table qui trie à l'écran, ou dont la page lit la
 * table entière, perd sa lecture publique.
 * La page peut en être vide — c'est le sens sûr, et la note le dit.
 */
export function fermerCeQuiFuit(
  entites: readonly EntiteDeclaree[],
  defauts: readonly DefautLecturePublique[],
): { readonly entites: readonly EntiteDeclaree[]; readonly fermes: readonly string[] } {
  if (defauts.length === 0) return { entites, fermes: [] }
  const fermes: string[] = []
  const sorties = entites.map((e) => {
    const t = nomTable(e)
    const siens = defauts.filter((d) => d.table === t)
    if (siens.length === 0) return e
    // ── UNE LECTURE PAR CLÉ EN DÉFAUT SE RETIRE (É1) : la page de suivi sera
    //    vide, jamais ouverte de travers.
    if (siens.some((d) => d.genre === 'par-cle-refusee' || d.genre === 'par-cle-non-appelee')) {
      fermes.push(`${t} : lecture par clé retirée (${siens.some((d) => d.genre === 'par-cle-refusee') ? 'déclaration refusée' : 'aucune page ne l’appelait'})`)
      const { lectureParCle, ...reste } = e
      void lectureParCle
      e = reste
      if (siens.every((d) => d.genre === 'par-cle-refusee' || d.genre === 'par-cle-non-appelee')) return e
    }
    if (siens.some((d) => d.genre === 'tri-a-l-ecran')) {
      fermes.push(`${t} : lecture publique retirée (des lignes n’étaient cachées qu’à l’écran)`)
      return { ...e, lecturePublique: false }
    }
    // ── LA PAGE NE LIT PAS SES COLONNES : elle sera vide chez le visiteur,
    // mais les colonnes déclarées resteraient lisibles par l'API. On ferme.
    if (siens.some((d) => d.genre === 'lecture-entiere')) {
      fermes.push(`${t} : lecture publique retirée (la page lisait la table entière)`)
      return { ...e, lecturePublique: false }
    }
    const nonLus = new Set(siens.flatMap((d) => (d.genre === 'champ-non-lu' ? [d.champ] : [])))
    if (nonLus.size === 0 || !Array.isArray(e.champsPublics)) return e
    fermes.push(`${t} : ${[...nonLus].join(', ')} retiré(s) de ce que le visiteur reçoit`)
    return { ...e, champsPublics: e.champsPublics.filter((c) => !nonLus.has(c.replace(/^fld_/u, ''))) }
  })
  return { entites: sorties, fermes }
}
