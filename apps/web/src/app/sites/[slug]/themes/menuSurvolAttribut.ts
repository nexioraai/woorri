// L'attribut qui marque un sous-menu « à ouvrir au survol ». Dans un fichier
// NEUTRE (ni serveur ni client) : une constante exportée par un module
// 'use client' arrive dans un composant serveur sous forme de RÉFÉRENCE, pas
// de chaîne — l'attribut n'était jamais écrit (mesuré en ligne le 2026-11-11).
export const ATTRIBUT_SURVOL = 'data-menu-survol'
