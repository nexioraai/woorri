/**
 * LIRE UNE RÉPONSE QUI BAT — et une réponse ordinaire, du même geste.
 *
 * ── POURQUOI CE MODULE EXISTE, MESURÉ EN PRODUCTION LE 2026-10-19.
 *
 * La route d'écriture directe a travaillé 255 secondes, abouti, et écrit sa
 * ligne en base. L'écran, lui, avait déjà renoncé : « Lecture impossible ».
 *
 * Le filet du navigateur est à 45 minutes — ce n'était pas lui. C'était la
 * connexion, restée SANS UN SEUL OCTET pendant plus de quatre minutes, qu'une
 * couche intermédiaire a fermée. La documentation de l'hébergeur prescrit la
 * réponse : émettre un battement pendant le travail.
 *
 * La route émet donc une ligne vide toutes les dix secondes, puis UNE ligne
 * JSON à la fin.
 *
 * ── ET LE LECTEUR DOIT SERVIR LES DEUX FORMES, SANS LE SAVOIR.
 *
 * Les refus rapides de la route — demande vide, mauvais moteur, clé absente —
 * restent du JSON simple : ils répondent en quelques millisecondes et n'ont
 * aucun besoin de battre. Si l'écran devait choisir son lecteur selon la
 * forme reçue, il se tromperait le jour où une route change d'avis.
 *
 * Or une réponse JSON ordinaire EST une seule ligne non vide. Prendre la
 * DERNIÈRE LIGNE NON VIDE lit donc correctement les deux, sans condition.
 */

/**
 * La dernière ligne non vide, interprétée comme JSON.
 *
 * Rend `null` si le corps ne porte aucune ligne lisible — et c'est un cas
 * RÉEL, pas une politesse : une connexion coupée en plein travail laisse un
 * corps qui ne contient que des battements. L'appelant doit pouvoir le dire
 * à la personne au lieu d'afficher un objet vide.
 */
export function derniereLigneJson<T>(corps: string): T | null {
  const lignes = corps.split('\n')
  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    const l = (lignes[i] ?? '').trim()
    if (l === '') continue
    try {
      return JSON.parse(l) as T
    } catch {
      // Une ligne illisible ne condamne pas les précédentes : on remonte.
      // Un battement est vide, donc déjà écarté ; ceci couvre le cas d'une
      // réponse tronquée en plein milieu de son dernier objet.
      continue
    }
  }
  return null
}

/**
 * Lit la réponse entière, battements compris, et en tire l'objet final.
 *
 * ON LIT LE CORPS EN TEXTE, jamais `res.json()` : `json()` refuserait un
 * corps qui commence par des lignes vides, et c'est exactement ce que produit
 * une route qui bat.
 */
export async function lireReponseQuiBat<T>(res: Response): Promise<T | null> {
  return derniereLigneJson<T>(await res.text())
}
