import Link from 'next/link'
import type { Site } from './shared'
import { resolveSiteBaseUrl } from './shared'
import { getAvisLabels } from '../appels-offres/labels'

// ============================================================
// A2 d3c -- LE LIEN DE MENU VERS LES APPELS D'OFFRES.
//
// ── IL SUIT LA CAPACITE DECLAREE, PAS LES AVIS DU MOMENT.
//
// `publishes_tenders` dit ce que l'organisation FAIT ; la SECTION d'accueil,
// elle, suit les avis REELS. Arbitrage du proprietaire, 2026-11-06 : « la CPA
// passe des marches meme la semaine ou elle n'en publie aucun ». Lier le menu
// aux avis presents rendrait la page inatteignable des qu'il n'y en a plus --
// exactement le defaut du matin, reproduit.
//
// ── UN SEUL COMPOSANT, QUATRE INSERTIONS.
//
// La DESTINATION est decidee ici et nulle part ailleurs. Quatre copies d'une
// regle, c'est quatre endroits ou la cinquieme peut diverger -- ce que
// `ctaHref` a deja prouve dans ce meme dossier.
//
// ── ET IL EST INERTE TANT QUE LA COLONNE N'EXISTE PAS.
//
// `site.publishes_tenders` est `undefined` si la colonne n'est pas en base,
// donc faux, donc rien ne s'affiche. Pas une precaution : la projection de
// `shared.tsx` ne peut pas rendre une colonne absente.
// ============================================================

export default function LienAppelsOffres({
  site,
  host,
  className,
}: {
  site: Site
  host: string | null
  className?: string
}) {
  // `!== true` et non `!x` : une valeur absente et une valeur fausse se
  // valent ici, mais l'ecrire ainsi dit que seule une declaration EXPLICITE
  // ouvre le menu.
  if (site.publishes_tenders !== true) return null

  const base = resolveSiteBaseUrl(site, host)
  return (
    <Link href={`${base}/appels-offres`} className={className}>
      {getAvisLabels(site.lang).titre}
    </Link>
  )
}
