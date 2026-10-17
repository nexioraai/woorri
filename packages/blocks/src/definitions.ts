// REGISTRE DE SMART BLOCKS v1 (D-023) — ALLOWLIST POSITIVE : un blockType
// absent d'ici est REFUSÉ NET par le pont validateAirBlocks (patron D-020).
// Granularité : blocs COMPOSITES DE PRIMITIVES, sections d'écran (l'AIR v1
// gelé fige screens[].blocks[]). Les primitives restent HORS registre.
// Chaque définition fixe le SCHÉMA STRICT des props AIR (clé inconnue =
// refus) — le corpus a prouvé que sans schéma fermé, le LLM dérive jusque
// dans les clés de props ([mesuré] : clés en français dans un document).
// Pas d'élargissement « au cas où » : ajout = décision consignée + édition
// consciente du cliquet + version mineure (règle d'évolution D-020).
import { z } from "zod";
import { ROLES_ICONES } from "@deribfy/primitives/roles-icones";
// D-095 — SOURCE UNIQUE DES ÉTATS. Le registre ne redéclare plus aucune liste :
// il pointe sur les tableaux de `contracts.ts`, d'où les types DÉRIVENT aussi.
// La dérive mesurée en F5 (detail_header déclarait 1 état sur 4, form 3 sur 5)
// devient impossible par construction, et non plus seulement détectable.
import {
  BUTTON_BLOCK_STATES,
  SEARCH_ENTRY_BLOCK_STATES,
  AGENT_BLOCK_STATES,
  GRAPHIQUE_BLOCK_STATES,
  STATISTIQUES_BLOCK_STATES,
  PROSE_BLOCK_STATES,
  SPACER_BLOCK_STATES,
  DETAIL_HEADER_BLOCK_STATES,
  EMPTY_STATE_BLOCK_STATES,
  FORM_BLOCK_STATES,
  HEADER_BLOCK_STATES,
  LIST_BLOCK_STATES,
} from "./contracts.ts";

// GELÉ (D-024, revue propriétaire du 2026-08-28). Règle d'évolution
// post-gel (D-020) : AJOUT compatible = décision consignée + édition
// consciente du cliquet + version MINEURE ; retrait/renommage/changement
// de contrat = RUPTURE (décision + migration + version MAJEURE).
// 1.1.0 (D-060, 2026-08-31) — montée STRICTEMENT ADDITIVE : `form` gagne
// `loading`/`empty`, `detail_header` gagne un état. Rien n'est retiré, `state`
// reste optionnel partout, un appelant 1.0.0 est inchangé. Motif : la dimension
// C d'A++ était INATTEIGNABLE — deux des trois types consommant des données ne
// savaient pas exprimer les états que le critère nomme.
// 1.2.0 (D-087) — montée STRICTEMENT ADDITIVE : `list` gagne la vignette et la
// recherche, `detail_header` gagne son visuel. Rien n'est retiré, toutes les
// props sont optionnelles. Motif : 23 champs image declares sur 12 documents,
// RENDUS NULLE PART — le besoin du premier jour (« menu avec photos »).
// 1.3.0 (E1/E2, D-129) — filtres pilotés + portée relationnelle, ADDITIFS.
// 1.4.0 (DET-032) — `optionLabels` OPTIONNEL sur les filtres à choix : les
// libellés d'affichage déclarés par le document (AIR 1.10.0) atteignent les
// chips sans toucher valeurs, filtrage ni testID. Strictement additif.
// 1.5.0 (DET-034) — les options d'un filtre à choix deviennent des CHIPS :
// `kind: "chip"` + `selected` sur la primitive bouton (additifs). Visuel de
// badge, cible tactile intacte, état sélectionné exposé à l'accessibilité.
// 1.6.0 — le bouton d'un formulaire DIT si l'action est possible (`required`
// sur les champs), et un bouton peut porter un SIGNE (`icon`, vocabulaire
// fermé partagé avec les onglets). Strictement additifs.
// 1.8.0 — NOUVEAU type de bloc : `spacer`. Premier ajout de TYPE depuis le
// gel ; strictement additif (aucun bloc existant ne change), et c'est ce qui
// rend enfin la MISE EN PAGE exprimable.
// 1.9.0 — l'en-tête peut porter une MARQUE (`logoUri`). Additif : sans elle,
// l'en-tête est celui de 1.8.0 au caractère près.
// 1.10.0 — deux signes de plus au vocabulaire fermé : `close-outline`
// (passer l'étape) et `help-circle-outline` (aide). Additif.
// 1.11.0 — `kind: "link"` sur le bouton. Additif.
// 1.12.0 (EP-108) — montée ADDITIVE (patron D-060/D-084) : chaque bloc
// déclare la NATURE de ses props de champ (affichage | filtrage), en
// partition exhaustive. Aucun prop retiré, aucun schéma changé — le juge
// des références brutes DÉRIVE désormais cette nature au lieu de tout
// regarder (il refusait un `scopeFieldId` que la règle C5 ORDONNE).
// EP-159 — ajout ADDITIF : la famille des saisies non persistées.
// 1.15.0 (2026-10-04) — `searchMode` sur la liste. Mesure au comptoir de SGD :
// la recherche cherchait la saisie ENTIÈRE comme sous-chaîne, donc « filtre
// toyota » ne trouvait pas « filtre à huile toyota » — les deux mots y sont,
// séparés par « à huile ». Écran vide, pièce en stock, client qui attend. ADDITIF : absent = `sous_chaine`, comportement
// d'avant, aucune application existante ne change de réponse.
// 1.16.0 (2026-10-17) — DOUZIEME bloc : `statistiques`. ADDITIF STRICT :
// aucun bloc retire, aucun etat supprime, aucune prop devenue obligatoire.
// Un appelant 1.15.0 se comporte a l identique.
// 1.17.0 (2026-10-17) — l en-tete gagne un SURTITRE. ADDITIF.
// 1.18.0 (2026-10-17) — `graphique` devient EXPRIMABLE. Il portait depuis sa
// creation un tableau d objets, que `flatConfigSchema` refuse : aucun
// document ne pouvait le declarer, et la preuve est un document REFUSE. Ses
// props passent en cles pointees (`series.label`, `series.value`,
// `series.display`). RUPTURE de contrat sur un bloc que personne n avait pu
// utiliser — zero appelant, donc zero migration.
// 1.19.0 (2026-10-17) — la liste gagne l AVATAR A INITIALES (`avatarInitiales`).
// ADDITIF STRICT : absent = la liste de 1.18.0 au caractere pres. L image
// declaree prime toujours ; l avatar est le repli pour les lignes dont le
// DOCUMENT dit qu elles sont des personnes.
// 1.20.0 (2026-10-17) — `agent` gagne `errorMessage`. L agent DISAIT UN CODE
// a l utilisateur : `AirAgent` passait le code du serveur comme message, donc
// une personne lisait « AIR_AGENT_SANS_CERVEAU » dans son application, sur les
// DEUX cibles (le runtime de l agent est partage). Le bloc n avait aucun moyen
// de declarer une phrase, alors que `list`, `form` et `detail_header` l ont
// depuis 1.1.0 (D-060) : meme montee, meme patron. ADDITIF — prop optionnelle,
// et sans elle le message n est simplement pas rendu.
export const BLOCK_REGISTRY_VERSION = "1.20.0";

// Motifs d'identités stables — IDENTIQUES à @deribfy/air-schema (ids.ts) ;
// redéclarés structurellement (patron AirCapabilitySlice : pas de couplage
// de types entre paquets).
const ID_BODY = "[a-z0-9][a-z0-9_]{0,61}";
const fieldRef = z.string().regex(new RegExp(`^fld_${ID_BODY}$`));
const actionRef = z.string().regex(new RegExp(`^act_${ID_BODY}$`));

export type EntityBinding = "required" | "forbidden";

export interface BlockDefinition {
  /** Clé du registre — le `blockType` de l'AIR. */
  id: string;
  /** Version du CONTRAT du bloc (gel v1 = revue propriétaire, patron 2.5). */
  version: string;
  description: string;
  /** Liaison d'entité : exigée ou interdite — jamais ambiguë. */
  entity: EntityBinding;
  /** Schéma STRICT des props AIR (après conversion de la liste plate). */
  propsSchema: z.ZodType;
  /** Clés de props qui référencent des CHAMPS de l'entité liée. */
  fieldRefProps: readonly string[];
  /**
   * EP-108 — QUELS DE CES PROPS **AFFICHENT** LA VALEUR DU CHAMP.
   *
   * PROPRIÉTÉ MANQUANTE, mesurée : `fieldRefProps` mélangeait les props
   * d'AFFICHAGE (le composant rend la valeur) et ceux de FILTRAGE/PORTÉE
   * (la valeur sert à filtrer, scoper, trier — jamais montrée). Le juge des
   * références brutes parcourait tout : il REFUSAIT un `scopeFieldId` de
   * type `reference` que la règle C5 ORDONNE de poser — le moteur punissait
   * ce qu'il ordonnait (oscillation mesurée 4 fois).
   * PARTITION EXHAUSTIVE, cliquetée : tout prop de `fieldRefProps` est
   * soit ici, soit dans `fieldRefPropsFiltrage` — aucun prop futur ne peut
   * être oublié en silence.
   */
  fieldRefPropsAffichage: readonly string[];
  /** Le complément : props dont la valeur FILTRE, SCOPE ou TRIE. */
  fieldRefPropsFiltrage: readonly string[];
  /** Clés de props qui référencent des ACTIONS de l'AIR. */
  actionRefProps: readonly string[];
  /** États rendus par le composant (exigence du harnais 3.4). */
  states: readonly string[];
  /**
   * D-104 — LE BLOC PORTE-T-IL UNE AFFORDANCE ?
   *
   * Autrement dit : l'utilisateur peut-il DÉCLENCHER quelque chose depuis ce
   * bloc ? La réponse est décidable et vérifiée : un bloc porte une affordance
   * ssi son contrat déclare un gestionnaire `on*` — `onPress`, `onItemPress`,
   * `onSubmit`, `onAction`. `etancheite-affordance.test.ts` lie cette
   * déclaration au contrat et la fait échouer si les deux divergent.
   *
   * Deux consommateurs en dérivent, au lieu de recopier chacun sa liste :
   * `validateAirBlocks` (qui REFUSE un déclencheur `ui` sur un bloc sans
   * affordance) et `controls()` (qui compte les contrôles fantômes).
   */
  porteAffordance: boolean;
}

export const BLOCKS: readonly BlockDefinition[] = [
  {
    id: "button",
    version: "1.0.0",
    description: "Action autonome (CTA) — rendue par la primitive AppButton.",
    entity: "forbidden",
    // F1 (revue pré-gel 2026-08-28) : actionId REQUIS — un CTA sans action
    // câblée serait un bouton mort dans l'app générée, divergence silencieuse
    // AIR ↔ app (l'AIR est la source de vérité, non-négociable 1).
    propsSchema: z.strictObject({
      label: z.string().min(1),
      // 1.6.0 — SIGNE du bouton. Vocabulaire FERMÉ : le moteur ne promet que
      // des glyphes qu'il sait dessiner, et la police est EMBARQUÉE (aucun
      // accès réseau). Un nom libre ferait revenir la classe de défaut que
      // `D-088` a corrigée : un document qui promet ce que le moteur ne rend
      // pas. Optionnel — sans lui, le bouton reste celui de 1.5.0.
      // UNIFICATION (2026-09-10, mesurée sur marketa) : le contrat parlait
      // DEUX langues d'icônes — noms Ionicons bruts ici, RÔLES sur les
      // onglets. Le générateur, enseigné en rôles, a écrit « compte » sur un
      // bouton : refusé. Superset ADDITIF — les rôles entrent, les noms
      // existants restent, le moteur traduit (GLYPHE_PAR_ROLE, primitives).
      // Étape ③ (EP-003) — les RÔLES viennent de LA source (roles-icones) ;
      // seuls les noms Ionicons HÉRITÉS restent locaux (superset additif).
      icon: z
        .enum([
          ...ROLES_ICONES,
          "settings-outline",
          "log-out-outline",
          "trash-outline",
          "person-outline",
          "ticket-outline",
          "card-outline",
          "checkmark-outline",
          "arrow-back-outline",
          // 1.10.0 — passer l'étape, et demander de l'aide : deux chemins
          // qu'aucune application ne devrait refuser à son utilisateur.
          "close-outline",
          "help-circle-outline",
        ])
        .optional(),
      // 1.11.0 — `link` : du TEXTE cliquable, pour un chemin secondaire qui
      // ne doit pas peser autant qu'une action (mot de passe oublie, passer
      // l'etape). Cible tactile pleine conservee.
      kind: z.enum(["primary", "ghost", "link"]).optional(),
      actionId: actionRef,
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: ["actionId"],
    states: BUTTON_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    id: "detail_header",
    version: "1.0.0",
    description:
      "Tête d'écran de détail liée à une entité (titre, sous-titre, badges, valeur).",
    entity: "required",
    propsSchema: z.strictObject({
      titleFieldId: fieldRef,
      subtitleFieldId: fieldRef.optional(),
      // min(1) est NORMATIF : interdit deux représentations de « aucun
      // badge » ([] vs absence) — forme canonique unique (déterminisme,
      // même esprit que la canonicalisation AIR). La borne max(4) initiale
      // a été SUPPRIMÉE en revue pré-gel : aucune source (AIR/ROADMAP/
      // décisions/corpus — max observé : 3), elle aurait rejeté des AIR
      // légitimes sans protéger aucune propriété architecturale.
      badgeFieldIds: z.array(fieldRef).min(1).optional(),
      /** Visuel d'en-tete de fiche (1.2.0, D-087) — champ de type `asset`. */
      imageFieldId: fieldRef.optional(),
      // REGISTRE 1.1.0 (D-060) — titres des états. DONNÉES, jamais texte moteur
      // (F3) : sans titre déclaré, l'état n'est pas rendu. Additif, optionnel.
      loadingTitle: z.string().min(1).optional(),
      emptyTitle: z.string().min(1).optional(),
      emptyMessage: z.string().min(1).optional(),
      errorTitle: z.string().min(1).optional(),
      errorMessage: z.string().min(1).optional(),

      trailingFieldId: fieldRef.optional(),
    }),
    // D-090 — `imageFieldId` MANQUAIT ICI. Il était déclaré au `propsSchema`
    // mais absent de `fieldRefProps` : rien ne vérifiait donc qu'il désigne un
    // champ de l'entité LIÉE. Mesuré : le pointer vers un champ inexistant, ou
    // vers celui d'une AUTRE entité, passait la validation — et faisait TAIRE
    // le diagnostic d'image orpheline sans que rien ne soit affiché.
    fieldRefProps: [
      "titleFieldId",
      "subtitleFieldId",
      "badgeFieldIds",
      "trailingFieldId",
      "imageFieldId",
    ],
    fieldRefPropsAffichage: [
      "titleFieldId",
      "subtitleFieldId",
      "badgeFieldIds",
      "trailingFieldId",
      "imageFieldId",
    ],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: DETAIL_HEADER_BLOCK_STATES,
    porteAffordance: false,
  },
  {
    id: "empty_state",
    version: "1.0.0",
    description: "État vide explicite d'un écran — rendu par la primitive StateView.",
    entity: "forbidden",
    // F2 (revue pré-gel 2026-08-28) : APPARIEMENT OBLIGATOIRE, dans les
    // deux sens — un actionLabel sans actionId serait silencieusement
    // ignoré au rendu (divergence AIR ↔ app) ; un actionId sans libellé ne
    // serait pas rendable. Forme choisie : superRefine sur l'objet strict —
    // exprime l'invariant d'appariement directement et produit des
    // diagnostics ciblés (path actionId / actionLabel), là où une union
    // dégraderait les messages en « aucune branche ne correspond ».
    propsSchema: z
      .strictObject({
        title: z.string().min(1),
        message: z.string().min(1).optional(),
        actionLabel: z.string().min(1).optional(),
        actionId: actionRef.optional(),
      })
      .superRefine((value, ctx) => {
        if (value.actionLabel !== undefined && value.actionId === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["actionId"],
            message:
              "actionLabel déclaré sans actionId — le libellé serait ignoré au rendu (appariement obligatoire)",
          });
        }
        if (value.actionId !== undefined && value.actionLabel === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["actionLabel"],
            message:
              "actionId déclaré sans actionLabel — l'action ne serait pas rendable (appariement obligatoire)",
          });
        }
      }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: ["actionId"],
    states: EMPTY_STATE_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    id: "form",
    version: "1.0.0",
    description:
      "Formulaire lié à une entité (champs, soumission, erreurs par champ).",
    entity: "required",
    propsSchema: z.strictObject({
      title: z.string().min(1).optional(),
      fieldIds: z.array(fieldRef).min(1),
      submitLabel: z.string().min(1),
      // EP-159 — LES SAISIES QUI N'EXISTENT PAS EN BASE. Une confirmation de
      // mot de passe, une acceptation de conditions, un code de vérification :
      // trois membres d'une même famille — une saisie CONTRAINTE et NON
      // PERSISTÉE. `fieldIds` ne pouvait pas les porter, puisqu'il ne
      // référence que des champs d'entité.
      //
      // Tableaux PARALLÈLES, comme les filtres pilotés : le flat config
      // n'admet que des feuilles. Une cible vide vaut « ce rôle n'en vise
      // aucun » — c'est le cas de l'acceptation.
      saisieRoles: z
        .array(z.enum(["confirmation", "acceptation", "verification"]))
        .min(1)
        .max(3)
        .optional(),
      saisieCibles: z.array(z.string()).min(1).max(3).optional(),
      // REGISTRE 1.1.0 (D-060) — titres des états. DONNÉES, jamais texte moteur
      // (F3) : sans titre déclaré, l'état n'est pas rendu. Additif, optionnel.
      loadingTitle: z.string().min(1).optional(),
      emptyTitle: z.string().min(1).optional(),
      emptyMessage: z.string().min(1).optional(),
      errorTitle: z.string().min(1).optional(),
      errorMessage: z.string().min(1).optional(),

    }),
    fieldRefProps: ["fieldIds"],
    fieldRefPropsAffichage: [
      "fieldIds",
    ],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: FORM_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    id: "header",
    version: "1.0.0",
    description: "Tête d'écran éditoriale (titre, sous-titre).",
    entity: "forbidden",
    propsSchema: z.strictObject({
      title: z.string().min(1),
      subtitle: z.string().min(1).optional(),
      // SURTITRE (2026-10-17) — la ligne qui SITUE, au-dessus du titre.
      // Mesure : chaque ecran de Bolt ouvre sur une petite ligne grise en
      // capitales (PILOTAGE, JOURNAL FINANCIER, COMMUNAUTE), puis le grand
      // titre, puis une phrase. TROIS niveaux. Deribfy n en portait que
      // deux, et le lecteur ne savait pas OU il etait avant d avoir lu le
      // titre entier. Additif : un document d avant ne change pas de sens.
      surtitre: z.string().min(1).optional(),
      // 1.7.0 — ACCROCHE : le titre monte d'un cran typographique. Réservé à
      // la première phrase qu'une personne lit ; optionnel, donc additif.
      accroche: z.boolean().optional(),
      // MARQUE (1.9.0) — URL https EXIGÉE par la forme : un logo en clair
      // serait un contenu mixte, refusé par la plateforme. Le validateur
      // sémantique va plus loin et exige que l'hôte soit dans
      // `network.allowedDomains` : une app ne charge pas une image depuis un
      // domaine qu'elle n'a pas déclaré.
      logoUri: z.string().regex(/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*$/).optional(),
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: HEADER_BLOCK_STATES,
    porteAffordance: false,
  },
  {
    id: "list",
    version: "1.0.0",
    description:
      "Liste d'instances d'une entité (liaisons de champs vers les lignes).",
    entity: "required",
    propsSchema: z.strictObject({
      title: z.string().min(1).optional(),
      titleFieldId: fieldRef,
      subtitleFieldId: fieldRef.optional(),
      trailingFieldId: fieldRef.optional(),
      badgeFieldId: fieldRef.optional(),
      emptyTitle: z.string().min(1).optional(),
      emptyMessage: z.string().min(1).optional(),
      // REGISTRE 1.1.0 (D-060) — titres des états `loading`/`error`. DONNÉES du
      // document, jamais texte moteur (F3) : sans titre déclaré, l'état n'est
      // pas rendu. Additif et optionnel — un document 1.0.0 est inchangé.
      loadingTitle: z.string().min(1).optional(),
      errorTitle: z.string().min(1).optional(),
      errorMessage: z.string().min(1).optional(),
      // TRI, FILTRE, PAGINATION (D-065) — `listFiltering: false` signifiait
      // qu'une liste rendait TOUJOURS tout, dans l'ordre du dataset. Unions
      // FERMÉES : aucune expression arbitraire n'entre dans un document.
      // IMAGE ET RECHERCHE (1.2.0, D-087) — additives, optionnelles. Sans
      // elles, la liste rend EXACTEMENT ce qu'elle rendait en 1.1.0.
      imageFieldId: fieldRef.optional(),
      // AVATAR A INITIALES (2026-10-17) — quand les lignes sont des PERSONNES.
      //
      // Mesure : chaque ligne de la liste des membres chez Bolt porte un rond
      // d initiales (AM, PE, JM). Deribfy ne montrait qu une VIGNETTE, et
      // seulement si le document declare `imageFieldId` : une liste de
      // personnes sans photo restait du texte nu.
      //
      // LE DOCUMENT LE DIT, LE MOTEUR NE LE DEVINE PAS. Deduire d une entite
      // qu elle designe des personnes serait la devinette de domaine que ce
      // depot interdit partout ailleurs (EP-201, F3) : un catalogue
      // afficherait « CB » pour « Collier baoule ».
      //
      // L IMAGE PRIME TOUJOURS : l avatar est le REPLI, jamais un
      // remplacement. Un booleen, donc, et pas un `fieldRef` — il ne designe
      // aucun champ, il dit « ces lignes sont des gens ».
      avatarInitiales: z.boolean().optional(),
      searchFieldId: fieldRef.optional(),
      searchPlaceholder: z.string().min(1).optional(),
      // ── COMMENT LA QUESTION EST LUE (registre 1.15.0).
      //
      // Mesuré au comptoir de SGD : la recherche cherchait la saisie ENTIÈRE
      // comme sous-chaîne, donc « filtre toyota » ne trouvait pas « filtre à
      // huile toyota » — les deux mots y sont, séparés par « à huile ».
      // L'employé voyait un écran vide, la pièce était en stock, et le client
      // attendait.
      //
      // ABSENT = `sous_chaine`, le comportement d'avant : aucune application
      // existante ne change de réponse. Une liste sans `searchFieldId` ne doit
      // pas porter ce mode — le validateur le refuse (BLOCK_PROPS_INVALID).
      searchMode: z.enum(["sous_chaine", "tous_les_mots"]).optional(),
      sortFieldId: fieldRef.optional(),
      sortDirection: z.enum(["asc", "desc"]).optional(),
      filterFieldId: fieldRef.optional(),
      filterOperator: z.enum(["eq", "neq", "contains"]).optional(),
      filterValue: z.string().min(1).optional(),
      pageSize: z.number().int().positive().max(200).optional(),
      // FILTRES PILOTÉS + PORTÉE RELATIONNELLE (E1/E2, D-129) — additifs et
      // optionnels : sans eux, la liste rend EXACTEMENT ce qu'elle rendait.
      // Tableaux PARALLÈLES (le flat config n'admet que des feuilles — le
      // contrat universel des props reste intouché, grammaire D-019 comprise).
      userFilterFieldIds: z.array(fieldRef).min(1).max(3).optional(),
      userFilterOperators: z.array(z.enum(["eq", "neq", "contains"])).max(3).optional(),
      userFilterInputTypes: z.array(z.enum(["text", "choice"])).max(3).optional(),
      scopeFieldId: fieldRef.optional(),
      // 1.6.0 (2026-09-09, jugé à l'écran sur la première app générée) : un
      // CATALOGUE se présente en CARTES sur deux colonnes — image dessus,
      // nom, prix — pas en lignes. Le document choisit ; défaut = lignes.
      // "row" (2026-09-10, mission composition) : RANGÉE HORIZONTALE de
      // cartes — la section d'un accueil-fleuve. Axe différent du défilement
      // d'écran : DET-006 (liste virtualisée non bornée) ne s'applique pas.
      layout: z.enum(["rows", "grid", "row"]).optional(),
      // 1.21.0 — libellé du lien d'en-tête ; le GESTE vient d'une action au
      // rôle "secondary" sur ce bloc. L'un sans l'autre = déclaration morte,
      // refusée par le validateur de campagne des contrôles fantômes.
      seeAllLabel: z.string().min(1).optional(),
    }).superRefine((v, ctx) => {
      const n = v.userFilterFieldIds?.length ?? 0;
      if ((v.userFilterOperators !== undefined || v.userFilterInputTypes !== undefined) && n === 0) {
        ctx.addIssue({ code: "custom", path: ["userFilterFieldIds"], message: "userFilterOperators/userFilterInputTypes exigent userFilterFieldIds" });
      }
      if (v.userFilterOperators !== undefined && v.userFilterOperators.length !== n) {
        ctx.addIssue({ code: "custom", path: ["userFilterOperators"], message: `longueur ${String(v.userFilterOperators.length)} ≠ userFilterFieldIds (${String(n)})` });
      }
      if (v.userFilterInputTypes !== undefined && v.userFilterInputTypes.length !== n) {
        ctx.addIssue({ code: "custom", path: ["userFilterInputTypes"], message: `longueur ${String(v.userFilterInputTypes.length)} ≠ userFilterFieldIds (${String(n)})` });
      }
      const total = n + (v.filterFieldId !== undefined ? 1 : 0);
      if (total > 3) {
        ctx.addIssue({ code: "custom", path: ["userFilterFieldIds"], message: `au plus 3 filtres au total (littéral compris), reçu ${String(total)}` });
      }
    }),
    // D-090 — QUATRE props manquaient ici, pas deux. `imageFieldId` et
    // `searchFieldId` (registre 1.2.0), mais aussi `sortFieldId` et
    // `filterFieldId` (D-065), omis depuis leur introduction : un tri ou un
    // filtre sur un champ inexistant passait la validation et devenait
    // silencieusement inopérant au rendu. Le cliquet d'exhaustivité les a
    // trouvés tous les quatre.
    fieldRefProps: [
      "titleFieldId",
      "subtitleFieldId",
      "trailingFieldId",
      "badgeFieldId",
      "imageFieldId",
      "searchFieldId",
      "sortFieldId",
      "filterFieldId",
      // E1/E2 (D-129) — la boucle de validation gère déjà les tableaux.
      "userFilterFieldIds",
      "scopeFieldId",
    ],
    fieldRefPropsAffichage: [
      "titleFieldId",
      "subtitleFieldId",
      "trailingFieldId",
      "badgeFieldId",
      "imageFieldId",
    ],
    fieldRefPropsFiltrage: [
      "searchFieldId",
      "sortFieldId",
      "filterFieldId",
      "userFilterFieldIds",
      "scopeFieldId",
    ],
    actionRefProps: [],
    states: LIST_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    // MISSION COMPOSITION (2026-09-10) — la recherche comme élément
    // STRUCTUREL : un contrôle à l'allure de champ qui NAVIGUE vers l'écran
    // où la recherche s'exécute. Sans lui, « recherche » n'existait qu'À
    // L'INTÉRIEUR d'une liste — l'accueil d'une app de référence ne pouvait
    // pas l'offrir.
    id: "search_entry",
    version: "1.0.0",
    description: "Entrée de recherche — navigue vers l'écran de recherche.",
    entity: "forbidden",
    propsSchema: z.strictObject({
      placeholder: z.string().min(1),
      actionId: actionRef,
      // RECHERCHE VISUELLE (mission chrome) — le DOCUMENT la nomme ; le
      // GESTE vient de l'action au rôle "secondary" du bloc. L'un sans
      // l'autre = déclaration morte, refusée par le gate de campagne.
      visualSearchLabel: z.string().min(1).optional(),
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: ["actionId"],
    states: SEARCH_ENTRY_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    // 1.8.0 — MISE EN PAGE. Le seul bloc SANS contenu : il occupe la place
    // restante pour que le reste descende. Mesuré sur l'accueil produit :
    // sans lui, 1170 px de vide sous le dernier bouton, tout collé en haut.
    id: "spacer",
    version: "1.0.0",
    description: "Espace extensible — pousse les blocs suivants vers le bas.",
    entity: "forbidden",
    propsSchema: z.strictObject({}),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: SPACER_BLOCK_STATES,
    porteAffordance: false,
  },
  {
    // 1.14.0 (EP-198) — TEXTE SUIVI. Le bloc qui manquait pour qu'une surface
    // légale dise autre chose que « le texte sera fourni ».
    //
    // MESURÉ AVANT LA MONTÉE : huit blocs au registre, et le plus long texte
    // qu'aucun pouvait porter était un sous-titre. Les écrans `terms` et
    // `privacy_policy` du run existaient et étaient atteignables sans compte —
    // ils annonçaient « le texte complet est fourni par le propriétaire ».
    // Le générateur ne refusait pas d'écrire : il n'avait aucun endroit où le
    // faire.
    //
    // LE CLIQUET D'EP-143 RESTE ENTIER. Il interdit au MOTEUR de rédiger un
    // texte juridique, et rien ici ne le lui fait faire : les paragraphes
    // viennent du document, le compilateur les met en page. C'est la doctrine
    // déjà inscrite au schéma — le document nomme, le moteur dessine.
    id: "prose",
    version: "1.0.0",
    description: "Texte suivi — paragraphes déclarés par le document.",
    entity: "forbidden",
    propsSchema: z.strictObject({
      // Le contrat des props n'admet que des feuilles : un tableau de chaînes
      // en est un, comme `userFilterFieldIds`.
      paragraphs: z.array(z.string().min(1)).min(1),
      title: z.string().min(1).optional(),
      // BROUILLON À FAIRE VALIDER : un texte juridique écrit par un
      // générateur ENGAGE le propriétaire s'il part tel quel. Le document le
      // déclare, le rendu l'annonce — personne ne publie sans l'avoir su.
      brouillon: z.boolean().optional(),
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: PROSE_BLOCK_STATES,
    porteAffordance: false,
  },
    {
    // GRAPHIQUE (2026-10-13) — la classe que DEUX cahiers des charges reels
    // reclamaient, chacun de son cote et sans rapport l'un avec l'autre :
    // « graphiques mensuels de consommation et de montants » (suivi de
    // compteurs), « volumes, taux de succes, couts, recettes, commissions,
    // marge » (plateforme de reservation). Aucun type de bloc ne savait le
    // dire, et le troisieme cahier l'aurait redemande.
    //
    // DES BARRES, PAS DES COURBES : une courbe aurait exige `react-native-svg`
    // dans chaque application generee, alors que les deux besoins s'expriment
    // en COMPARAISONS. Aucune dependance ajoutee.
    //
    // Le bloc ne porte AUCUN texte : etiquettes et valeurs affichees viennent
    // du document, deja formatees (F3). Il ne calcule que la proportion.
    id: "graphique",
    version: "1.0.0",
    description: "Graphique en barres — compare des valeurs nommees.",
    entity: "forbidden",
    // ── APLATI LE 2026-10-17, ET LE DEFAUT EST PROUVE.
    //
    // Ce bloc exigeait `series: [{label, value, display}]` — un tableau
    // d OBJETS. Or `flatConfigSchema` n admet qu une primitive ou un tableau
    // de PRIMITIVES ; son en-tete le justifie, et c est mesure : « la
    // platitude est une contrainte de l API de sorties structurees (≤ 24
    // parametres optionnels) ; un groupement s exprime par des cles pointees ».
    //
    // PREUVE, pas deduction : un document d essai portant un `graphique` sous
    // l ancienne forme est REFUSE par `migrateAirDocument`. Le bloc etait donc
    // INEMPLOYABLE depuis sa creation le 2026-10-13 — et c est pourquoi ZERO
    // document sur 23 ne le porte, alors qu il figure dans l allowlist FERMEE
    // transmise au generateur. Deux cahiers des charges reels le reclamaient.
    //
    // CE RETRAIT NE CASSE RIEN, et c est ce qui le rend legitime : aucun
    // document ne POUVAIT porter `series`, donc aucun ne regresse. Le contrat
    // du COMPOSANT est inchange — il recoit toujours des objets, que le
    // runtime assemble par leur rang.
    propsSchema: z.strictObject({
      title: z.string().min(1).optional(),
      "series.label": z.array(z.string().min(1)).min(1),
      "series.value": z.array(z.number()).min(1),
      // Le texte AFFICHE : unite, devise, arrondi. Le moteur n en fabrique
      // aucun — il ne saurait ni la devise ni la precision.
      "series.display": z.array(z.string().min(1)).min(1),
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: GRAPHIQUE_BLOCK_STATES,
    porteAffordance: false,
  },
  {
    // AGENT (2026-10-13) — ONZIEME bloc. Decision du proprietaire : chaque
    // utilisateur a un bouton pour reveiller l'agent ; qui veut s'en servir
    // l'active et lui parle, a la voix ou en ecrivant.
    //
    // Le bloc ne porte AUCUN texte du moteur : le libelle du bouton et
    // l'invite viennent du document. Il PORTE une affordance — c'est un geste,
    // pas un affichage.
    //
    // Ce que l'agent peut FAIRE n'est pas ici : c'est `agent.allowedOperations`
    // au document, une liste fermee d'operations d'API. Le bloc est la porte,
    // pas le pouvoir.
    id: "agent",
    version: "1.0.0",
    description: "Agent — un bouton qui le reveille, puis la parole ou l'ecrit.",
    entity: "forbidden",
    propsSchema: z.strictObject({
      label: z.string().min(1),
      placeholder: z.string().min(1),
      // ── LES DEUX LIBELLES DE L ACCORD (2026-10-13, cablage de l ecran).
      //
      // `agent.confirmBeforeAct` est tenu par le SERVEUR : il rend une
      // intention signee, et l acte l exige. L ecran, lui, doit DEMANDER cet
      // accord — et pour le demander il faut des mots.
      //
      // Le moteur n a pas la langue de la personne : « Confirmer » en
      // francais, en anglais ou en bambara n est pas la meme chaine, et un
      // bouton sans nom ne se clique pas. Ces deux libelles viennent donc du
      // document. OPTIONNELS : un agent qui ne demande aucun accord n en a
      // pas besoin, et les documents ecrits avant ne changent pas de sens.
      //
      // Les deux ENSEMBLE ou aucun : offrir « confirmer » sans « annuler »
      // laisserait une personne devant un seul bouton, qui se clique par
      // reflexe. Le validateur le refuse.
      confirmLabel: z.string().min(1).optional(),
      cancelLabel: z.string().min(1).optional(),
      // ── L AGENT DISAIT UN CODE A L UTILISATEUR (defaut 2026-10-17).
      //
      // Mesure : en cas d echec, `AirAgent` passait le CODE du serveur comme
      // message — `AIR_AGENT_SANS_CERVEAU`, `AIR_AGENT_REPONSE_ILLISIBLE`.
      // Une personne qui demande quelque chose a son application lisait donc
      // un identifiant de diagnostic. Sur LES DEUX CIBLES : le runtime de
      // l agent est partage.
      //
      // Le bloc n avait AUCUN moyen de declarer une phrase, alors que `list`,
      // `form` et `detail_header` l ont depuis le registre 1.1.0 (D-060). La
      // meme montee, au meme patron : DONNEES du document, jamais texte
      // moteur (F3). Sans phrase declaree, le message n est PAS rendu — l etat
      // d erreur reste visible (la personne sait que ca a echoue), et le code
      // ne traverse plus l ecran.
      errorMessage: z.string().min(1).optional(),
    }).refine(
      (p) => (p.confirmLabel === undefined) === (p.cancelLabel === undefined),
      {
        // UN SEUL BOUTON SE CLIQUE PAR REFLEXE. Offrir « confirmer » sans
        // « annuler » met une personne devant une issue unique devant un
        // geste qui ne s annule pas. Les deux, ou aucun.
        message:
          "confirmLabel et cancelLabel vont ensemble : un accord sans refus possible n est pas un accord",
        path: ["confirmLabel"],
      },
    ),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: AGENT_BLOCK_STATES,
    porteAffordance: true,
  },
  {
    // STATISTIQUES (2026-10-17) — LE CHIFFRE QUI OUVRE UN TABLEAU DE BORD.
    //
    // MESURE QUI COMMANDE CE BLOC : comparaison détail par détail avec Bolt,
    // demandée par le propriétaire. Son tableau de bord de tontine ouvre sur
    // QUATRE cartes — solde, cotisations collectées, membres actifs,
    // prochaine échéance. Deribfy ne savait dessiner que SEPT formes, et
    // aucune n'était celle-là : avec le plus beau thème du monde, une liste
    // de lignes de texte ne ressemblera jamais à un tableau de bord.
    //
    // AUCUN FORMATAGE (F3) : `valeur` arrive déjà écrite — « 265 000 FCFA »,
    // « 27 déc. ». Le moteur ne saurait ni la devise, ni la précision, ni la
    // langue. Même contrat que `graphique`, pour la même raison.
    //
    // QUATRE AU PLUS : au-delà, la grille d'un téléphone casse. Ce n'est pas
    // une préférence — c'est la largeur de l'écran.
    //
    // LE TON EST SÉMANTIQUE : `positif`/`negatif` disent ce que le chiffre
    // SIGNIFIE, et se résolvent sur les jetons `success`/`error` qui
    // existaient dans les 44 tokens sans que RIEN ne les emploie.
    id: "statistiques",
    version: "1.0.0",
    description:
      "Cartes de chiffres clés — un libellé, une valeur déjà formatée, une légende.",
    entity: "forbidden",
    // ── DES TABLEAUX PARALLÈLES, ET CE N'EST PAS UN GOÛT.
    //
    // CAUSE RACINE TROUVÉE LE 2026-10-17 : `flatConfigSchema` n'admet qu'une
    // primitive ou un TABLEAU DE PRIMITIVES — jamais un objet. Son en-tête
    // dit pourquoi, et c'est mesuré : « la platitude est une contrainte de
    // l'API de sorties structurées (≤ 24 paramètres optionnels par schéma) ;
    // un groupement s'exprime par des clés pointées ».
    //
    // CONSÉQUENCE QUE PERSONNE N'AVAIT VUE : le bloc `graphique` exige
    // `series: [{label, value, display}]` — un tableau d'OBJETS. C'est
    // INEXPRIMABLE dans un document. Voilà pourquoi ZÉRO document sur 23 ne
    // l'emploie : non pas que le générateur l'ignore (il est dans l'allowlist
    // fermée qu'on lui transmet), mais qu'il ne PEUT PAS l'écrire.
    //
    // Ce bloc-ci suit donc l'idiome prescrit : des tableaux parallèles, un
    // par colonne, liés par leur rang. Le runtime les rassemble.
    propsSchema: z.strictObject({
      title: z.string().min(1).optional(),
      "items.label": z.array(z.string().min(1)).min(1).max(4),
      "items.valeur": z.array(z.string().min(1)).min(1).max(4),
      "items.legende": z.array(z.string()).max(4).optional(),
      "items.ton": z
        .array(z.enum(["neutre", "positif", "negatif", "attention"]))
        .max(4)
        .optional(),
    }),
    fieldRefProps: [],
    fieldRefPropsAffichage: [],
    fieldRefPropsFiltrage: [],
    actionRefProps: [],
    states: STATISTIQUES_BLOCK_STATES,
    porteAffordance: false,
  },
];

/**
 * D-104 — SOURCE UNIQUE DES AFFORDANCES. Le validateur et `controls()` la
 * lisent tous deux, au lieu de recopier chacun sa liste. C'est l'architecture
 * qui avait produit D-095 et D-101 ; elle ne se répète pas ici.
 */
export const BLOCS_AFFORDANTS: ReadonlySet<string> = new Set(
  BLOCKS.filter((b) => b.porteAffordance).map((b) => b.id),
);
