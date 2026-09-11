// RÔLES D'ICÔNES — LA SOURCE (étape ③, EP-003 — 2026-09-11).
//
// AVANT : cette liste vivait en SIX copies maintenues à la main (enum du
// schéma AIR, enum du registre de blocs, table des primitives, table locale
// de primary-nav, digest du prompt ×2) — deux divergences déjà payées en
// générations refusées (« compte » sur un bouton ; icônes Marketa v1).
//
// DÉSORMAIS : le document parle en RÔLES, et LA table rôle → glyphe embarqué
// vit ICI, une fois. Dérivations : les primitives et la barre d'onglets la
// consomment ; le registre de blocs dérive son enum ; le digest du prompt
// interpole `ROLES_ICONES` ; le schéma AIR, qui ne peut dépendre d'aucun
// paquet, garde sa liste littérale SOUS CLIQUET (contrat-capacite-role.test :
// toute divergence casse le build, plus jamais une génération payante).
//
// Table FERMÉE : le moteur ne promet que des glyphes qu'il sait dessiner —
// la police Ionicons est EMBARQUÉE, aucun accès réseau (D-088).
export const GLYPHE_PAR_ROLE = {
  accueil: "home-outline",
  recherche: "search-outline",
  liste: "list-outline",
  billet: "ticket-outline",
  panier: "cart-outline",
  calendrier: "calendar-outline",
  carte: "map-outline",
  compte: "person-outline",
  favoris: "heart-outline",
  message: "chatbubble-outline",
  reglages: "settings-outline",
} as const;

export type RoleIcone = keyof typeof GLYPHE_PAR_ROLE;

/** Les rôles, dans l'ordre de la table — pour les enums dérivés et le digest. */
export const ROLES_ICONES = Object.keys(GLYPHE_PAR_ROLE) as [RoleIcone, ...RoleIcone[]];
