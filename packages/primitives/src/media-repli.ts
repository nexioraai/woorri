// EP-132 — CE QUI TIENT LA PLACE D'UN MÉDIA QUI NE CHARGE PAS.
//
// LA QUESTION DE RACINE, POSÉE AVANT D'ÉTENDRE QUOI QUE CE SOIT : le contrat
// porte déjà `loadingTitle` / `emptyTitle` / `errorTitle`. Couvrent-ils un
// média ? MESURE : non — ces trois-là portent sur une COLLECTION (l'état
// d'un bloc qui charge ses lignes), et un média échoue à un autre moment et
// à une autre granularité : APRÈS que la donnée a réussi, pour UNE ressource
// parmi les lignes déjà affichées. Un état par bloc ne peut pas exprimer
// « la troisième vignette n'est pas arrivée ».
//
// MAIS LE CONTRAT SAVAIT DÉJÀ DIRE L'ESSENTIEL, et c'est ce qui évite de
// l'étendre : au registre de blocs, tout bloc qui déclare porter un média
// (`imageFieldId`, optionnel) déclare AUSSI un champ de titre — celui-là
// n'est PAS optionnel. Le texte qui peut tenir la place d'un média existe
// donc TOUJOURS dans le document. Rien à ajouter au contrat : ce qui
// manquait, c'est que le rendu ne consommait pas ce qu'on lui donnait déjà.
//
// POURQUOI CETTE DÉCISION EST UNE FONCTION PURE, ET NON UN `if` DANS LA
// PRIMITIVE : le harnais de rendu ne se charge pas dans ce dépôt
// (react-native est distribué en Flow, le bundler de test le refuse) —
// mesuré, dette préexistante. Une décision écrite dans le JSX ne serait donc
// prouvable par aucun test. Écrite ici, elle l'est entièrement, et la
// primitive n'a plus qu'à obéir.
//
// CE QUE LES CONVENTIONS EN DISENT — CHERCHÉ, ET LA RÉPONSE EST « RIEN » :
// la page Compose « Loading Images from the Network » ne documente ni
// placeholder, ni image d'erreur, ni état de chargement (elle renvoie aux
// bibliothèques tierces). « Build for Billions » ne parle de placeholder que
// pour l'écran de lancement. Aucune convention de plateforme ne prescrit
// donc ce qu'il faut montrer à la place d'un média manquant. Ce qui suit est
// une DÉCISION DE CONTRAT assumée, étiquetée comme telle — jamais présentée
// comme une règle de plateforme. Le seul principe voisin trouvé (Material :
// un contenu qui échoue prend un état explicite plutôt que rien) est ce
// qu'elle applique.

/** Ce que le rendu doit produire pour un emplacement de média. */
export type DecisionMedia =
  | { readonly rend: "aucun" }
  | { readonly rend: "image"; readonly uri: string }
  | { readonly rend: "repli"; readonly texte: string };

export interface EtatMedia {
  /** Ce que le document porte. Absent ou vide ⇒ le document ne promet rien. */
  readonly uri?: string;
  /** Texte déjà fourni par le document — au registre, il n'est pas optionnel. */
  readonly texte: string;
  /** Le chargement a échoué, signalé par la couche de rendu. */
  readonly echec: boolean;
}

export function decisionMedia({ uri, texte, echec }: EtatMedia): DecisionMedia {
  // INCHANGÉ, et c'est délibéré : une valeur vide n'est pas un média manquant,
  // c'est un média NON PROMIS. Le document a le droit de ne pas en porter —
  // le champ est optionnel au registre. Rien ne doit apparaître, pas même un
  // repli : inventer une place vide serait décider à la place du document.
  if (uri === undefined || uri.trim() === "") return { rend: "aucun" };
  // PROMIS ET ABSENT : là, quelque chose manque VRAIMENT à l'écran. Le
  // rectangle vide est le seul cas qui ne dit rien du tout — il est remplacé
  // par le texte que le document porte déjà.
  if (echec) return { rend: "repli", texte };
  return { rend: "image", uri };
}
