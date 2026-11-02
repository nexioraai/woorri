/**
 * LA RETOUCHE — modifier une œuvre existante, sans la régénérer.
 *
 * ── CE QUE LE MODÈLE REÇOIT, ET CE QU'IL NE REÇOIT PAS.
 *
 * Il reçoit LES FICHIERS, pas le cahier. Lui redonner le cahier serait lui
 * demander de régénérer : il réécrirait tout, et la personne qui voulait des
 * boutons verts recevrait une autre application.
 *
 * ── ET IL NE REND QUE CE QU'IL CHANGE. MESURÉ.
 *
 * Appel réel du 2026-11-02 sur l'œuvre CONTERAK (15 fichiers, 73 Ko) avec
 * « mets les boutons en vert » :
 *
 *   entrée 22 382 jetons · sortie 4 285 · 21,0 s · stop end_turn
 *   fichiers rendus : 1 / 15  →  systeme/ui.tsx
 *   « Les boutons d'action sont tous rendus par le composant Bouton de la
 *     bibliothèque d'interface : c'est donc le seul endroit à retoucher »
 *
 * Il a trouvé seul que tous les boutons passent par un composant partagé.
 * Personne ne le lui avait expliqué. Rendre les seize fichiers aurait fait
 * payer la réécriture de ce que personne ne demandait de toucher — et pris
 * le risque d'abîmer ailleurs.
 */

/**
 * LE PLAFOND DE PRIX, CALCULÉ PAR ŒUVRE — et c'est un MAXIMUM, pas une
 * estimation.
 *
 * ── POURQUOI « AU PLUS » ET PAS « ENVIRON ».
 *
 * « Environ » annonce une estimation ; ce nombre est un maximum. Le mot doit
 * dire ce que le nombre est — même discipline que pour `prixEstime`, qui
 * annonce une moyenne et dit « environ ».
 *
 * ── POURQUOI PAR ŒUVRE ET PAS EN DUR.
 *
 * Mesuré : 22 382 jetons pour 74 752 octets, soit 0,299 jeton par octet. Et
 * les œuvres ne se ressemblent pas — la plus grosse version stockée fait
 * 106 821 octets contre 51 709 pour la plus petite courante. Un plafond
 * calculé sur la petite ne serait plus un plafond sur la grosse.
 *
 * ── ET LE TARIF EST CELUI DU MODÈLE LOURD, FAUTE DE MIEUX.
 *
 * `fournisseur.ts` ne porte qu'UN couple de prix par fournisseur, alors que
 * le compte emploie deux modèles de tarifs différents : la retouche tourne
 * sur `deepseek-flash`, moins cher que `deepseek-v4-pro` dont le prix est
 * configuré. Le plafond est donc VRAI mais large. Quand le tarif de `flash`
 * sera posé dans `fournisseur.ts`, ce calcul deviendra une estimation serrée
 * et l'affichage passera de « au plus » à « environ ».
 */
export const JETONS_PAR_OCTET = 0.3

export function plafondRetouche(
  octetsDocument: number,
  sortieMax: number,
  prix: { readonly entree: number; readonly sortie: number },
): { readonly usd: number; readonly phrase: string } {
  const entree = Math.ceil(octetsDocument * JETONS_PAR_OCTET)
  // LA SORTIE EST PRISE À SON MAXIMUM AUTORISÉ, pas à sa valeur observée :
  // c'est ce qui fait du chiffre un plafond et pas une moyenne.
  const usd = (entree * prix.entree + sortieMax * prix.sortie) / 1e6
  return { usd, phrase: `au plus ${usd.toFixed(2)} $` }
}

/**
 * LE PÉRIMÈTRE, DIT À LA PERSONNE AVANT QU'ELLE ÉCRIVE.
 *
 * La retouche locale : textes, couleurs, libellés, un champ sur un écran qui
 * existe. PAS d'écran nouveau — c'est le lot 3. Une demande hors périmètre
 * est refusée clairement, jamais tentée à moitié : une tentative à moitié
 * produit une application à moitié, et c'est la personne qui la paie.
 */
export const PERIMETRE_RETOUCHE =
  'Textes, couleurs, libellés, un champ sur un écran qui existe. ' +
  'Pas de nouvel écran ni de nouvelle fonction — dites-le-moi et je vous ' +
  'dirai si c’est possible autrement.'

/** Le marqueur que le modèle rend quand la demande sort du périmètre. */
export const HORS_PERIMETRE = 'HORS PERIMETRE'

/**
 * LA CONSIGNE DE RETOUCHE.
 *
 * ── « Réponds dans la langue de la demande » n'est pas un ornement.
 *
 * Règle posée depuis longtemps dans ce dépôt : l'IA répond dans la langue de
 * l'utilisateur. Un cahier en français doit donner un refus en français —
 * sinon la personne reçoit un message qu'elle ne lit pas, et elle croit à
 * une panne.
 */
export const CONSIGNE_RETOUCHE = [
  'Tu RETOUCHES une application existante. Tu ne la régénères pas.',
  '',
  'On te donne TOUS ses fichiers. Tu rends SEULEMENT ceux que tu modifies,',
  'au format « === chemin === » suivi du contenu COMPLET du fichier.',
  'Un fichier que tu rends remplace l’ancien : ne rends jamais un extrait.',
  '',
  'PÉRIMÈTRE : textes, couleurs, libellés, un champ sur un écran existant.',
  'Si la demande sort de ce périmètre — un écran nouveau, une fonction',
  `nouvelle, une connexion externe —, réponds « ${HORS_PERIMETRE} » suivi`,
  'de la raison en une phrase, et NE RENDS AUCUN FICHIER.',
  '',
  'Cherche l’endroit JUSTE : si tous les boutons passent par un composant',
  'partagé, retouche ce composant et lui seul.',
  '',
  'Réponds dans la langue de la demande.',
].join('\n')

/** Le modèle a-t-il refusé la demande ? Lu sur sa réponse, pas supposé. */
export function refusHorsPerimetre(texte: string): string | null {
  const i = texte.indexOf(HORS_PERIMETRE)
  if (i < 0) return null
  const raison = texte
    .slice(i + HORS_PERIMETRE.length)
    .replace(/^[\s:—-]+/u, '')
    .split('\n')[0]
    .trim()
  return raison === '' ? 'Cette demande sort de ce que je peux retoucher.' : raison
}

/** Ce qu'une retouche a changé, dit dans les mots de la personne. */
export function etapeRetouche(demande: string): string {
  // ── LES MOTS DE L'UTILISATEUR, PAS LES NÔTRES.
  //
  // « modification » ne dit rien ; « modifiée : boutons en vert » se relit
  // six mois plus tard. La liste doit rester lisible, donc on borne — une
  // demande de trois lignes ne doit pas déformer la carte.
  const propre = demande.replace(/\s+/gu, ' ').trim()
  return `modifiée : ${propre.length > 60 ? `${propre.slice(0, 57)}…` : propre}`
}

/** Ce qu'un juge dit d'une version : vert, ou rouge avec son compte. */
export type NoteJuge = { readonly nom: string; readonly defauts: number }

/**
 * LE JUGE DE NON-RÉGRESSION — on compare l'après à l'avant, pas à zéro.
 *
 * ── POURQUOI UNE COMPARAISON ET PAS UN SEUIL.
 *
 * Une œuvre livrée porte déjà des défauts : des contrôles muets, des jetons
 * inconnus. Exiger zéro refuserait toute retouche sur une application qui
 * marche. Ce qu'on refuse, c'est D'EN AJOUTER.
 *
 * ── UN JUGE QUI ÉTAIT VERT ET DEVIENT ROUGE : ON REFUSE.
 *
 * Et on dit LEQUEL. Un refus qui ne nomme pas le juge oblige la personne à
 * deviner ce qu'elle a cassé — et elle n'a rien cassé, c'est le modèle.
 *
 * ── LA COUVERTURE QUI BAISSE : ON DEMANDE, ON NE BLOQUE PAS.
 *
 * Supprimer un écran est une demande LÉGITIME. Un juge qui l'interdirait
 * ferait de la couverture une prison. On signale, la personne tranche.
 */
export type VerdictRetouche = {
  /** Les juges qui ont empiré. Vide = on peut écrire la version. */
  readonly regressions: readonly { readonly juge: string; readonly avant: number; readonly apres: number }[]
  /** La couverture a baissé : à confirmer, pas à refuser. */
  readonly couvertureEnBaisse: { readonly avant: number; readonly apres: number } | null
}

export function comparerJuges(
  avant: readonly NoteJuge[],
  apres: readonly NoteJuge[],
  couverture: { readonly avant: number; readonly apres: number } | null,
): VerdictRetouche {
  const parNom = new Map(avant.map((n) => [n.nom, n.defauts]))
  const regressions = apres
    .filter((n) => n.defauts > (parNom.get(n.nom) ?? 0))
    .map((n) => ({ juge: n.nom, avant: parNom.get(n.nom) ?? 0, apres: n.defauts }))
  return {
    regressions,
    couvertureEnBaisse:
      couverture !== null && couverture.apres < couverture.avant ? couverture : null,
  }
}
