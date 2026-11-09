import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import SurvolVivant from './themes/SurvolVivant'

// ============================================================================
// LOT 3c — UN SITE GÉNÉRÉ N'EST PAS LE TABLEAU DE BORD.
//
// LE DÉFAUT, VU À L'ÉCRAN par le propriétaire : /appels-offres servait du
// texte presque noir sur fond presque noir. Illisible.
//
// LA RACINE, MESURÉE. `globals.css` bascule `--background` en `#0a0a0a`
// sous `@media (prefers-color-scheme: dark)`. Un visiteur dont le SYSTÈME
// est en mode sombre recevait donc un site institutionnel en noir — alors
// que l'apparence d'un site généré appartient à SON THÈME, jamais aux
// préférences du visiteur pour la plateforme.
//
// POURQUOI UN LAYOUT ET PAS HUIT CORRECTIFS. Il n'existait AUCUN layout pour
// `sites/[slug]` : chaque page devait peindre son fond elle-même, et deux
// sur huit le faisaient. J'avais corrigé `[...rest]` mardi et l'archive
// aujourd'hui — page par page, donc jamais. Ici la règle est posée UNE fois,
// à la racine du segment, et toute page future en hérite sans rien écrire.
//
// CE QUE CE LAYOUT NE FAIT PAS : il n'impose aucune apparence. Les thèmes
// peignent leur propre fond par-dessus — `NoirTheme` reste noir, et c'est
// une DÉCISION de thème, pas un accident de réglage système. Ce layout ne
// fournit qu'un sol lisible à ce qui n'en pose pas.
//
// `globals.css` N'EST PAS MODIFIÉ : son segment est engendré depuis
// `packages/design-tokens/tokens.json`, et un cliquet CI rougit s'il diverge
// de sa source. On corrige au bon endroit, pas au plus commode.
// ============================================================================

// ============================================================================
// LOT 15.13 — ET C'EST AUSSI ICI QUE VIT L'ANIMATION AU SURVOL.
//
// MÊME RAISON QUE LE FOND BLANC, à deux mois d'intervalle. Le propriétaire a
// demandé que « chaque bouton anime quand on place le curseur », sur
// l'accueil ET sur chaque sous-page. Retoucher les boutons un par un, c'est
// la correction « page par page, donc jamais » que ce fichier existe pour
// éviter. La règle est posée une fois, à la racine du segment, et tout écran
// à venir en hérite sans rien écrire.
//
// LA COULEUR VIENT DU SITE. Le halo du survol et le liseré du clavier
// prennent sa teinte : un accent en dur donnerait le même bleu à quarante-
// deux sites qui n'ont pas la même identité.
// ============================================================================

export default async function SiteLayout({
  children, params,
}: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase
    .from('sites_public').select('primary_color').eq('slug', slug).maybeSingle()
  // `#111111` quand le site n'en déclare pas : le survol reste visible, il
  // n'emprunte simplement aucune couleur qui ne serait pas la sienne.
  const primary = (data as { primary_color?: string | null } | null)?.primary_color || '#111111'

  return (
    <div
      data-surface="site-genere"
      // `vivant` : la classe que lit `SurvolVivant`. Elle enveloppe TOUT ce
      // que ce segment rend — accueil, pages déclarées, espace, appels
      // d'offres — donc aucune page ne peut l'oublier.
      className="vivant"
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#111111',
        // `colorScheme: 'light'` dit au navigateur de rendre ses propres
        // contrôles (champs, barres de défilement, listes déroulantes) en
        // clair. Sans lui, un champ de formulaire reste sombre sur fond
        // blanc : le fond est corrigé, la saisie reste illisible.
        colorScheme: 'light',
      }}
    >
      <SurvolVivant primary={primary} />
      {children}
    </div>
  )
}
