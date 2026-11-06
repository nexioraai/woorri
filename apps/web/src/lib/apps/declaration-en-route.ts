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
  if (brut === undefined) return { entites: [], refus: [], fichiers }

  // ── ON FILTRE, ON NE RETIRE PAS.
  //
  // `Map.delete` ferait rougir le cliquet qui garde la séquence de
  // suppression des lignes du banc : il lit la FORME `.delete(`. Sa
  // propriété est juste ; élargir sa dérogation pour une carte en mémoire
  // affaiblirait une garde de données réelles. Un filtre dit la même chose.
  const restants = new Map([...fichiers].filter(([n]) => n !== FICHIER_DECLARATION))

  let valeur: unknown
  try {
    valeur = JSON.parse(brut)
  } catch {
    return { entites: [], refus: [], fichiers: restants }
  }
  // Le modèle peut rendre le tableau nu ou l\u2019envelopper : on accepte les
  // deux plutôt que de perdre une déclaration juste sur une accolade.
  const tableau = Array.isArray(valeur)
    ? valeur
    : ((valeur as { entites?: unknown } | null)?.entites ?? null)
  const lu = lireEntites(tableau, valider)
  return { entites: lu.entites, refus: lu.refus, fichiers: restants }
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
  }
}
