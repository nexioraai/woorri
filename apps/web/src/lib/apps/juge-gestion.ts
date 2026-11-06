/**
 * A2 · LE JUGE DE LA GESTION — une table qu'on ne peut que remplir.
 *
 * ── LE DÉFAUT, MESURÉ SUR LE CORPUS LE 2026-11-05.
 *
 *   faa9f0c3 · 4 tables · insert ×4 · update ×4 · delete ×1
 *   15158240 · 1 table  · insert ×1 · update ×0 · delete ×0  (publiée)
 *   a85966bc · 1 table  · insert ×1 · update ×0 · delete ×0
 *   08a20016 · 1 table  · insert ×1 · update ×0 · delete ×0
 *
 * Le modèle écrit spontanément un formulaire de création. MODIFIER et
 * RETIRER manquaient dans TROIS œuvres à tables sur QUATRE : une faute de
 * frappe y est définitive, et le propriétaire doit ouvrir la base
 * lui-même pour la corriger.
 *
 * `jugerPersistance` disait « rien à redire » sur ces trois-là : il
 * mesure « lue ET écrite », jamais « corrigeable ».
 *
 * ════════════════════════════════════════════════════════════════════
 * L'HYPOTHÈSE, DITE À VOIX HAUTE — et c'est la moitié de ce juge.
 * ════════════════════════════════════════════════════════════════════
 *
 * « Toute table est tenue par le propriétaire » n'est pas une vérité
 * éternelle : c'est un FAIT DE L'ÉTAT ACTUEL du moteur, et il repose sur
 * deux mesures du 2026-11-05 :
 *
 *   ① AUCUNE déclaration n'accorde `insert` à `anon`. Les quatre
 *      combinaisons possibles — ordinaire, lecturePublique, appendOnly,
 *      les deux — ont été émises et lues : `anon` ne reçoit JAMAIS que
 *      `select`, et seulement sur une table déclarée publique.
 *   ② Il n'existe QU'UN compte par œuvre, créé par le serveur avec son
 *      adresse déterministe `oeuvre-<id>`.
 *
 * Il n'existe donc, aujourd'hui, AUCUNE table que le public remplit. Si
 * cela change — écriture anonyme ouverte, ou second compte — alors des
 * tables seront remplies par des visiteurs, et exiger un `update` dessus
 * serait un DÉFAUT et non une qualité : le propriétaire ne doit pas
 * pouvoir réécrire ce qu'un visiteur a écrit.
 *
 * CE JUGE NE LAISSERA PAS CE JOUR-LÀ PASSER EN SILENCE. Il vérifie son
 * hypothèse AVANT de juger quoi que ce soit, et s'il la trouve tombée il
 * REFUSE DE JUGER, avec une phrase française qui dit quoi faire. Cinq
 * cliquets de ce dépôt ont déjà défendu un passé contre le produit ; ce
 * juge est écrit pour ne pas être le sixième.
 */
import { emettrePolitiquesSql } from '@deribfy/compiler'
import { lecturePubliqueDe, nomTable, type EntiteDeclaree } from './entites-declarees'
import { methodesParTable } from './juge-persistance'

/** Une table que le propriétaire ne peut pas corriger, ou pas retirer. */
export type DefautGestion = {
  readonly table: string
  readonly modifiable: boolean
  readonly retirable: boolean
}

export type RapportGestion = {
  /**
   * LA PHRASE QUAND L'HYPOTHÈSE EST TOMBÉE — `null` tant qu'elle tient.
   *
   * Quand elle est là, `defauts` est VIDE : on ne juge pas sur une
   * prémisse qu'on sait fausse. Un verdict rendu malgré tout serait pire
   * qu'un silence, parce qu'il aurait l'air d'un verdict.
   */
  readonly hypotheseTombee: string | null
  readonly defauts: readonly DefautGestion[]
}

/** La signature de l'émetteur de politiques — voir `jugerGestion`. */
export type Emetteur = (entites: readonly EntiteDeclaree[], id: string) => string

/** L'identifiant d'œuvre ne sert qu'à émettre : n'importe lequel convient. */
const ID_TEMOIN = '00000000-0000-4000-8000-000000000000'

/**
 * L'HYPOTHÈSE TIENT-ELLE ? — vérifiée sur le SQL RÉELLEMENT ÉMIS.
 *
 * On ne lit pas une constante et on ne se fie pas à un souvenir : on
 * émet les politiques de CES entités et on regarde ce que `anon` reçoit.
 * Le jour où `emettrePolitiquesSql` accordera une écriture anonyme, cette
 * lecture le verra — sans qu'on ait pensé à revenir ici.
 */
function hypotheseTombee(
  entites: readonly EntiteDeclaree[],
  emettre: Emetteur,
): string | null {
  const sql = emettre(entites as never, ID_TEMOIN)
  const ouvertures: string[] = []
  for (const ligne of sql.split('\n')) {
    const l = ligne.trim()
    if (l.startsWith('--') || !/\banon\b/u.test(l)) continue
    // `revoke … from anon` RETIRE : ce n'est pas une ouverture.
    if (/^revoke\b/u.test(l)) continue
    if (/\b(insert|update|delete|all)\b/u.test(l)) ouvertures.push(l.slice(0, 90))
  }
  if (ouvertures.length === 0) return null
  return (
    'Ce contrôle ne peut plus juger : il suppose que seul le propriétaire ' +
    'écrit, et le SQL émis ouvre désormais une écriture à des visiteurs sans ' +
    'compte. Une table que le public remplit ne doit PAS être modifiable par ' +
    'le propriétaire — exiger « modifier » dessus serait un défaut. Déclarez ' +
    'qui remplit chaque table avant de rétablir ce contrôle.\n' +
    ouvertures.map((o) => `  · ${o}`).join('\n')
  )
}

/**
 * LES TABLES QUE LE PROPRIÉTAIRE NE PEUT PAS CORRIGER.
 *
 * ── CE QUI EST EXCLU, ET POURQUOI.
 *
 * · UNE TABLE MARQUÉE `(journal)` : la base REFUSE d'y modifier ou d'y
 *   effacer une ligne — les politiques émises ne portent que `select` et
 *   `insert`. Exiger un `update` dessus demanderait du code qui échouerait
 *   à l'exécution. C'est l'exception, et elle est structurelle.
 *
 * · UNE TABLE QUE L'ŒUVRE N'ÉCRIT PAS DU TOUT : `jugerPersistance` la
 *   signale déjà. Deux juges qui reprochent la même chose font deux
 *   reproches pour un défaut, et le second paraît nouveau.
 *
 * · ZÉRO TABLE : rien à gérer. Une œuvre sans données ne reçoit même pas
 *   le bloc de base dans sa consigne.
 */
export function jugerGestion(
  entites: readonly EntiteDeclaree[],
  fichiers: ReadonlyMap<string, string>,
  /**
   * L'ÉMETTEUR DE POLITIQUES — injectable pour EXERCER L'HYPOTHÈSE TOMBÉE.
   *
   * Sans cette porte, le jour où l'hypothèse tombe ne se teste pas : un
   * contrôle qui n'affirme que le cas où elle TIENT est satisfait par un
   * juge qui ne vérifie RIEN. Deux mutations l'ont montré — `return null`
   * d'office passait au vert.
   *
   * « Un contrôle qui ne s'exerce que sur le chemin heureux ne prouve pas
   * une garde. »
   */
  emettre: Emetteur = emettrePolitiquesSql as Emetteur,
): RapportGestion {
  if (entites.length === 0) return { hypotheseTombee: null, defauts: [] }

  const tombee = hypotheseTombee(entites, emettre)
  if (tombee !== null) return { hypotheseTombee: tombee, defauts: [] }

  const parTable = methodesParTable(fichiers)
  const defauts: DefautGestion[] = []
  for (const e of entites) {
    if (e.appendOnly === true) continue
    const t = nomTable(e)
    const m = parTable.get(t)
    // Jamais écrite : c'est le défaut de `jugerPersistance`, pas le nôtre.
    if (m === undefined || !m.has('insert')) continue
    const modifiable = m.has('update') || m.has('upsert')
    const retirable = m.has('delete')
    if (!modifiable || !retirable) defauts.push({ table: t, modifiable, retirable })
  }
  return { hypotheseTombee: null, defauts }
}

/**
 * A3 · LE REPROCHE, EN FRANÇAIS — il dit le GESTE qui manque.
 *
 * « Ajoute la gestion » n'apprend rien. Celui-ci nomme la table, dit
 * lequel des deux gestes manque, et dit la conséquence pour la personne —
 * c'est elle qui rend le reproche satisfaisable plutôt qu'obéi.
 */
export function reprocheGestion(r: RapportGestion): string | null {
  if (r.hypotheseTombee !== null) return null
  if (r.defauts.length === 0) return null
  const lignes = r.defauts.map((d) => {
    const manque = !d.modifiable && !d.retirable
      ? 'ni corriger ni retirer une ligne'
      : !d.modifiable
        ? 'pas corriger une ligne'
        : 'pas retirer une ligne'
    return `- « ${d.table} » : on peut en ajouter, mais ${manque}.`
  })
  return (
    'IL MANQUE L’ESPACE DE GESTION. Le propriétaire doit pouvoir lister, ' +
    'ajouter, MODIFIER et RETIRER — les quatre, pas seulement « ajouter ». ' +
    'Sans « modifier », une faute de frappe est définitive ; sans ' +
    '« retirer », une ligne de trop l’est aussi, et il devra ouvrir la base ' +
    'lui-même.\n' +
    lignes.join('\n') +
    '\n\nUne table marquée (journal) est l’exception : elle n’accepte que ' +
    'des ajouts, et la base refuse le reste.'
  )
}
