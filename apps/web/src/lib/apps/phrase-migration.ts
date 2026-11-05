/**
 * CE QUI VA ARRIVER AUX DONNÉES, DIT AVANT — EN FRANÇAIS.
 *
 * ── LES UTILISATEURS SONT DES COMMERÇANTS, PAS DES DÉVELOPPEURS.
 *
 * Leur montrer le SQL d'une migration, c'est leur demander d'approuver
 * ce qu'ils ne peuvent pas lire. Ils approuveraient toujours, et
 * l'approbation ne vaudrait rien.
 *
 * Lovable, PlanetScale et Replit font tous approuver une migration avant
 * qu'elle touche des données réelles — Lovable a même un réglage nommé
 * « demander à chaque fois ». Nous n'avons pas besoin d'un réglage :
 * nous avons besoin que la phrase soit VRAIE et LISIBLE.
 *
 * ── ET LES NOMBRES VIENNENT DE L'INSTANTANÉ, JAMAIS DU MODÈLE.
 *
 * L'affaire Replit tient en une phrase : les données ÉTAIENT
 * récupérables, et c'est l'agent qui a affirmé le contraire. Le
 * fondateur l'a cru. LA PERTE PERÇUE A PRÉCÉDÉ TOUTE PERTE RÉELLE.
 *
 * Ce module ne reçoit donc que des faits comptés — un plan de M1, un
 * instantané de M3. Il ne prend aucun texte du modèle en entrée, et il
 * n'y a pas d'endroit où en mettre.
 */
import type { EcartMigration, PlanMigration } from './migration-oeuvre'
import type { Instantane } from './instantane-migration'

/** « 2 relevés » — un nom au pluriel qui ne force pas un « s » absurde. */
function combien(n: number, nom: string): string {
  return `${String(n)} ${nom}${n > 1 && !nom.endsWith('s') ? 's' : ''}`
}

function phraseEcart(e: EcartMigration): string | null {
  switch (e.genre) {
    case 'table-ajoutee':
      return `une nouvelle liste « ${e.table} »`
    case 'champ-ajoute':
      return `une colonne « ${e.champ} » à vos « ${e.table} »`
    default:
      return null
  }
}

/**
 * CE QUE LA MODIFICATION FERA, ET CE QU'ELLE GARDERA.
 *
 * Rend `null` quand rien ne touche aux données : poser une question
 * dont la réponse est toujours « oui » apprend à répondre sans lire.
 */
export function phraseAvantMigration(
  plan: PlanMigration,
  avant: Instantane,
): string | null {
  const gestes = plan.ajouts.map(phraseEcart).filter((x): x is string => x !== null)
  if (gestes.length === 0) return null

  // ── CE QUI EST DÉJÀ LÀ SE NOMME, TABLE PAR TABLE.
  //
  // « vos données seront conservées » est une promesse ; « vos 2 relevés
  // seront conservés » est une mesure. La seconde se vérifie après.
  const existant = Object.entries(avant.lignes)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => combien(n, t))
  return (
    `Cette modification ajoutera ${gestes.join(' et ')}.\n` +
    (existant.length === 0
      ? 'Vous n’avez encore rien saisi : il n’y a rien à conserver.'
      : `Vos ${existant.join(' et vos ')} existants seront conservés.`)
  )
}

/**
 * CE QUI S'EST PASSÉ, AVEC LES NOMBRES QUE LE PIPELINE A COMPTÉS.
 *
 * ── PAS UNE NARRATION.
 *
 * L'instantané d'avant et celui d'après, mis côte à côte. Si une
 * personne doute, elle relit les deux nombres — et ils viennent du
 * `count(*)` d'une base, pas d'une phrase engendrée.
 */
export function phraseApresMigration(
  plan: PlanMigration,
  avant: Instantane,
  apres: Instantane,
): string {
  const gestes = plan.ajouts.map(phraseEcart).filter((x): x is string => x !== null)
  const lignes = Object.keys(apres.lignes)
    .filter((t) => (avant.lignes[t] ?? 0) > 0 || (apres.lignes[t] ?? 0) > 0)
    .map((t) => `${combien(avant.lignes[t] ?? 0, t)} avant, ${String(apres.lignes[t] ?? 0)} après`)
  return (
    (gestes.length === 0 ? 'Modification appliquée.' : `Ajouté : ${gestes.join(' et ')}.`) +
    (lignes.length === 0 ? '' : ` ${lignes.join(' · ')}.`)
  )
}
