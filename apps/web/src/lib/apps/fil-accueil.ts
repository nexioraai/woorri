/**
 * LE FIL DE L'ACCUEIL, ET CE QU'ON EN TIRE — module PUR.
 *
 * ── POURQUOI IL VIT ICI ET PAS DANS LE COMPOSANT.
 *
 * `ConversationApplication.tsx` importe le client Supabase, qui exige des
 * variables d'environnement au chargement. Un contrôle qui veut juste
 * vérifier comment une demande se compose n'a pas à monter la moitié du
 * produit — et s'il le fait, il échoue pour une raison qui n'a rien à
 * voir avec ce qu'il mesure.
 *
 * ── LE DÉFAUT QUE CE MODULE FERME, MESURÉ EN PRODUCTION LE 2026-11-05.
 *
 * L'accueil ne transmettait au chemin applicatif qu'une CHAÎNE : le
 * dernier message. Or l'aiguillage ne se déclenche QU'APRÈS confirmation
 * — le modèle ne pose son drapeau qu'une fois la personne d'accord. Le
 * dernier message était donc STRUCTURELLEMENT la confirmation :
 *
 *   « une appli de gestion d'association, membres avec nom, téléphone… »
 *   « est-ce bien une application ? »
 *   « oui c'est bien une application »      ← le SEUL texte transmis
 *
 * Le chemin applicatif a reçu « oui c'est bien une application » comme
 * cahier des charges entier, et a généré une application de relevés de
 * compteur électrique que personne n'avait demandée.
 */

/** Ce qui s'est dit à l'accueil, dans l'ordre. */
export type FilAccueil = readonly {
  readonly role: 'user' | 'assistant'
  readonly content: string
}[]

/**
 * CE QUE LA PERSONNE A DEMANDÉ — tout, dans l'ordre, et rien de nous.
 *
 * On ne garde QUE ses messages. Les nôtres sont du contexte : les
 * reprendre ferait passer nos questions pour des exigences, et le modèle
 * construirait « Est-ce bien une application ? » au lieu de ce qu'elle a
 * répondu. C'est la même faute que l'exemple `releve` de la consigne —
 * notre texte devenu produit.
 */
export function demandeDuFil(fil: FilAccueil): string {
  return fil
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter((t) => t !== '')
    .join('\n\n')
}
