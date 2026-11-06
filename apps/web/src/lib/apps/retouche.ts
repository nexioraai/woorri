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
/**
 * ── LA PROMESSE NON TENUE, RETIRÉE LE 2026-11-04.
 *
 * Cette phrase finissait par « dites-le-moi et je vous dirai si c'est
 * possible autrement ». Un propriétaire a décrit le barème de sa facture
 * — trois lignes, une vraie règle de métier —, a payé, et a reçu un refus
 * SANS aucun « autrement ».
 *
 *   « Une promesse non tenue après paiement est pire qu'un silence. »
 *
 * Elle dit maintenant ce qui se passe RÉELLEMENT dans ce cas, et l'écran
 * le fait : il propose la régénération, bouton compris.
 */
export const PERIMETRE_RETOUCHE =
  'Décrivez ce que vous voulez changer ou ajouter : un calcul, un écran, ' +
  'une donnée de plus. Votre application garde son adresse, sa base et ses ' +
  'utilisateurs. Si des données doivent changer, on vous le dira avant.'

/**
 * LA DÉCLARATION ACTUELLE, MONTRÉE AU MODÈLE (M4 a, 2026-11-04).
 *
 * ── LE PIÈGE QUI NE CASSE RIEN ET REND TOUT IMPOSSIBLE.
 *
 *   « La déclaration NOUVELLE doit être écrite par un modèle à qui l'on
 *     a montré l'ANCIENNE. Sans ça il réinvente ses identifiants, toutes
 *     les tables paraissent abandonnées, et la migration s'arrête
 *     SYSTÉMATIQUEMENT : garde étanche, produit inutilisable. »
 *
 * Les identifiants sont donnés tels quels — `ent_releve`, `fld_date` —
 * parce que c'est EXACTEMENT ce que M1 compare. Un modèle à qui on
 * montrerait les jolis noms réinventerait les identifiants, et chaque
 * table paraîtrait abandonnée.
 *
 * ── ET LE SILENCE EST UN CAS, PAS UN OUBLI.
 *
 * Une œuvre sans données reçoit la phrase qui le dit. Ne rien écrire
 * laisserait le modèle croire qu'on a omis de lui montrer quelque
 * chose — et il inventerait pour combler.
 */
export function blocDeclaration(entites: readonly { id: string; name: string; fields: readonly { id: string; name: string; type: string }[]; appendOnly?: boolean }[]): string {
  if (entites.length === 0) {
    return [
      'DONNÉES DE CETTE APPLICATION : AUCUNE.',
      'Elle ne conserve rien, et ce n’est pas un oubli de notre part.',
    ].join('\n')
  }
  return [
    'DONNÉES DE CETTE APPLICATION, telles qu’elles existent DÉJÀ.',
    '',
    'Emploie ces identifiants EXACTEMENT. En inventer d’autres ferait',
    'croire que les tables actuelles sont abandonnées, et la modification',
    'serait refusée pour protéger les données déjà saisies.',
    '',
    ...entites.map(
      (e) =>
        `- ${e.id} (« ${e.name} »${e.appendOnly === true ? ', journal' : ''}) : ` +
        e.fields.map((f) => `${f.id} « ${f.name} » ${f.type}`).join(', '),
    ),
  ].join('\n')
}

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
  'TU PEUX CHANGER LA LOGIQUE ET AJOUTER DES ÉCRANS. Une règle de calcul,',
  'un écran de plus, une donnée de plus : c’est le métier de cette',
  'application qui grandit, et c’est ce qu’on te demande.',
  '',
  'CE QUI RESTE HORS DE TA PORTÉE, et c’est court : une connexion à un',
  'service extérieur (paiement, courriel, API tierce), ou quoi que ce soit',
  `qui exige une clé qu’on ne t’a pas donnée. Réponds alors « ${HORS_PERIMETRE} »`,
  'suivi de la raison en une phrase, et NE RENDS AUCUN FICHIER.',
  '',
  'ET SI TA MODIFICATION A BESOIN D’UNE DONNÉE DE PLUS, DÉCLARE-LA — ne la',
  'range ni dans un état React ni dans le navigateur. Rends ce fichier EN',
  'PLUS des autres (il ne part pas dans l’application) :',
  '',
  '   === DONNEES.json ===',
  '   [{"name":"chose","fields":[{"name":"champ","type":"text"}]}]',
  '   (`chose` est REFUSÉ par le moteur : nomme ce que la table conserve.)',
  '',
  'REPRENDS LA LISTE CI-DESSOUS TELLE QUELLE et ajoute à côté. Une table',
  'que tu renommes ou que tu omets sera comprise comme ABANDONNÉE, et la',
  'modification sera refusée pour protéger ce qui y est déjà saisi.',
  '',
  'TA RAISON NE CITE JAMAIS UN FICHIER NI UN DOCUMENT DE L’APPLICATION.',
  'La personne ne sait pas qu’ils existent, et ils n’ont aucune autorité sur',
  'ce dont elle a besoin. Dis ce que TU ne peux pas faire, dans SES mots.',
  '',
  'Exemple de ce qu’il ne faut PAS écrire : « le document X exclut cette',
  'fonctionnalité ». Exemple juste : « changer la façon dont le montant est',
  'calculé demande de refaire l’application. »',
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

/**
 * LE PRÉFIXE D'UNE ÉTAPE DE RETOUCHE — exporté, donc jamais recopié.
 *
 * Le fil de l'atelier le relit pour retrouver les mots de la personne dans
 * l'étape stockée. Un littéral recopié là-bas se serait décorrélé d'ici au
 * premier changement de formulation, et le fil aurait affiché
 * « modifiée : mets les boutons en vert » comme si c'était notre phrase.
 */
export const PREFIXE_RETOUCHE = 'modifiée : '

/** Ce qu'une retouche a changé, dit dans les mots de la personne. */
export function etapeRetouche(demande: string): string {
  // ── LES MOTS DE L'UTILISATEUR, PAS LES NÔTRES.
  //
  // « modification » ne dit rien ; « modifiée : boutons en vert » se relit
  // six mois plus tard. La liste doit rester lisible, donc on borne — une
  // demande de trois lignes ne doit pas déformer la carte.
  const propre = demande.replace(/\s+/gu, ' ').trim()
  return `${PREFIXE_RETOUCHE}${propre.length > 60 ? `${propre.slice(0, 57)}…` : propre}`
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
  /**
   * LA COUVERTURE N'A PAS PU ÊTRE MESURÉE — ni avant, ni après, ni les deux.
   *
   * Ce champ existe parce qu'un `null` silencieux se lisait comme « pas de
   * régression ». Une dimension non mesurée n'est pas une dimension saine :
   * elle est MUETTE, et ça se dit à la personne qui décide.
   */
  readonly couvertureNonMesuree: boolean
}

export function comparerJuges(
  avant: readonly NoteJuge[],
  apres: readonly NoteJuge[],
  couverture: { readonly avant: number | null; readonly apres: number | null } | null,
): VerdictRetouche {
  const parNom = new Map(avant.map((n) => [n.nom, n.defauts]))
  const regressions = apres
    .filter((n) => n.defauts > (parNom.get(n.nom) ?? 0))
    .map((n) => ({ juge: n.nom, avant: parNom.get(n.nom) ?? 0, apres: n.defauts }))
  // ── DEUX CAS QUI NE SE CONFONDENT PAS.
  //
  // `null` d'un côté = le juge n'a rien pu mesurer. Comparer un chiffre à
  // rien ne donne pas « stable » : ça ne donne RIEN, et il faut le dire.
  const mesure =
    couverture !== null && couverture.avant !== null && couverture.apres !== null
      ? { avant: couverture.avant, apres: couverture.apres }
      : null
  return {
    regressions,
    couvertureEnBaisse: mesure !== null && mesure.apres < mesure.avant ? mesure : null,
    couvertureNonMesuree: couverture === null || mesure === null,
  }
}
