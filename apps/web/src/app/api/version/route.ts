/**
 * CE QUI EST RÉELLEMENT SERVI — l'empreinte du commit en ligne.
 *
 * ── POURQUOI CETTE ROUTE EXISTE, ET CE QU'ELLE RÉPARE.
 *
 * Le 2026-11-03, quatre déploiements ont échoué d'affilée et la production
 * est restée figée DIX-SEPT HEURES sur un commit ancien. Pendant ce temps
 * mes rapports disaient « déployé, vérifie · distant et local identiques ».
 *
 * Git disait vrai. Le déploiement, non.
 *
 * C'était « le statut est indicatif, le corps est la preuve » appliqué à la
 * mauvaise chose : je jugeais LE DÉPÔT au lieu de juger CE QUI SORT. Et il
 * n'existait aucun moyen de lire l'empreinte servie — pas de CLI, pas
 * d'identifiant de construction lisible (`/_next/static/immutable/`).
 *
 * Sans instrument, « déployé » ne pouvait être qu'une déduction.
 *
 * ── CE QU'ELLE REND, ET CE QU'ELLE NE REND PAS.
 *
 * L'empreinte COURTE du commit, et rien d'autre. Pas la branche, pas
 * l'auteur, pas le message, aucune autre variable : une empreinte de sept
 * signes sur un dépôt privé ne donne de prise à personne, et tout ajout en
 * donnerait.
 *
 * Hors de Vercel la variable est absente, et la route le DIT (`inconnu`)
 * plutôt que de rendre une chaîne vide qu'on prendrait pour une empreinte.
 */
import { NextResponse } from 'next/server'
import { commitDuDeploiement } from '@/lib/apps/deploiement'

export const runtime = 'nodejs'
// Jamais de cache : une empreinte mise en cache dirait l'ancien déploiement,
// ce qui est exactement l'erreur que cette route existe pour empêcher.
export const dynamic = 'force-dynamic'

export function GET() {
  // La MÊME dérivation que la ligne de génération (lib/apps/deploiement.ts) :
  // ce que la version affiche et ce que la ligne enregistre ne divergent pas.
  return NextResponse.json(
    { commit: commitDuDeploiement(process.env) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
