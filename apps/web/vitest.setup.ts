// ============================================================
// M2-226 — AUCUN TEST NE TOUCHE LE RÉSEAU RÉEL.
//
// LE DÉFAUT PAYÉ (run CI 35800661169) : cinq tests de
// `api/domains/status` ont échoué sur « Test timed out in 5000ms ».
// Cause exacte : `verifierJoignabilite` OUVRE quatre adresses réelles avec un
// délai de 8 s — plus long que le délai d'un test. Le module n'était pas
// masqué, donc les `fetch` partaient pour de vrai.
//
// CE QUI REND CE DÉFAUT PIRE QU'UN ROUGE FRANC : il est INTERMITTENT. Là où
// le réseau répond, les tests passent ; là où il ne répond pas, ils dépassent.
// Il a passé en local, passé sur un run, échoué sur le suivant — sans qu'une
// ligne ait changé. Un CI intermittent ne vaut pas mieux qu'un CI rouge : on
// cesse de le lire, et c'est exactement ce qu'il ne faut pas.
//
// LE CORRECTIF DU SITE NE SUFFIT PAS. Masquer ce module-là ferme UN chemin ;
// le prochain module qui appellera `fetch` sans masque rouvrira le même défaut,
// avec le même symptôme illisible. Ce garde-fou ferme la CLASSE : tout appel
// réseau réel échoue IMMÉDIATEMENT, et il se NOMME — au lieu d'attendre cinq
// secondes et de mourir sur un message qui ne dit pas ce qui s'est passé.
//
// CE N'EST PAS UNE INTERDICTION DE `fetch` : un test qui pose son propre
// substitut l'écrase, et c'est le cas de tous ceux qui simulent un appel.
// Seul l'appel NON masqué — celui que personne n'a décidé — est arrêté.
// ============================================================

// LA BOUCLE LOCALE RESTE OUVERTE, ET CE N'EST PAS UNE EXCEPTION DE CONFORT.
// Ce qui rend un test intermittent, c'est de dépendre d'une machine que le
// test NE POSSÈDE PAS. Un serveur que le test lui-même démarre sur 127.0.0.1
// est déterministe, arrêté avec lui, et n'a pas d'autre existence — c'est un
// morceau du test, pas une dépendance. Mesuré : le seul appelant légitime du
// dépôt est `reportingPipeline.integration.test.ts`, qui monte son propre
// serveur HTTP et lui parle. L'interdire aurait détruit un test réel pour
// soigner un symptôme qui n'était pas le sien.
const LOCALES = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', '0.0.0.0']);

const cibleDe = (entree: unknown): string =>
  typeof entree === 'string'
    ? entree
    : String((entree as { url?: string })?.url ?? entree);

const estLocale = (cible: string): boolean => {
  try {
    return LOCALES.has(new URL(cible).hostname);
  } catch {
    return false; // adresse illisible : on ne la laisse pas passer
  }
};

const vraiFetch = globalThis.fetch;

globalThis.fetch = ((entree: unknown, options?: unknown) => {
  const cible = cibleDe(entree);
  if (estLocale(cible)) {
    return (vraiFetch as (a: unknown, b?: unknown) => Promise<Response>)(entree, options);
  }
  // PROMESSE REJETÉE, JAMAIS UNE LEVÉE SYNCHRONE — `fetch` ne lève pas, il
  // rejette. Lever ici casserait tout appelant en `.catch()` au lieu de lui
  // rendre l'erreur qu'il sait traiter, et le garde-fou deviendrait lui-même
  // une source de panne. (Défaut trouvé en écrivant son cliquet, pas après.)
  return Promise.reject(
    new Error(
      `APPEL RÉSEAU EXTERNE dans un test : ${cible}\n` +
        "Aucun test ne doit sortir sur le réseau — il deviendrait INTERMITTENT.\n" +
        'Masque le module qui émet cet appel (`vi.mock(...)`), ou pose ton propre `fetch`.',
    ),
  );
}) as typeof fetch;
