/**
 * LE JOURNAL D'UNE GÉNÉRATION, DIT À CELUI QUI PAIE.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-17.
 *
 * Le moteur PERSISTE le détail de chaque tirage depuis le 2026-10-15 —
 * tentative, arrêt, coût, diagnostics, chemins, et les RÉPARATIONS qu'il a
 * faites lui-même. C'est dans `sections_acquises.tirages`, et `etatGeneration`
 * le LIT.
 *
 * Et ne le rend pas. L'écran de suivi montre cinq marches, une fraction et un
 * compteur. Le propriétaire regarde 53 minutes de génération sans savoir ce
 * qui se passe — alors que le moteur l'écrit.
 *
 * C'est la sixième fois de ce chantier qu'une machine est POSÉE et
 * DÉBRANCHÉE : `QUESTIONS_DE_CONFIGURATION` sans appelant, neuf observations
 * vertes sur un instantané mort, `demoValues` à 13,9 %, `graphique`
 * inexprimable, l'avatar câblé sur un seul des deux chemins de rendu. La forme
 * est toujours la même, et c'est toujours le dernier maillon.
 *
 * ── LE BRUT DU MOTEUR NE VOYAGE PAS, ET C'EST UNE RÈGLE DU DÉPÔT.
 *
 * `etatGeneration` le dit déjà pour les refus : « Deja TRADUITE par le serveur
 * — le brut du moteur ne voyage jamais ». Trois des six champs d'un tirage
 * sont du brut :
 *
 *   · `arret` vaut `P1`, `P2` ou `passe` — des noms de passes internes ;
 *   · `diagnostics` sont des CODES (`DERIVATION_IDENTITE_SANS_SOURCE`) ;
 *   · `details` sont des `chemin : message` du validateur.
 *
 * Les trois autres sont déjà lisibles, et c'est ce qui rend ce lot petit :
 * `tentative` est un rang, `coutUsd` un montant, et `reparations` porte des
 * PHRASES que le moteur écrit déjà en français — « “découvrir X” devient
 * “chercher” dans Y, deux acteurs ne partagent pas la surface privée ».
 *
 * Ce module traduit les trois premiers, sert les trois autres, et ne laisse
 * JAMAIS passer `details`.
 *
 * ── CE QUE P1 ET P2 VEULENT DIRE, LU À LA SOURCE.
 *
 * `moteur.mjs` : `const arret = candidat === undefined ? "P1" : diagnosticsPlan.length > 0 ? "P2" : "passe"`.
 *
 *   · `P1` — `validerModele` a refusé le modèle lui-même ; aucun candidat n'est
 *     sorti de la passe. Le générateur n'avait rien à composer.
 *   · `P2` — le modèle a passé P1, et c'est le PLAN DES ÉCRANS qui porte des
 *     incohérences.
 *   · `passe` — accepté.
 *
 * Je ne l'ai pas deviné : les libellés ci-dessous viennent de cette ligne et
 * des commentaires qui l'entourent.
 */

/** Une ligne du journal, prête à lire. Aucun code, aucun chemin. */
export type LigneTirage = {
  /** Le rang du tirage — « 1 », « 2 »… */
  readonly rang: number
  /** Ce qui s'est passé, en une phrase. */
  readonly quoi: string
  /** Ce que le générateur a corrigé de lui-même. Déjà en français. */
  readonly reparations: readonly string[]
  // ── LE COÛT N'EST PAS ICI, ET CE N'EST PAS UN OUBLI.
  //
  // J'avais écrit `coutUsd` sur chaque ligne, en me disant que le propriétaire
  // y tient — douze générations, 29 $, aucune application vue. Le cliquet du
  // DÉGRAISSAGE m'a arrêté, et il a raison : le dépôt a DÉJÀ décidé que l'état
  // rendu à l'écran « ajoute des TEMPS et des COMPTES, jamais une entraille ni
  // un coût », et un contrôle vérifie qu'aucun montant ne fuit.
  //
  // Renverser une décision consignée en passant par la porte d'un autre lot,
  // ce n'est pas la discuter : c'est la contourner. Le coût reste en admin, et
  // la question « le veux-tu sur ton écran ? » est posée au propriétaire — pas
  // tranchée ici.
  /** Combien de points le refus portait — un NOMBRE, jamais les codes. */
  readonly points: number
  /** Ce tirage est-il celui qui a abouti ? */
  readonly accepte: boolean
}

/**
 * CE QUE CHAQUE ARRÊT VEUT DIRE, EN FRANÇAIS.
 *
 * Table FERMÉE : un arrêt inconnu ne produit pas une phrase inventée (voir
 * `phraseDArret`). Inventer serait exactement ce que F3 interdit au moteur, et
 * la raison est la même ici : une phrase fabriquée sur un code qu'on ne
 * connaît pas est une phrase fausse.
 */
const ARRETS: Readonly<Record<string, string>> = {
  passe: 'Le plan a été accepté',
  P1: 'Le modèle proposé n’était pas utilisable',
  P2: 'Le plan des écrans n’était pas cohérent',
}

/**
 * La phrase d'un arrêt, ou `null` si on ne le connaît pas.
 *
 * ── POURQUOI `null` ET PAS UNE PHRASE GÉNÉRIQUE.
 *
 * Un « Une étape a échoué » sur un arrêt inconnu donne l'impression qu'on sait,
 * et fait perdre son temps à qui lit. Le dépôt a déjà payé cette leçon :
 * « Réessayez dans un moment » s'affichait sur un solde épuisé, et le
 * propriétaire pouvait cliquer dix fois pour rien. Mieux vaut taire une ligne
 * que mentir sur son contenu — et le rang, le coût et les réparations, eux,
 * restent dits.
 */
const phraseDArret = (arret: unknown): string | null =>
  typeof arret === 'string' && arret in ARRETS ? (ARRETS[arret] ?? null) : null

const nombre = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const phrases = (v: unknown): readonly string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []

/**
 * Traduit le journal brut des tirages en lignes lisibles.
 *
 * ── CE QUI N'EST PAS RENDU, ET POURQUOI.
 *
 * `details` porte `chemin : message` du validateur — c'est de l'outillage de
 * diagnostic, pas une information pour celui qui attend son application. Il
 * reste en base, où un diagnostic le trouve. Seul son NOMBRE sort, parce qu'un
 * nombre dit l'ampleur sans exiger de comprendre.
 *
 * ── ET UNE LIGNE SANS ARRÊT CONNU EST TUE, PAS DEVINÉE.
 *
 * Elle n'est pas perdue pour autant : si AUCUNE ligne n'est traduisible, la
 * fonction rend un tableau vide, et l'écran n'affiche simplement pas de
 * journal — plutôt qu'une liste de « étape inconnue » qui n'apprend rien.
 */
export function journalDesTirages(tirages: unknown): readonly LigneTirage[] {
  if (!Array.isArray(tirages)) return []
  const out: LigneTirage[] = []
  for (const [i, brut] of tirages.entries()) {
    if (brut === null || typeof brut !== 'object') continue
    const t = brut as Record<string, unknown>
    const quoi = phraseDArret(t.arret)
    if (quoi === null) continue
    const rang = nombre(t.tentative)
    out.push({
      rang: rang === null ? i + 1 : rang,
      quoi,
      reparations: phrases(t.reparations),
      // Le NOMBRE de points, jamais les codes : l'ampleur sans le jargon.
      points: phrases(t.diagnostics).length,
      accepte: t.arret === 'passe',
    })
  }
  return out
}

/**
 * CE QUE LE JOURNAL DIT EN UNE LIGNE — pour l'en-tête du panneau.
 *
 * Le nombre d'essais et le nombre de corrections automatiques : deux COMPTES,
 * ce que l'état rendu à l'écran admet. Pas de montant — voir `LigneTirage`.
 */
export function resumeDuJournal(lignes: readonly LigneTirage[]): {
  readonly tirages: number
  readonly reparations: number
} {
  return {
    tirages: lignes.length,
    reparations: lignes.reduce((n, l) => n + l.reparations.length, 0),
  }
}
