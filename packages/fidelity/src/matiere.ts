// PREUVE DE MATIÈRE — un document qui VEND doit montrer sa marchandise.
//
// ÉCHEC MESURÉ (dougplace, 2026-09-10, 6,81 $) : une marketplace émise avec
// UNE SEULE entité — le profil — et 15 écrans creux autour. « Catalogue »
// listait des PROFILS D'UTILISATEURS en guise de produits, et chaque besoin
// de l'intention se déclarait « satisfait » en pointant ces blocs
// vivants-mais-faux : les validateurs voyaient des blocs rendus, ils ne
// jugeaient pas QUEL objet ils rendaient.
//
// Une règle de prompt ne suffit pas : le modèle a déjà ignoré des règles.
// Ce verrou est MÉCANIQUE et fail-closed : quoi que le modèle écrive, un
// document de commerce sans matière est REFUSÉ à la campagne.
//
// COUCHE : acceptation de GÉNÉRATION uniquement — jamais `validateAir`. Le
// corpus gelé v2 précède cette exigence ; le re-juger serait l'erreur
// d'étage déjà commise une fois (D-105) et défaite.
import type { ProjectAir } from "@deribfy/air-schema";

export interface DiagnosticMatiere {
  code: "CAMPAGNE_MATIERE_INSUFFISANTE";
  path: string;
  message: string;
}

/**
 * Un document dont `commerceClass` n'est pas "none" VEND quelque chose. Il
 * doit alors posséder au moins UNE entité de marchandise :
 *   · distincte du profil d'authentification (profileEntityId) ;
 *   · alimentée (un dataset à rowCount > 0) ;
 *   · AFFICHÉE (un bloc list ou detail_header la rend).
 * Sans elle, l'app promet un commerce et ne montre rien à vendre.
 */
export interface DiagnosticComposition {
  code:
    | "CAMPAGNE_SECTION_SANS_TITRE"
    | "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE"
    | "CAMPAGNE_ETATS_REMOTE_MANQUANTS";
  path: string;
  message: string;
}

/**
 * TROIS PRINCIPES DE COMPOSITION — mécaniques, aveugles au domaine.
 * (Mission composition II, 2026-09-10. L'ancien verrou « accueil
 * fractionné » est retiré : le moteur rend désormais toute liste d'un écran
 * composé en APERÇU BORNÉ — le couloir est devenu IRREPRÉSENTABLE, un verrou
 * qui interdit l'impossible ne verrouille rien.)
 *
 * ① UNE SECTION SE NOMME — une liste qui cohabite avec d'autres blocs porte
 *   un `title` : une section sans rôle annoncé est un bloc posé là.
 * ② LA RECHERCHE S'OFFRE À L'ENTRÉE — si un écran EXÉCUTE une recherche
 *   (searchFieldId) et que la première destination principale est un AUTRE
 *   écran, celle-ci doit l'OFFRIR (search_entry). Marketplace, réservation,
 *   éducation : même principe partout où la recherche existe.
 * ③ LE DISTANT DÉCLARE SES ÉTATS — une liste branchée sur un dataset
 *   `remote` porte loadingTitle ET errorTitle : le réseau échoue, l'écran
 *   doit savoir le dire.
 */
export interface DiagnosticImages {
  code: "CAMPAGNE_IMAGES_DEMO_MANQUANTES";
  path: string;
  message: string;
}

/** EP-188 ③ — un champ numérique REQUIS sans valeurs de démonstration. */
export interface DiagnosticNombres {
  code: "CAMPAGNE_NOMBRES_DEMO_MANQUANTS";
  path: string;
  message: string;
}

/**
 * ④ UNE VITRINE MONTRE DE VRAIES IMAGES — un champ `asset` RÉFÉRENCÉ par un
 * `imageFieldId` (liste ou fiche) doit porter des `demoValues` (URLs) : la
 * première ouverture d'une app générée est sa démonstration. MESURÉ : la
 * même intention a produit une génération AVEC (v1) puis SANS (v2) — la
 * prose ne suffit pas, le verrou décide.
 */
/**
 * EP-188 ③ — UN NOMBRE SANS VALEURS DE DÉMONSTRATION EST TIRÉ AU HASARD.
 *
 * MESURÉ sur le run EP-186 : un bureau de 907 pièces pour 933 m², un terrain
 * à 628 FCFA. Le compilateur tire 1 à 999 pour TOUT champ numérique — il ne
 * peut pas faire mieux : le contrat ne porte AUCUNE borne (`min`/`max`
 * n'existent pas au schéma), et une surface, un nombre de pièces et un prix
 * n'ont aucune échelle commune.
 *
 * L'ÉCHAPPEMENT EXISTE : `demoValues` est servi tel quel, pour les nombres
 * comme pour les images. Ce juge exige qu'il soit posé — même patron que
 * `imagesDeVitrine`, qui exige déjà des URLs réelles.
 *
 * PORTÉE : les champs REQUIS seulement. Un champ facultatif peut rester vide
 * dans une démonstration, et exiger des valeurs pour ce que l'utilisateur ne
 * verra pas serait du zèle.
 */
export function nombresVraisemblables(air: ProjectAir): DiagnosticNombres[] {
  const out: DiagnosticNombres[] = [];
  air.entities.forEach((e, i) => {
    e.fields.forEach((f, j) => {
      if (f.type !== "number" && f.type !== "decimal") return;
      if (f.required !== true) return;
      if (f.demoValues !== undefined && f.demoValues.length > 0) return;
      out.push({
        code: "CAMPAGNE_NOMBRES_DEMO_MANQUANTS",
        path: `entities[${String(i)}].fields[${String(j)}]`,
        message:
          `le champ « ${f.id} » mesure quelque chose et ne porte aucune ` +
          `\`demoValues\` : le moteur tirera un entier entre 1 et 999, sans ` +
          `rapport avec ce qu'il mesure. C'est ainsi qu'un logement obtient ` +
          `907 pièces. POSE 6 à 12 valeurs plausibles, cohérentes avec les ` +
          `autres champs du même objet.`,
      });
    });
  });
  return out;
}

/**
 * EP-201 E — LE CATALOGUE N'EST PAS UN ÉCHANTILLON.
 *
 * DEMANDE DE YOUSSOUF : plancher de 35 produits dès la génération, et aucune
 * limite haute — « le marchand peut en ajouter autant qu'il souhaite ».
 *
 * CE QUE LE PLANCHER GARDE. Mesuré à l'écran : une boutique livrée avec six
 * articles ne se juge pas, ne se fait pas défiler, et ne montre NI la
 * recherche NI les filtres à l'œuvre — elle a l'air d'une maquette, et le
 * propriétaire ne peut rien décider en la voyant.
 *
 * COMMENT LE MOTEUR RECONNAÎT UN CATALOGUE SANS CONNAÎTRE AUCUN SECTEUR : une
 * entité est une vitrine quand un bloc `list` la porte ET qu'elle déclare une
 * image. Aucun nom de domaine n'entre ici — ni produit, ni plat, ni bien. Une
 * entité sans image (un historique, un journal, des réglages) n'a aucune
 * raison de porter trente-cinq lignes, et le juge ne la vise pas.
 */
const PLANCHER_CATALOGUE = 35;

export interface DiagnosticCatalogue {
  code: string;
  path: string;
  message: string;
}

export function catalogueFourni(air: ProjectAir): DiagnosticCatalogue[] {
  const out: DiagnosticCatalogue[] = [];
  const enListe = new Set<string>();
  for (const ecran of air.screens ?? []) {
    for (const bloc of ecran.blocks ?? []) {
      if (bloc.blockType === "list" && typeof bloc.entityId === "string") {
        enListe.add(bloc.entityId);
      }
    }
  }
  air.entities.forEach((e, i) => {
    if (!enListe.has(e.id)) return;
    if (!e.fields.some((f) => f.type === "asset")) return;
    const compte = Math.max(0, ...e.fields.map((f) => (f.demoValues ?? []).length));
    if (compte >= PLANCHER_CATALOGUE) return;
    out.push({
      code: "CAMPAGNE_CATALOGUE_TROP_MAIGRE",
      path: `entities[${String(i)}]`,
      message:
        `« ${e.id} » est présentée en liste avec des images, et ne porte que ` +
        `${String(compte)} valeur(s) de démonstration pour ${String(PLANCHER_CATALOGUE)} ` +
        `attendues au minimum. Une vitrine à ${String(compte)} entrées ne se fait ` +
        `pas défiler et ne montre ni la recherche ni les filtres à l'œuvre : ` +
        `elle a l'air d'une maquette. Aucune limite HAUTE — davantage est ` +
        `toujours mieux. (DÉCISION PRODUIT.)`,
    });
  });
  return out;
}

/**
 * EP-201 F — UN PRIX EST UN NOMBRE, LA DEVISE EST DÉCLARÉE À PART.
 *
 * FAIT MESURÉ AVANT `app.currency` (AIR 1.27.0) : l'AIR ne portait AUCUNE
 * devise, et le générateur écrivait donc la monnaie DANS les valeurs — « 45
 * 000 FCFA » ici, « 45000 » là, sans qu'aucune règle ne les accorde.
 *
 * DEUX DÉFAUTS EN UN. Le premier est de forme : une valeur qui mêle un nombre
 * et un mot n'est plus un nombre — elle ne se trie pas, ne se compare pas, ne
 * se reformate pas. Le second est de langue : « FCFA » varie selon la région,
 * et figé dans une donnée il part tel quel dans toutes les traductions. Le
 * document porte le CODE (ISO 4217), le moteur dessine le reste.
 *
 * LE JUGE VISE LA CLASSE, PAS UNE LISTE DE MONNAIES : il refuse toute valeur
 * numérique qui porte des caractères non numériques. Nommer les monnaies
 * ferait entrer une connaissance régionale dans le moteur.
 */
export interface DiagnosticDevise {
  code: string;
  path: string;
  message: string;
}

export function deviseCoherente(air: ProjectAir): DiagnosticDevise[] {
  const out: DiagnosticDevise[] = [];
  const purementNumerique = /^[\d\s., -]+$/u;
  air.entities.forEach((e, i) => {
    e.fields.forEach((f, j) => {
      if (f.type !== "number" && f.type !== "decimal") return;
      for (const v of f.demoValues ?? []) {
        const texte = String(v).trim();
        if (texte === "" || purementNumerique.test(texte)) continue;
        out.push({
          code: "CAMPAGNE_MONNAIE_DANS_LA_VALEUR",
          path: `entities[${String(i)}].fields[${String(j)}]`,
          message:
            `la valeur « ${texte} » de « ${f.id} » mêle un nombre et du texte. ` +
            `Un prix est un NOMBRE ; la monnaie se déclare UNE fois dans ` +
            `\`app.currency\` (code ISO 4217) et vaut pour tout le catalogue. ` +
            `Un mot de monnaie figé dans une donnée ne se reformate pas et ` +
            `part tel quel dans toutes les langues. (DÉCISION PRODUIT.)`,
        });
        break;
      }
    });
  });
  return out;
}

export function imagesDeVitrine(air: ProjectAir): DiagnosticImages[] {
  const referencés = new Set<string>();
  for (const s of air.screens)
    for (const b of s.blocks) {
      const v = (b.props ?? []).find((p) => p.key === "imageFieldId")?.value;
      if (typeof v === "string") referencés.add(v);
    }
  const out: DiagnosticImages[] = [];
  air.entities.forEach((e, i) => {
    e.fields.forEach((f, j) => {
      if (f.type === "asset" && referencés.has(f.id) && f.demoValues === undefined) {
        out.push({
          code: "CAMPAGNE_IMAGES_DEMO_MANQUANTES",
          path: `entities[${String(i)}].fields[${String(j)}]`,
          message: `champ image "${f.id}" affiché par un bloc sans demoValues (URLs réelles)`,
        });
      }
    });
  });
  return out;
}

export interface DiagnosticRecherche {
  code: "CAMPAGNE_RECHERCHE_VISUELLE_INCOMPLETE";
  path: string;
  message: string;
}

/**
 * ⑤ LA RECHERCHE VISUELLE EST UNE PAIRE — le libellé (document) ET le geste
 * (action au rôle secondaire). L'un sans l'autre : une caméra morte à
 * l'écran, ou un geste que rien n'annonce. Indépendant du nom de l'app.
 */
export function rechercheVisuelleComplete(air: ProjectAir): DiagnosticRecherche[] {
  const secondaires = new Set(
    air.actions
      .filter((a) => a.trigger.kind === "ui" && a.trigger.role === "secondary")
      .map((a) => (a.trigger.kind === "ui" ? a.trigger.blockId : "")),
  );
  const out: DiagnosticRecherche[] = [];
  air.screens.forEach((s, i) =>{
    s.blocks.forEach((b, j) => {
      if (b.blockType !== "search_entry") return;
      const label = (b.props ?? []).find((p) => p.key === "visualSearchLabel");
      const geste = secondaires.has(b.id);
      if ((label !== undefined) !== geste) {
        out.push({
          code: "CAMPAGNE_RECHERCHE_VISUELLE_INCOMPLETE",
          path: `screens[${String(i)}].blocks[${String(j)}]`,
          message:
            label !== undefined
              ? `"${b.id}" : libellé de recherche visuelle sans geste secondaire`
              : `"${b.id}" : geste secondaire sans libellé de recherche visuelle`,
        });
      }
    });
  });
  return out;
}

export function principesDeComposition(air: ProjectAir): DiagnosticComposition[] {
  const out: DiagnosticComposition[] = [];
  const prop = (b: { props?: readonly { key: string; value: unknown }[] }, k: string) =>
    (b.props ?? []).find((p) => p.key === k)?.value;

  // ① sections nommées
  air.screens.forEach((s, i) => {
    if (s.blocks.length < 2) return;
    s.blocks.forEach((b, j) => {
      if (b.blockType === "list" && typeof prop(b, "title") !== "string") {
        out.push({
          code: "CAMPAGNE_SECTION_SANS_TITRE",
          path: `screens[${String(i)}].blocks[${String(j)}]`,
          message: `écran "${s.id}" : la liste "${b.id}" cohabite avec d'autres blocs sans titre de section`,
        });
      }
    });
  });

  // ② recherche structurelle
  const ecransRecherche = new Set(
    air.screens
      .filter((s) => s.blocks.some((b) => b.blockType === "list" && prop(b, "searchFieldId") !== undefined))
      .map((s) => s.id),
  );
  const premiere = air.navigation.primary?.destinations
    .slice()
    .sort((a, b) => a.order - b.order)[0];
  const routePremiere = air.navigation.routes.find((r) => r.id === premiere?.routeId);
  const accueil = air.screens.find((s) => s.id === routePremiere?.screenId);
  if (
    accueil !== undefined &&
    ecransRecherche.size > 0 &&
    !ecransRecherche.has(accueil.id) &&
    !accueil.blocks.some((b) => b.blockType === "search_entry")
  ) {
    out.push({
      code: "CAMPAGNE_RECHERCHE_NON_STRUCTURELLE",
      path: `screens[${air.screens.indexOf(accueil)}]`,
      message:
        `l'app exécute une recherche (${[...ecransRecherche].join(", ")}) mais l'accueil ` +
        `"${accueil.id}" ne l'OFFRE pas (aucun search_entry)`,
    });
  }

  // ③ états du distant
  const remotes = new Set(
    air.datasets.filter((d) => d.sourceKind === "remote").map((d) => d.entityId),
  );
  air.screens.forEach((s, i) => {
    s.blocks.forEach((b, j) => {
      if (
        b.blockType === "list" &&
        b.entityId !== undefined &&
        remotes.has(b.entityId) &&
        (prop(b, "loadingTitle") === undefined || prop(b, "errorTitle") === undefined)
      ) {
        out.push({
          code: "CAMPAGNE_ETATS_REMOTE_MANQUANTS",
          path: `screens[${String(i)}].blocks[${String(j)}]`,
          message: `liste "${b.id}" sur source distante sans loadingTitle/errorTitle`,
        });
      }
    });
  });
  return out;
}

export function preuveDeMatiere(air: ProjectAir): DiagnosticMatiere[] {
  if (air.compliance.commerceClass === "none") return [];
  const profils = new Set(
    air.integrations
      .filter((i) => i.capability === "auth")
      .flatMap((i) => (i.config ?? []))
      .filter((c) => c.key === "profileEntityId" && typeof c.value === "string")
      .map((c) => c.value as string),
  );
  const alimentees = new Set(
    air.datasets.filter((d) => d.rowCount > 0).map((d) => d.entityId),
  );
  const affichees = new Set(
    air.screens.flatMap((s) =>
      s.blocks
        .filter((b) => b.blockType === "list" || b.blockType === "detail_header")
        .flatMap((b) => (b.entityId === undefined ? [] : [b.entityId])),
    ),
  );
  const marchandises = air.entities.filter(
    (e) => !profils.has(e.id) && alimentees.has(e.id) && affichees.has(e.id),
  );
  if (marchandises.length > 0) return [];
  return [
    {
      code: "CAMPAGNE_MATIERE_INSUFFISANTE",
      path: "entities",
      message:
        `commerceClass "${air.compliance.commerceClass}" sans marchandise : aucune entité ` +
        "hors profil qui soit à la fois alimentée (dataset > 0) et affichée (list/detail_header). " +
        "Un document de commerce doit montrer ce qu'il vend.",
    },
  ];
}
