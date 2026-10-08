// ============================================================
// LE CODE SEUL — commentaires et chaines neutralises, EN UNE PASSE.
//
// ── POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST PARTAGE.
//
// Dans un depot ou des controles lisent le source comme du TEXTE, un
// commentaire n'est pas inerte. Ce piege s'est referme QUATRE fois :
//
//   1. `emission-coeur.mjs` — un commentaire citait le repere qu'un
//      instrument cherchait ;
//   2. `integration-accueil` — la prose expliquant qu'on ne touche pas a
//      `siteMode` contenait le mot `siteMode` ;
//   3. `tracage-cloture` — le commentaire disant pourquoi `creerClient` a
//      ete abandonne contenait `creerClient` ;
//   4. `plafond-jetons` — le message d'erreur de l'API, CITE COMME PREUVE,
//      contenait `max_tokens: 999999`.
//
// A chaque fois la meme forme : la documentation d'une regle viole la regle.
//
// ── ET CET EN-TETE EST EN COMMENTAIRES DE LIGNE, EXPRES.
//
// Cinquieme fois, dans CE fichier, sur sa premiere version : l'en-tete etait
// un bloc, et il expliquait le piege en citant la sequence qui FERME un
// bloc. Le commentaire s'est donc termine au milieu de sa propre
// explication, et le reste de la prose est devenu du code. Un commentaire de
// ligne, lui, se termine a la fin de la ligne, quoi qu'il contienne.
//
// ── ET UNE PASSE, PAS DEUX.
//
// Deux `replace` successifs ne suffisent pas. Un commentaire de LIGNE peut
// contenir une sequence d'ouverture de bloc — un chemin de paquet termine
// par un joker double en contient une — et le second passage y lit une
// ouverture qui court jusqu'a la fermeture suivante, effacant le code entre
// les deux. Mesure : quarante lignes avalees, dont les imports qu'on venait
// mesurer.
//
// Les chaines sont reconnues EN PREMIER, pour qu'une sequence de commentaire
// ecrite DANS une chaine ne passe pas pour un commentaire. Les longueurs
// sont preservees : aucun decalage, les positions restent comparables.
// ============================================================
export function sansCommentaires(src: string): string {
  return src.replace(
    /("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(`(?:\\.|[^`\\])*`)|(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)/g,
    (m, _d, _s, _t, ligne, bloc) =>
      ligne === undefined && bloc === undefined ? m : m.replace(/[^\n]/g, ' '),
  )
}
