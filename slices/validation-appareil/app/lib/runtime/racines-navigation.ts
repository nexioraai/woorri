// RACINES DE NAVIGATION — une destination principale est une RACINE, pas une
// étape d'un parcours.
//
// DÉFAUT MESURÉ SUR APPAREIL (Galaxy A17, signalé à l'écran) : la barre du bas
// appelait `navigate`. Or `navigate` EMPILE quand la cible n'est pas déjà dans
// la pile. Les quatre pages principales s'accumulaient donc les unes sur les
// autres, et l'en-tête natif affichait une FLÈCHE DE RETOUR en haut à gauche :
// on « revenait » de Compte vers Réserver vers Départs, comme si toucher un
// onglet était un pas en avant. Toucher un onglet n'est pas un pas en avant,
// c'est une bascule — et une bascule ne laisse pas de trace derrière elle.
//
// Le même défaut valait à l'entrée : l'écran d'accueil, atteint depuis l'écran
// de bienvenue, portait lui aussi une flèche — qui ramenait à l'accueil du
// compte, une fois entré dans l'application.
//
// `primary-nav.tsx` affirmait que le comportement était « identique » pour
// l'utilisateur à celui d'un vrai gestionnaire d'onglets. C'était faux, et la
// flèche le prouvait. Le commentaire est corrigé en même temps que le code :
// une contrepartie assumée doit décrire ce qui se passe VRAIMENT.
//
// RÈGLE — atteindre une racine REMPLACE la pile par cette seule racine.
// Conséquences, toutes voulues :
//   • aucune flèche de retour sur les quatre pages principales ;
//   • aucune accumulation d'écrans à mesure qu'on change d'onglet ;
//   • le retour matériel quitte l'application depuis un onglet, au lieu de
//     rejouer l'historique des onglets à l'envers ;
//   • on ne « revient » jamais dans l'accueil d'onboarding une fois entré.
//
// Ce que cette règle NE fait PAS : conserver un historique par onglet. Un vrai
// gestionnaire d'onglets le ferait ; celui-ci n'existe pas dans le verrou de
// paquets embarqué (constat de `primary-nav.tsx`, inchangé). Ouvrir une fiche
// depuis Départs puis toucher Accueil perd donc la fiche. C'est une perte
// RÉELLE, écrite ici, et non une équivalence proclamée.

/**
 * Surface minimale attendue du navigateur. Structurelle, pas nominale : le
 * moteur ne dépend pas du type paramétré de React Navigation, il dépend des
 * deux opérations qu'il utilise réellement.
 */
export interface NavigateurRacine {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  reset: (state: {
    index: number;
    routes: readonly { name: string; params?: Record<string, unknown> }[];
  }) => void;
}

// Les racines viennent du DOCUMENT (`navigation.primary.destinations`), pas
// d'une convention de nommage : le module de navigation généré les déclare au
// chargement, avant tout rendu. Sans déclaration, la liste est vide et le
// moteur se comporte exactement comme avant — aucune racine devinée.
let racines: readonly string[] = [];

/** Appelé par le module de navigation ÉMIS. Idempotent, ordre indifférent. */
export function declarerRacines(ids: readonly string[]): void {
  racines = [...ids];
}

/** Vrai si cet écran est une destination principale déclarée. */
export function estRacine(screenId: string): boolean {
  return racines.includes(screenId);
}

/** Uniquement pour les tests : rend le registre à son état initial. */
export function reinitialiserRacines(): void {
  racines = [];
}

/**
 * SEUL point de navigation du moteur. Une racine remplace la pile ; tout autre
 * écran s'empile normalement — une fiche de départ garde sa flèche de retour,
 * parce que là, revenir a un sens.
 */
export function allerVers(
  navigation: unknown,
  screenId: string,
  params?: Record<string, unknown>,
): void {
  const nav = navigation as NavigateurRacine;
  if (estRacine(screenId)) {
    nav.reset({
      index: 0,
      routes: [params === undefined ? { name: screenId } : { name: screenId, params }],
    });
    return;
  }
  nav.navigate(screenId, params);
}
