/**
 * LE CONSTRUCTEUR DÉCLARE CE DONT IL A BESOIN, AU MOMENT OÙ IL LE CONSTRUIT.
 *
 * ── LE DÉFAUT MESURÉ EN PRODUCTION LE 2026-11-04.
 *
 * Demande : « application mobile pour calculer la consommation d\u2019énergie
 * sur mon compteur de SNE ». La lecture du brief a déclaré une table
 * `releve` — vérifié par un tir réel. Le constructeur, lui, a dessiné un
 * `composants/Historique.tsx` et rangé les relevés dans `localStorage`.
 *
 * Dans ce cas-là, la déclaration avait vu juste. Mais elle n\u2019en avait
 * aucun mérite : elle lit UNE PHRASE pendant que la conception invente des
 * ÉCRANS. « Calculer ma consommation » ne dit pas « historique ».
 *
 *   « La vérité sur ce qu\u2019il faut conserver n\u2019est pas dans la demande.
 *     Elle est dans ce qui a été CONSTRUIT. »
 *
 * C\u2019est la règle « juge ce qui part, pas la source », appliquée au schéma.
 * Déclarer avant de concevoir, c\u2019est demander à la déclaration de deviner
 * ce que la conception n\u2019a pas encore décidé.
 *
 * ── UNE SEULE GRAMMAIRE, PAS DEUX.
 *
 * La déclaration en route emploie EXACTEMENT la forme que rend la lecture
 * du brief, et le MÊME validateur. Une seconde grammaire divergerait — et
 * la divergence se découvrirait en production, sur une table posée de
 * travers.
 *
 * ── ET LE FICHIER NE PART PAS DANS L\u2019APPLICATION.
 *
 * `DONNEES.json` est une DÉCLARATION, pas du code. Le livrer mettrait un
 * fichier mort dans l\u2019archive de la personne, et le juge de couverture
 * compterait un fichier qu\u2019aucun écran n\u2019ouvre.
 */
import { lireEntites, type EntiteDeclaree, type RefusEntite } from './entites-declarees'

/** Le nom réservé, hors de l\u2019espace des fichiers de l\u2019application. */
export const FICHIER_DECLARATION = 'DONNEES.json'

export type DeclarationEnRoute = {
  /** Ce que le constructeur a déclaré, validé par la grammaire du cahier. */
  readonly entites: readonly EntiteDeclaree[]
  /** Ce qui a été refusé, et pourquoi — jamais tu. */
  readonly refus: readonly RefusEntite[]
  /** Les fichiers de l\u2019application, la déclaration RETIRÉE. */
  readonly fichiers: ReadonlyMap<string, string>
  /**
   * L'ERREUR EXACTE quand le fichier est là mais qu'aucun JSON n'y est
   * trouvable ; `null` sinon (absent, ou lu). Elle part au modèle (2026-11-28).
   */
  readonly illisible: string | null
  /** La valeur JSON retenue, telle quelle — pour dire l'erreur exacte du contrat. */
  readonly valeurLue: unknown
}

/**
 * TROUVE LE JSON DANS CE QUE LE MODÈLE A ÉCRIT (2026-11-28).
 *
 * ── LE DÉFAUT MESURÉ : la retouche de 18:06 sur « Suivi de colis ».
 *
 * Le modèle a rendu un JSON VALIDE, puis 803 signes de prose dans la même
 * section (« Ce que j'ai ajouté, en clair : … »). `JSON.parse` sur la section
 * entière échouait (`Unexpected non-whitespace character after JSON`), et la
 * déclaration était jetée : c'est le lecteur qui avait tort, pas le modèle.
 *
 * On essaie, dans l'ordre : la section entière ; le contenu des balises
 * ```json ; puis chaque `[` ou `{` jusqu'à sa fermeture équilibrée (les
 * chaînes comprises). Le premier tableau valide gagne, à défaut le premier
 * objet `{ entites }`, à défaut le premier JSON valide. On ne rejette que si
 * AUCUN JSON n'est trouvable — et on rend alors l'erreur exacte du parseur.
 */
export function extraireJson(
  brut: string,
): { readonly ok: true; readonly valeur: unknown } | { readonly ok: false; readonly erreur: string } {
  const entier = brut.trim()
  let erreur = ''
  try {
    return { ok: true, valeur: JSON.parse(entier) }
  } catch (e) {
    erreur = e instanceof Error ? e.message : String(e)
  }
  const candidats: string[] = []
  for (const m of entier.matchAll(/```[a-zA-Z]*[ \t]*\n([\s\S]*?)```/gu)) candidats.push(m[1]!.trim())
  for (let i = 0; i < entier.length && candidats.length < 50; i += 1) {
    const c = entier[i]
    if (c !== '[' && c !== '{') continue
    const fin = fermeture(entier, i)
    if (fin !== -1) candidats.push(entier.slice(i, fin + 1))
  }
  const valides: unknown[] = []
  for (const c of candidats) {
    try {
      valides.push(JSON.parse(c))
    } catch {
      // un candidat illisible n'arrête pas la recherche
    }
  }
  // Le premier, dans l'ordre du texte, qui A LA FORME d'une déclaration : une
  // liste d'objets, ou `{ entites: [...] }`. Un « [1] » de la prose est un
  // JSON valide, mais ce n'est pas une déclaration.
  const forme = valides.find(
    (v) =>
      (Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && !Array.isArray(x))) ||
      Array.isArray((v as { entites?: unknown } | null)?.entites),
  )
  if (forme !== undefined) return { ok: true, valeur: forme }
  if (valides.length > 0) return { ok: true, valeur: valides[0] }
  return { ok: false, erreur }
}

/** L'indice du crochet qui ferme celui de `debut`, chaînes JSON comprises ; -1 sinon. */
function fermeture(s: string, debut: number): number {
  const pile: string[] = []
  let dansChaine = false
  for (let i = debut; i < s.length; i += 1) {
    const c = s[i]
    if (dansChaine) {
      if (c === '\\') i += 1
      else if (c === '"') dansChaine = false
      continue
    }
    if (c === '"') dansChaine = true
    else if (c === '[' || c === '{') pile.push(c === '[' ? ']' : '}')
    else if (c === ']' || c === '}') {
      if (pile.pop() !== c) return -1
      if (pile.length === 0) return i
    }
  }
  return -1
}

/**
 * Lit la déclaration si elle est là, et rend les fichiers sans elle.
 *
 * Un JSON illisible ne fait pas échouer la construction : il ne déclare
 * rien, et le juge de persistance dira que l\u2019application veut se souvenir
 * sans table. Un reproche vaut mieux qu\u2019une exception — le modèle peut
 * répondre à l\u2019un, pas à l\u2019autre.
 */
export function lireDeclarationEnRoute(
  fichiers: ReadonlyMap<string, string>,
  valider: (e: unknown) => boolean,
): DeclarationEnRoute {
  const brut = fichiers.get(FICHIER_DECLARATION)
  if (brut === undefined) return { entites: [], refus: [], fichiers, illisible: null, valeurLue: undefined }

  // ── ON FILTRE, ON NE RETIRE PAS.
  //
  // `Map.delete` ferait rougir le cliquet qui garde la séquence de
  // suppression des lignes du banc : il lit la FORME `.delete(`. Sa
  // propriété est juste ; élargir sa dérogation pour une carte en mémoire
  // affaiblirait une garde de données réelles. Un filtre dit la même chose.
  const restants = new Map([...fichiers].filter(([n]) => n !== FICHIER_DECLARATION))

  const extrait = extraireJson(brut)
  if (!extrait.ok) {
    return { entites: [], refus: [], fichiers: restants, illisible: extrait.erreur, valeurLue: undefined }
  }
  const valeur = extrait.valeur
  // Le modèle peut rendre le tableau nu ou l\u2019envelopper : on accepte les
  // deux plutôt que de perdre une déclaration juste sur une accolade.
  const tableau = Array.isArray(valeur)
    ? valeur
    : ((valeur as { entites?: unknown } | null)?.entites ?? null)
  const lu = lireEntites(tableau, valider)
  return { entites: lu.entites, refus: lu.refus, fichiers: restants, illisible: null, valeurLue: valeur }
}

/**
 * CE QUI NE VA PAS DANS LA DÉCLARATION, DIT EXACTEMENT — ou `null` (2026-11-28).
 *
 * Trois cas : aucun JSON trouvable (l'erreur du parseur) ; un JSON qui n'est
 * pas une liste de tables ; des tables refusées par le contrat (chaque erreur
 * de zod, chemin compris — « forme refusée » ne dit pas quoi corriger).
 * C'est ce texte qui part au modèle pour qu'il corrige.
 */
export function problemeDeclaration(
  dec: DeclarationEnRoute,
  analyser: (e: unknown) => { readonly success: boolean; readonly error?: { readonly issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[] } },
): string | null {
  if (dec.illisible !== null) return `DONNEES.json ne contient aucun JSON lisible : ${dec.illisible}`
  if (dec.valeurLue === undefined) return null
  const tableau = Array.isArray(dec.valeurLue)
    ? dec.valeurLue
    : (dec.valeurLue as { entites?: unknown } | null)?.entites
  if (!Array.isArray(tableau)) {
    return 'DONNEES.json doit être une liste de tables : [ { "id": "ent_<nom>", "name": "<nom>", "fields": [ … ] } ]'
  }
  if (dec.refus.length === 0) return null
  const lignes = dec.refus.map((r) => {
    const brut = tableau.find((t) => {
      const x = t as { name?: unknown; id?: unknown } | null
      return x?.name === r.quoi || (typeof x?.id === 'string' && x.id.replace(/^ent_/u, '') === r.quoi)
    })
    const a = brut === undefined ? null : analyser(brut)
    const detail =
      a !== null && !a.success && a.error !== undefined
        ? a.error.issues.map((i) => `${i.path.map(String).join('.') || '(racine)'} : ${i.message}`).join(' ; ')
        : r.motif
    return `- table « ${r.quoi} » : ${detail}`
  })
  return `DONNEES.json a été refusé par le contrat de données :\n${lignes.join('\n')}`
}

/** Ce qu'une fusion a refusé de prendre. Jamais tu — c'est tout l'objet. */
export type PerteFusion = {
  readonly table: string
  /** Ce que le constructeur demandait, nommé. */
  readonly quoi: string
  /** Pourquoi il ne l'a pas obtenu. */
  readonly pourquoi: string
}

export type Fusion = {
  readonly entites: readonly EntiteDeclaree[]
  readonly pertes: readonly PerteFusion[]
}

/**
 * FUSIONNE LES DEUX SOURCES — AU CHAMP PRÈS, ET SANS RIEN AVALER.
 *
 * ── CE QUE CETTE FONCTION JETAIT EN SILENCE, MESURÉ LE 2026-11-06.
 *
 * Sa première forme ne gardait du constructeur que les tables dont le nom
 * était NEUF. Sur un nom déjà vu, elle jetait l'entité ENTIÈRE — et sa
 * signature n'avait aucun canal pour le dire. Éprouvé sur le cas réel
 * d'`asso` :
 *
 *   lecturePublique: true           JETÉ
 *   appendOnly: true  (journal)     JETÉ
 *   UN CHAMP EN PLUS (telephone)    JETÉ — 1 champ au lieu de 2
 *   required passé à false          JETÉ
 *   unique sur un champ             JETÉ
 *
 * Le troisième est le vrai danger : le modèle comprend qu'il lui manque une
 * colonne, la redéclare, et LA COLONNE N'EXISTE JAMAIS. L'application écrit
 * dans un champ absent.
 *
 * Et le premier explique le défaut d'`asso.deribfy.app` : sa page publique
 * ne pouvait pas marcher, et même si le modèle avait déclaré la table
 * publique, cette fonction aurait jeté la déclaration. DEUX CAUSES
 * EMPILÉES — écrire la loi dans la consigne seule n'aurait rien réparé.
 *
 * ── CE QUI CHANGE, ET CE QUI NE CHANGE PAS.
 *
 * Le cahier reste l'autorité sur ce qu'il a DIT : il porte la demande de la
 * personne. Mais le silence n'est pas une parole. Là où le cahier ne dit
 * rien, le constructeur peut AJOUTER — un champ, la publicité, le journal.
 * Là où le cahier a parlé, il l'emporte, ET LA PERTE SE DIT.
 */
export function fusionnerEntites(
  duCahier: readonly EntiteDeclaree[],
  duConstructeur: readonly EntiteDeclaree[],
): Fusion {
  const pertes: PerteFusion[] = []
  const parNom = new Map(duConstructeur.map((e) => [e.name.toLowerCase(), e]))
  const entites = duCahier.map((duC) => {
    const duK = parNom.get(duC.name.toLowerCase())
    if (duK === undefined) return duC
    return fusionnerUne(duC, duK, pertes)
  })
  const vues = new Set(duCahier.map((e) => e.name.toLowerCase()))
  const ajoutees = duConstructeur.filter((e) => !vues.has(e.name.toLowerCase()))
  return { entites: [...entites, ...ajoutees], pertes }
}

/** Un drapeau que le constructeur peut POSER quand le cahier se taît. */
function drapeau(
  table: string,
  nom: 'lecturePublique' | 'appendOnly',
  duCahier: boolean | undefined,
  duConstructeur: boolean | undefined,
  pertes: PerteFusion[],
): boolean | undefined {
  if (duConstructeur === undefined) return duCahier
  if (duCahier === undefined) return duConstructeur
  if (duCahier !== duConstructeur) {
    pertes.push({
      table,
      quoi: `${nom}: ${String(duConstructeur)}`,
      pourquoi: `le cahier dit déjà ${nom}: ${String(duCahier)}, et c'est lui qui porte la demande`,
    })
  }
  return duCahier
}

function fusionnerUne(
  duCahier: EntiteDeclaree,
  duConstructeur: EntiteDeclaree,
  pertes: PerteFusion[],
): EntiteDeclaree {
  const table = duCahier.name
  const parNom = new Map(duConstructeur.fields.map((f) => [f.name.toLowerCase(), f]))
  const champs = duCahier.fields.map((f) => {
    const k = parNom.get(f.name.toLowerCase())
    if (k === undefined) return f
    // ── LE CAHIER L'EMPORTE SUR UN CHAMP QU'IL A DÉJÀ DÉCRIT.
    //
    // Mais on NOMME l'écart. Changer un type ou lever une contrainte
    // d'unicité sur des lignes déjà écrites est une migration, pas une
    // déclaration — et ça ne se décide pas au milieu d'une construction.
    if (k.type !== f.type) {
      pertes.push({ table, quoi: `${f.name}: ${k.type}`, pourquoi: `le cahier le déclare ${f.type}` })
    }
    if (k.required !== f.required) {
      pertes.push({
        table,
        quoi: `${f.name} ${k.required ? 'requis' : 'facultatif'}`,
        pourquoi: `le cahier le déclare ${f.required ? 'requis' : 'facultatif'}`,
      })
    }
    if (k.unique === true && f.unique !== true) {
      pertes.push({
        table,
        quoi: `${f.name} unique`,
        pourquoi: 'une unicité posée après coup échouerait sur les lignes déjà écrites',
      })
    }
    return f
  })
  // ── ET LES CHAMPS QUE LE CAHIER N'AVAIT PAS VUS SONT AJOUTÉS.
  //
  // C'est la perte la plus grave que l'ancienne forme causait : sans eux,
  // l'application écrit dans une colonne qui n'existe pas.
  const vus = new Set(duCahier.fields.map((f) => f.name.toLowerCase()))
  const enPlus = duConstructeur.fields.filter((f) => !vus.has(f.name.toLowerCase()))
  return {
    ...duCahier,
    fields: [...champs, ...enPlus],
    lecturePublique: drapeau(
      table,
      'lecturePublique',
      duCahier.lecturePublique,
      duConstructeur.lecturePublique,
      pertes,
    ),
    appendOnly: drapeau(table, 'appendOnly', duCahier.appendOnly, duConstructeur.appendOnly, pertes),
    // ── CE QUE LE VISITEUR REÇOIT : C'EST LE CONSTRUCTEUR QUI LE SAIT (2026-11-23).
    //
    // C'est lui qui écrit la page publique, donc lui qui sait ce qu'elle
    // affiche. Sa déclaration l'emporte ; à défaut, celle d'avant reste.
    // Sans ces deux lignes, `...duCahier` jetait la sienne en silence.
    ...(duConstructeur.champsPublics !== undefined
      ? { champsPublics: duConstructeur.champsPublics }
      : duCahier.champsPublics !== undefined ? { champsPublics: duCahier.champsPublics } : {}),
    ...(duConstructeur.lignesPubliques !== undefined
      ? { lignesPubliques: duConstructeur.lignesPubliques }
      : duCahier.lignesPubliques !== undefined ? { lignesPubliques: duCahier.lignesPubliques } : {}),
    // ── LA LECTURE PAR CLÉ, MÊME RÈGLE (É1) : c'est le constructeur qui écrit
    //    la page de suivi. Sans ces lignes, `...duCahier` la jetait.
    ...(duConstructeur.lectureParCle !== undefined
      ? { lectureParCle: duConstructeur.lectureParCle }
      : duCahier.lectureParCle !== undefined ? { lectureParCle: duCahier.lectureParCle } : {}),
  }
}
