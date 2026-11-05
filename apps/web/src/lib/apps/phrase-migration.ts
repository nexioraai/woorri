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

  // ── LE CHANGEMENT DE SÉCURITÉ PASSE DEVANT, ET IL SUFFIT À PARLER. (P4)
  //
  // DÉFAUT MESURÉ AVANT D'ÉCRIRE : cette fonction ne lisait que
  // `plan.ajouts` et rendait `null` sans eux. Une modification qui
  // n'aurait fait qu'OUVRIR une table à tous les visiteurs n'aurait donc
  // produit AUCUNE phrase — le changement le plus grave du lot, et le
  // seul qui ne se disait pas.
  //
  // Il passe en PREMIER parce qu'une personne qui lit « ajoutera une
  // colonne » et s'arrête là a déjà décidé.
  const ouvertes = plan.ecarts
    .filter((e) => e.genre === 'publicite-changee' && e.devientPublique)
    .map((e) => (e as { table: string }).table)
  const fermees = plan.ecarts
    .filter((e) => e.genre === 'publicite-changee' && !e.devientPublique)
    .map((e) => (e as { table: string }).table)

  const securite: string[] = []
  if (ouvertes.length > 0) {
    // On dit CE QUE ÇA FAIT, pas le nom de la propriété. « devient
    // publique » n'apprend rien ; « n'importe qui pourra lire, sans
    // compte » se comprend sans nous.
    securite.push(
      `ATTENTION — ${ouvertes.length > 1 ? 'ces listes deviennent lisibles' : 'cette liste devient lisible'} ` +
        `PAR TOUT LE MONDE, sans compte : ${ouvertes.map((t) => `« ${t} »`).join(', ')}. ` +
        'Personne ne pourra y écrire ; tout le monde pourra y lire.',
    )
  }
  if (fermees.length > 0) {
    // L'autre sens se dit AUSSI : des gens lisaient peut-être déjà ces
    // pages, et elles vont cesser de répondre.
    securite.push(
      `${fermees.map((t) => `« ${t} »`).join(', ')} ${fermees.length > 1 ? 'cesseront d’être lisibles' : 'cessera d’être lisible'} ` +
        'sans compte. Si une page publique s’en servait, elle deviendra vide.',
    )
  }

  if (gestes.length === 0 && securite.length === 0) return null
  if (gestes.length === 0) return securite.join('\n')

  // ── CE QUI EST DÉJÀ LÀ SE NOMME, TABLE PAR TABLE.
  //
  // « vos données seront conservées » est une promesse ; « vos 2 relevés
  // seront conservés » est une mesure. La seconde se vérifie après.
  const existant = Object.entries(avant.lignes)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => combien(n, t))
  return (
    (securite.length === 0 ? '' : `${securite.join('\n')}\n`) +
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
