/**
 * LA SAUVEGARDE LOCALE D'UN ETAT PAYE — pour qu'une purge accidentelle ne
 * soit plus une perte.
 *
 * ── LA LECON (2026-10-09) : l'etat de la ligne 0234da42 (6,87 $) ne vivait
 * QUE dans la table jumelle ; une purge l'a efface, rien ne pouvait le
 * reconstruire. Desormais chaque harnais de tir ecrit la ligne COMPLETE
 * dans `/tmp/etat-<id>.json` a chaque tranche : un etat paye a toujours
 * une copie hors base, et `chargerPourResurrection` sait la redeposer.
 *
 * Ce module ne connait AUCUN nom de table : il copie des lignes, c'est tout.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Les colonnes qu'une resurrection REDEPOSE. `battement` et
 *  `jeton_travailleur` n'y sont pas : une ligne ressuscitee est RELACHEE —
 *  et la contrainte `en_cours_verrouillee` refuserait l'incoherence. */
const COLONNES = [
  'id', 'created_at', 'owner_email', 'demande', 'nom', 'ok', 'cout_usd',
  'duree_ms', 'jetons_entree', 'jetons_sortie', 'diagnostics', 'tirages',
  'statut', 'etape', 'sections_acquises', 'niveaux_sondes', 'document',
  'reprises',
] as const

export function cheminEtatLocal(id: string, dossier = '/tmp'): string {
  return join(dossier, `etat-${id}.json`)
}

/** Ecrit la ligne telle quelle. Rend le chemin — pour le dire au journal. */
export function sauverEtatLocal(ligne: Record<string, unknown>, dossier = '/tmp'): string {
  const id = ligne.id
  if (typeof id !== 'string' || id === '') {
    throw new Error('ETAT_LOCAL_SANS_ID: une ligne sans id n est pas sauvegardable')
  }
  const chemin = cheminEtatLocal(id, dossier)
  writeFileSync(chemin, JSON.stringify(ligne, null, 1))
  return chemin
}

/**
 * Relit une sauvegarde et rend la charge a REDEPOSER (insert).
 * Une ligne figee `en_cours` ressuscite `en_attente` : son travailleur est
 * mort avec la purge, la ligne doit redevenir saisissable.
 */
export function chargerPourResurrection(chemin: string): Record<string, unknown> {
  const brut = JSON.parse(readFileSync(chemin, 'utf8')) as Record<string, unknown>
  if (typeof brut.id !== 'string' || typeof brut.demande !== 'string' || brut.demande === '') {
    throw new Error(`ETAT_LOCAL_INVALIDE: ${chemin} ne porte pas une ligne complete`)
  }
  const charge: Record<string, unknown> = {}
  for (const c of COLONNES) if (c in brut) charge[c] = brut[c]
  if (charge.statut === 'en_cours') charge.statut = 'en_attente'
  charge.battement = null
  charge.jeton_travailleur = null
  return charge
}
