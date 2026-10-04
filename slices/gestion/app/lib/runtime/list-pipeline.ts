// PIPELINE DE LIGNES D'UNE LISTE (E1/E2, D-129) — module PUR, zéro import.
//
// POURQUOI UN MODULE SÉPARÉ : la logique de visibilité des lignes doit être
// PROUVABLE par tests unitaires sans monter react-native. `AirList` ne fait
// plus que tenir les états de saisie et déléguer ici — le composant reste
// mince, la vérité est testable.
//
// ORDRE VOLONTAIRE (D-065 étendu) : périmètre relationnel (E2), puis
// recherche, puis filtres (littéral + pilotés, CONJONCTION), puis tri, puis
// borne. Fermé par construction : trois opérateurs, une direction, une borne,
// au plus trois filtres — aucune expression arbitraire n'entre jamais.

export interface LigneListe {
  readonly id: string;
  readonly values: Readonly<Record<string, string>>;
}

export type OperateurFiltre = "eq" | "neq" | "contains";

export interface FiltreEffectif {
  readonly fieldId: string;
  readonly operator: OperateurFiltre;
  /** Valeur du document (littéral) ou saisie de l'utilisateur (piloté). */
  readonly valeur: string;
}

export interface ParametresPipeline {
  /**
   * E2 — PORTÉE RELATIONNELLE. Si `scopeFieldId` est déclaré, seules les
   * lignes dont ce champ vaut `instanceId` sont visibles. SANS instance
   * courante, une liste scopée est VIDE — jamais de repli silencieux vers un
   * autre parent (la classe « premier enregistrement en silence » ne doit pas
   * renaître ici ; D-129).
   */
  readonly scopeFieldId?: string;
  readonly instanceId?: string;
  readonly rechercheChamp?: string;
  readonly recherche?: string;
  /** Filtres effectifs, littéral inclus — un filtre à valeur vide est INACTIF. */
  readonly filtres?: readonly FiltreEffectif[];
  readonly triChamp?: string;
  readonly triDesc?: boolean;
  readonly borne?: number;
}

const passeFiltre = (v: string, f: FiltreEffectif): boolean =>
  f.operator === "neq" ? v !== f.valeur : f.operator === "contains" ? v.includes(f.valeur) : v === f.valeur;

export function lignesVisibles(
  instances: readonly LigneListe[],
  p: ParametresPipeline,
): readonly LigneListe[] {
  const scopees =
    p.scopeFieldId === undefined
      ? instances
      : p.instanceId === undefined
        ? []
        : instances.filter((i) => (i.values[p.scopeFieldId as string] ?? "") === p.instanceId);
  const saisie = (p.recherche ?? "").trim().toLowerCase();
  const cherchees =
    p.rechercheChamp === undefined || saisie === ""
      ? scopees
      : scopees.filter((i) =>
          (i.values[p.rechercheChamp as string] ?? "").toLowerCase().includes(saisie),
        );
  const actifs = (p.filtres ?? []).filter((f) => f.valeur !== "");
  const filtrees = actifs.reduce(
    (lignes, f) => lignes.filter((i) => passeFiltre(i.values[f.fieldId] ?? "", f)),
    cherchees,
  );
  const triees =
    p.triChamp === undefined
      ? filtrees
      : [...filtrees].sort((x, y) => {
          const a = x.values[p.triChamp as string] ?? "";
          const c = y.values[p.triChamp as string] ?? "";
          const na = Number(a);
          const nc = Number(c);
          const ordre = Number.isFinite(na) && Number.isFinite(nc) ? na - nc : a.localeCompare(c);
          return p.triDesc === true ? -ordre : ordre;
        });
  return p.borne === undefined ? triees : triees.slice(0, p.borne);
}

/** Valeurs distinctes d'un champ sur le périmètre déjà scopé — options `choice`. */
export function optionsDistinctes(
  instances: readonly LigneListe[],
  fieldId: string,
): readonly string[] {
  return [...new Set(instances.map((i) => i.values[fieldId] ?? "").filter((v) => v !== ""))].sort();
}

/**
 * EP-194 ① — AU-DELÀ D'UN CERTAIN NOMBRE, LES OPTIONS SE REPLIENT.
 *
 * DÉFAUT VU SUR L'APPAREIL, jamais par un test : un écran de catalogue portait
 * DEUX champs de filtre, l'un à six valeurs et l'autre à deux. Les huit puces
 * ont pris la moitié de la hauteur utile — DEUX lignes de contenu là où il en
 * tenait six. Le contenu est ce que l'utilisateur est venu voir ; les filtres
 * servent à y arriver.
 *
 * POURQUOI LE MOTEUR PEUT TRANCHER SEUL : les options ne sont PAS déclarées au
 * document. Elles sont CALCULÉES — valeurs distinctes du champ dans les
 * données chargées, juste au-dessus — donc leur nombre est connu à l'instant
 * précis où il faut décider, sans que le document ait rien à dire.
 *
 * SEUIL = DÉCISION PRODUIT, ÉTIQUETÉE. Cherché à la source, comme aux passes
 * de présentation : la documentation Compose des chips ne dit RIEN du nombre
 * ni du débordement, et `m3.material.io` reste illisible (rendu en
 * JavaScript — limite déjà consignée en tête de `presentation.ts`). AUCUNE
 * convention ne fonde ce seuil : il n'est donc pas présenté comme une.
 *
 * UN — ET C'EST YOUSSOUF QUI L'A FIXÉ, PAS MOI.
 *
 * J'avais posé QUATRE en le raisonnant seul : « deux ou trois options tiennent
 * sur une ligne ». C'était un arbitrage PRODUIT, et je l'ai tranché en silence
 * alors que la méthode l'interdit — une décision produit se présente, elle ne
 * se décide pas dans un commentaire. Youssouf a repris la main : au-delà d'UNE
 * option, elles se replient.
 *
 * ET SA RÈGLE EST PLUS FRANCHE QUE LA MIENNE : un filtre à une seule valeur ne
 * filtre rien (tout le contenu la porte) ; dès qu'il y en a deux, le choix
 * existe et sa place est derrière un déclencheur, pas étalée devant le contenu.
 * Mon seuil laissait passer quatre puces par champ — avec trois champs, douze
 * puces restaient permises. La sienne n'en laisse aucune.
 *
 * Le seuil vaut pour TOUT domaine — douze catégories de plats posent
 * exactement le problème de sept catégories de logement.
 *
 * ICI ET PAS DANS LE BLOC, et ce sont les cliquets du dépôt qui l'ont dit :
 * `components.tsx` n'admet que trois imports (pas `useState`) et interdit
 * toute chaîne linguistique. L'étanchéité des blocs est délibérée — « la
 * saisie appartient à l'appelant » (D-129). La RÈGLE est donc pure et vit
 * ici ; l'ÉTAT appartient au runtime qui porte déjà celui des filtres.
 *
 * REPLIÉ N'EST PAS PERDU : l'option RETENUE reste visible, sans quoi
 * l'utilisateur verrait une liste réduite sans rien qui dise pourquoi.
 */
export const SEUIL_OPTIONS_ETALEES = 1;

export function optionsAffichees(
  options: readonly string[],
  valeurRetenue: string,
  deplie: boolean,
): readonly string[] {
  if (options.length <= SEUIL_OPTIONS_ETALEES || deplie) return options;
  return options.filter((o) => o === valeurRetenue);
}

/** Vrai quand la rangée déborde et demande donc un déclencheur. */
export function optionsDebordent(options: readonly string[]): boolean {
  return options.length > SEUIL_OPTIONS_ETALEES;
}

// ── MODE D'ASSEMBLAGE D'UNE LISTE (mission composition II, 2026-09-10) ──
//
// RÈGLE MÉCANIQUE, tous archétypes : la FENÊTRE PLEINE (Section fill +
// virtualisation) appartient à l'écran dont la liste est l'UNIQUE liste —
// catalogue dédié, fil social, historique. Partout ailleurs, une liste
// verticale est un APERÇU BORNÉ qui coule dans l'écran : c'est ce qui rend
// un accueil-fleuve composable sans couloirs. Une rangée horizontale reste
// une rangée. Décidé ICI, pur et testé — jamais au juger d'un composant.
export type ModeListe = "fenetre" | "apercu" | "rangee";

export function modeListe(
  layout: string | undefined,
  nbListesDeLEcran: number,
): ModeListe {
  if (layout === "row") return "rangee";
  return nbListesDeLEcran <= 1 ? "fenetre" : "apercu";
}

/** Nombre d'éléments d'un aperçu : le document (pageSize) décide, sinon une
 * grille montre 4 cartes (2×2) et une pile 3 lignes. */
export function tailleApercu(layout: string | undefined, pageSize: number | undefined): number {
  if (pageSize !== undefined && pageSize > 0) return pageSize;
  return layout === "grid" ? 4 : 3;
}

/**
 * FORMATAGE D'UNE VALEUR À UNITÉ — pur, adversarial-testé : très grands
 * nombres, très petits, décimales, non-numérique. Le nombre prend les
 * séparateurs fr-FR ; l'unité vient du DOCUMENT, jamais du moteur.
 */
/**
 * EP-201 F — UNE UNITE QUI EST UN CODE DE MONNAIE SE REND COMME UNE MONNAIE.
 *
 * Trois lettres majuscules : c est la forme d un code ISO 4217. Le rendu
 * passe alors par `Intl.NumberFormat`, qui connait le symbole, sa POSITION et
 * le nombre de decimales de chaque monnaie — XAF et XOF s affichent sans
 * decimale, l euro en porte deux, et le symbole precede en anglais quand il
 * suit en francais.
 *
 * POURQUOI CE N EST PAS UNE CONNAISSANCE REGIONALE DU MOTEUR. `Intl` est une
 * norme du langage, au meme titre que le calendrier gregorien : le moteur n y
 * apprend AUCUN pays, aucune table, aucun operateur. Il recoit un code que le
 * DOCUMENT porte, et il le met en forme. Ecrire « FCFA » a la main, a l
 * inverse, figerait un mot qui varie selon la langue.
 *
 * REPLI SUR LE COMPORTEMENT ANTERIEUR : une unite qui n est pas un code de
 * monnaie — « kg », « m2 », « min » — se rend exactement comme avant, et un
 * code inconnu d `Intl` aussi. Rien de ce qui marchait ne change.
 */
const CODE_MONNAIE = /^[A-Z]{3}$/;

export function formatValeur(brut: string, unit: string | undefined): string {
  if (unit === undefined) return brut;
  const n = Number(brut);
  if (CODE_MONNAIE.test(unit) && Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: unit }).format(n);
    } catch {
      // Code inconnu d `Intl` : on retombe sur le rendu anterieur plutot que
      // de perdre la valeur. Jamais d echec silencieux a l ecran.
      return `${n.toLocaleString("fr-FR")} ${unit}`;
    }
  }
  return Number.isFinite(n) ? `${n.toLocaleString("fr-FR")} ${unit}` : `${brut} ${unit}`;
}
