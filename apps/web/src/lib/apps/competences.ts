/**
 * CE QUE L'APPLICATION SAURA FAIRE — dit pendant qu'elle se construit.
 *
 * ── LE DÉFAUT, MESURÉ LE 2026-10-18.
 *
 * `packages/capability-registry` déclare VINGT-ET-UNE capacités — `auth`,
 * `camera`, `payments.psp`, `push_notifications`, `offline_storage`… Chacune
 * porte un `title` et une `description` ÉCRITS EN FRANÇAIS PAR DES HUMAINS.
 *
 * Vingt documents sur vingt-deux en déclarent. Et AUCUN écran ne les montre.
 *
 * C'est la septième « machine posée, débranchée » de ce chantier, après
 * `QUESTIONS_DE_CONFIGURATION` sans appelant, neuf observations vertes sur un
 * instantané mort, `demoValues` à 13,9 %, `graphique` inexprimable, l'avatar
 * câblé sur un seul des deux chemins, et le journal des tirages persisté sans
 * lecteur. La forme ne change pas : la donnée est là, personne ne la regarde.
 *
 * ── CE QUE CE MODULE N'INVENTE PAS, ET C'EST TOUT L'INTÉRÊT.
 *
 * Les mots viennent du REGISTRE. Pas une phrase n'est fabriquée ici — on lit
 * le `title` que quelqu'un a écrit en pesant ses mots, et on le rend. Un
 * identifiant inconnu du registre est TU, jamais affiché brut : « payments.psp »
 * sous les yeux de quelqu'un qui attend son application ne lui apprend rien.
 */
import { getCapability } from '@deribfy/capability-registry'

export type Competence = {
  /** L'identifiant déclaré au document — pour les instruments, pas pour l'œil. */
  readonly id: string
  /** Le titre ÉCRIT DANS LE REGISTRE. Jamais fabriqué ici. */
  readonly titre: string
}

/**
 * Les compétences que ce document déclare, dites en français.
 *
 * ── POURQUOI UN IDENTIFIANT INCONNU EST TU.
 *
 * Le registre est une allowlist FERMÉE : une capacité hors registre ne peut
 * pas être implémentée, donc l'annoncer serait promettre ce qui n'existe pas.
 * Et afficher son identifiant brut rouvrirait le défaut que ce dépôt vient de
 * fermer sur l'agent — une personne lisait « AIR_AGENT_SANS_CERVEAU ».
 *
 * Se taire est le seul comportement qui ne ment pas.
 */
export function competencesDeclarees(document: unknown): readonly Competence[] {
  const d = document as { capabilities?: unknown } | null
  const brutes = Array.isArray(d?.capabilities) ? d.capabilities : []
  const out: Competence[] = []
  const vues = new Set<string>()
  for (const b of brutes) {
    if (b === null || typeof b !== 'object') continue
    const id = (b as { capability?: unknown }).capability
    if (typeof id !== 'string' || vues.has(id)) continue
    vues.add(id)
    let titre: string | null = null
    try {
      titre = getCapability(id)?.title ?? null
    } catch {
      titre = null
    }
    if (titre === null || titre.trim() === '') continue
    out.push({ id, titre })
  }
  // ── ORDRE STABLE, ET PAS CELUI DU DOCUMENT.
  //
  // Deux rafraîchissements du suivi ne doivent pas réordonner la liste sous
  // les yeux de celui qui lit. L'ordre du document n'a aucun sens pour lui.
  return [...out].sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))
}
