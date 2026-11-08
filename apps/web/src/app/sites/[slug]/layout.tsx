import type { ReactNode } from 'react'

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

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-surface="site-genere"
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
      {children}
    </div>
  )
}
