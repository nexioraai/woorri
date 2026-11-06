/**
 * LES EXIGENCES VIENNENT DE LA DEMANDE — ②β.
 *
 * ── CE QUE CE MODULE REMPLACE, ET LA MESURE QUI L'A DÉCIDÉ.
 *
 * `juge-couverture` jugeait sur DIX-NEUF familles écrites d'avance. Mesuré
 * le 2026-11-06, code livré = `<div>bonjour</div>` :
 *
 *   salon de coiffure        0 famille → taux 1,00
 *   site institutionnel CPA  0 famille → taux 1,00
 *   boutique simple          0 famille → taux 1,00
 *   carnet de notes          0 famille → taux 1,00
 *
 * Et au seuil 1 au lieu de 3 : encore zéro. La cause n'était donc pas « la
 * liste est trop courte » — les dix-neuf familles sont l'INDEX D'UN SEUL
 * DOCUMENT. Le cahier fondateur (22 866 car.) en déclenche treize ; une
 * demande ordinaire, aucune. Agrandir la liste n'était pas une correction
 * de degré, et le moi du 31 octobre l'avait déjà écrit dans
 * `extraction-exigences` : « une famille s'ajoutait à chaque défaut
 * révélé — indéfiniment. »
 *
 * ── DEUX LISTES FERMÉES, ET POURQUOI ELLES NE SONT PAS LE MÊME PIÈGE.
 *
 * Le test qui les sépare du lexique métier est mécanique : CETTE LISTE
 * GRANDIT-ELLE QUAND UNE NOUVELLE DEMANDE ARRIVE ?
 *
 *   · les mots-outils (« le », « pour », « je veux ») : non — c'est une
 *     propriété du FRANÇAIS ;
 *   · les mots de structure documentaire (« cahier », « annexe »,
 *     « section ») : non — c'est une propriété des cahiers des charges
 *     français, pas d'un métier ;
 *   · « mobile money », « agences », « réservation » : OUI, et c'est
 *     exactement pour ça que les dix-neuf ont échoué.
 *
 * ── L'INSISTANCE NE PEUT PAS ÊTRE UNE FRÉQUENCE. MESURÉ.
 *
 *   salon de coiffure        19 termes, 2 répétés
 *   site institutionnel CPA  17 termes, AUCUN répété
 *   boutique simple          10 termes, AUCUN répété
 *   carnet de notes           7 termes, AUCUN répété
 *   cahier fondateur        672 termes, 166 à ≥3
 *
 * Un seuil absolu à 3 (celui d'avant) laisse le juge MUET sur trois
 * demandes ordinaires sur quatre. Or sur une demande de trois phrases,
 * apparaître UNE FOIS est l'insistance maximale possible : tout ce qui est
 * demandé y est dit une fois. Le seuil se lit donc par rapport au
 * document, jamais dans l'absolu.
 */

/** Une propriété du français. Elle ne grandit pas avec les demandes. */
const MOTS_OUTILS = new Set(
  `le la les un une des du de au aux et ou mais donc car
   que qui quoi dont où si ne pas plus moins tres très bien aussi meme même
   je tu il elle on nous vous ils elles me te se lui leur mon ma mes ton ta tes son sa ses
   notre nos votre vos leurs ce cet cette ces cela celui celle ceux
   pour par avec sans sous sur dans entre vers chez depuis pendant avant apres après
   est sont etre être ete été suis sommes etes êtes avoir avons avez ont
   veux veut voulons voulez veulent voudrais souhaite souhaiterais aimerais
   faire fait faites peut peuvent pouvoir doit doivent devoir
   lors alors quand comme tout toute tous toutes autre autres
   deja déjà encore jamais toujours ici
   faut falloir chaque quelques plusieurs beaucoup
   afin ainsi ensuite puis enfin egalement également
   mettre voir dire aller
   presenter presente présenter présente presentation présentation
   prennent prendre consultent consulter visible possible
   etc`
    .split(/\s+/u)
    .filter((m) => m !== ''),
)

/**
 * LES MOTS PAR LESQUELS UN DOCUMENT PARLE DE LUI-MÊME.
 *
 * MESURÉ : sur le cahier fondateur, six des dix-huit termes absents du code
 * livré étaient « cahier », « charge », « selon », « condition »,
 * « demande », « donnee » — le document se décrivant, pas le produit à
 * livrer. Reprocher au modèle de ne pas avoir implémenté « cahier » lui
 * ferait brûler un tour payant contre un mur.
 */
const MOTS_DOCUMENT = new Set(
  `cahier charge charges selon condition conditions demande demandes
   document documents section sections annexe annexes version versions
   present présent chapitre partie parties point points ligne lignes page pages
   objet objectif objectifs contexte perimetre périmètre livrable livrables
   exigence exigences specification spécification fonctionnel technique
   generale générale general général detail détail precision précision`
    .split(/\s+/u)
    .filter((m) => m !== ''),
)

/**
 * PLAFOND DU NOMBRE D'EXIGENCES RETENUES.
 *
 * Un cahier de 22 866 caractères rend 672 termes : les juger tous ferait un
 * rapport illisible et un reproche que le modèle ne peut pas satisfaire.
 * Le nombre ÉCARTÉ voyage avec le rapport — un plafond silencieux se lit
 * comme « tout est couvert ».
 */
export const PLAFOND_EXIGENCES = 25

export type TermeExigence = {
  /** Le radical cherché, sans accent, au singulier. */
  readonly terme: string
  /** Combien de fois la demande y revient. */
  readonly insistance: number
}

export type ExigencesDeLaDemande = {
  readonly termes: readonly TermeExigence[]
  /** Combien de termes le plafond a écartés. Jamais tu. */
  readonly ecartes: number
  /** Le seuil retenu, et il DÉPEND du document. */
  readonly seuil: number
}

const sansAccent = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/gu, '')

/**
 * Le radical : on retire le pluriel, rien d'autre.
 *
 * Un vrai lemmatiseur demanderait un dictionnaire — donc une liste qui
 * grandit, donc le piège qu'on vient de quitter.
 */
const radical = (m: string): string => m.replace(/(?:aux|x|s)$/u, '')

/**
 * Le motif qui cherche un radical dans du texte, pluriel et suffixes compris.
 *
 * ── LE DRAPEAU `g` N'EST PAS DÉCORATIF.
 *
 * `compte()` avance par `motif.exec(texte)` en boucle. Sans `g`, `exec`
 * rend toujours la PREMIÈRE correspondance et `lastIndex` ne bouge
 * jamais : boucle infinie. Mes dix-neuf familles l'avaient, mon motif
 * dérivé non — et la mesure s'est pendue, pas plantée, ce qui est pire à
 * lire.
 */
export const motifTerme = (terme: string): RegExp => new RegExp(`\\b${terme}`, 'gu')

/**
 * LE TEXTE NORMALISÉ COMME LES TERMES LE SONT.
 *
 * Les radicaux sortent SANS ACCENT (`communique`, `theme`). Les chercher
 * dans un texte accentué ne trouverait jamais « communiqué » ni « thème » :
 * le juge rendrait « absente » sur une exigence que la demande énonce et
 * que le code porte. Un faux rouge, et un reproche payant contre un mur.
 */
export const texteCherchable = (t: string): string => sansAccent(t.toLowerCase())

export function exigencesDeLaDemande(demande: string): ExigencesDeLaDemande {
  const comptes = new Map<string, number>()
  for (const brut of sansAccent(demande.toLowerCase())
    .replace(/[’']/gu, ' ')
    .split(/[^a-z0-9]+/u)) {
    if (brut.length < 4 || MOTS_OUTILS.has(brut) || MOTS_DOCUMENT.has(brut)) continue
    const r = radical(brut)
    if (r.length < 4 || MOTS_OUTILS.has(r) || MOTS_DOCUMENT.has(r)) continue
    comptes.set(r, (comptes.get(r) ?? 0) + 1)
  }
  const tous = [...comptes.entries()]
    .map(([terme, insistance]) => ({ terme, insistance }))
    .sort((a, b) => b.insistance - a.insistance || a.terme.localeCompare(b.terme))
  if (tous.length === 0) return { termes: [], ecartes: 0, seuil: 1 }

  // ── LE SEUIL SE LIT PAR RAPPORT AU DOCUMENT.
  //
  // `fmax <= 2` : rien ne se répète vraiment — une demande parlée. Tout ce
  // qui y est dit est dit une fois, donc tout compte.
  // Sinon : un huitième de l'insistance maximale, jamais moins de 3. Sur le
  // cahier fondateur (fmax 57) ça retient une vingtaine de termes, dont
  // `fournisseur` ×56 — absent du code livré, et jamais reproché avant.
  const fmax = tous[0]?.insistance ?? 1
  const seuil = fmax <= 2 ? 1 : Math.max(3, Math.ceil(fmax / 8))
  const retenus = tous.filter((t) => t.insistance >= seuil)
  return {
    termes: retenus.slice(0, PLAFOND_EXIGENCES),
    ecartes: Math.max(0, retenus.length - PLAFOND_EXIGENCES),
    seuil,
  }
}
