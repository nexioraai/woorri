// PLAN DE COMPOSITION — LA CHAÎNE DE DÉCISION EXPLICITE (engine hardening,
// 2026-09-11).
//
// AVANT : les décisions d'assemblage vivaient éparpillées — `hasList` à
// l'émission, `modeListe` au runtime, rien de consultable ni de validable
// AVANT d'émettre. Ce module dérive du document, PUREMENT, le plan complet :
// rôle structurel de chaque écran, mode de chaque section, tailles d'aperçu,
// exigences de suite (« Voir plus »), provision requise. L'émission le
// CONSOMME ; les gates le VALIDENT ; une génération payante ne part que si
// le plan répond OUI à « cette application est-elle correctement planifiée ».
//
// AUCUN archétype nommé ici : les rôles sont STRUCTURELS (porte, fenêtre,
// fleuve, fiche, formulaire) — un fil social et un catalogue partagent le
// rôle « fenêtre » parce que c'est la MÊME décision d'assemblage.
import type { ProjectAir } from "@deribfy/air-schema";
import { modeListe, tailleApercu, type ModeListe } from "../runtime/list-pipeline.ts";

export type ZoneEcran = "chrome" | "contenu";

/**
 * ÉTAPE ③ (2026-09-11) — LE CONTRAT CAPACITÉ → RÔLE → PLACE, écrit en table
 * et plus en conditions éparses. La chaîne complète, couche par couche :
 *
 *   CAPABILITY  — le GÉNÉRATEUR déclare (document : capabilities, blocs,
 *                 navigation) ; rien n'apparaît sans déclaration ;
 *   ROLE        — le PLANNER décide ici : rôle structurel de l'écran
 *                 (porte|fenetre|fleuve|fiche|formulaire|page) et zone de
 *                 chaque section (table ci-dessous) ;
 *   PLACEMENT   — l'ÉMETTEUR exécute le plan : zone chrome → AppShell.chrome,
 *                 zone contenu → conteneur défilant, navigation → AppShell ;
 *   COMPONENT   — le REGISTRE résout (WRAPPER_BY_BLOCK_TYPE → blocs gelés) ;
 *   PROPS/STATE — transportés par screens/*.data.ts (composition comprise) ;
 *   ACTIONS     — uiActionsByBlock/uiSecondaryActionsByBlock, dispatcher.
 *
 * Aucune couche ne réinvente la décision d'une couche amont : le cliquet
 * contrat-capacite-role.test vérifie la table contre le registre des blocs.
 */
export const ZONE_PAR_BLOCK_TYPE: Readonly<Record<string, ZoneEcran>> = {
  header: "contenu",
  list: "contenu",
  detail_header: "contenu",
  form: "contenu",
  button: "contenu",
  empty_state: "contenu",
  // La recherche appartient au VIEWPORT, pas au flux (mission chrome).
  search_entry: "chrome",
  spacer: "contenu",
};

export interface SectionPlan {
  blockId: string;
  blockType: string;
  /**
   * CHROME PERSISTANT (mission chrome, 2026-09-11) — la référence l'exige :
   * la recherche appartient au VIEWPORT de l'écran, pas à son flux. Un
   * `search_entry` est du chrome ; tout le reste défile. La navigation
   * basse est déjà persistante par construction (hors conteneur, D-086).
   */
  zone: ZoneEcran;
  mode?: ModeListe;
  /** Éléments montrés quand la section est un aperçu. */
  apercu?: number;
  /** Ce que le DATASET peut servir — pour juger si une suite s'impose. */
  lignesDisponibles?: number;
  voirPlus: boolean;
  titre: boolean;
}

export type RoleEcran =
  | "porte" // entrée sans barre : onboarding, accès
  | "fenetre" // une liste unique EST l'écran : catalogue, fil, historique
  | "fleuve" // sections hétérogènes qui coulent : accueil composé
  | "fiche" // detail_header : l'objet
  | "formulaire" // form dominant : saisie
  | "page"; // le reste : contenu statique/actions

export interface EcranPlan {
  screenId: string;
  role: RoleEcran;
  defile: boolean;
  sections: SectionPlan[];
}

export interface CompositionPlan {
  ecrans: EcranPlan[];
  /** Domaines distants que le PIPELINE doit provisionner avant tout build. */
  provisionRequise: string[];
}

const prop = (
  b: { props?: readonly { key: string; value: unknown }[] },
  k: string,
): unknown => (b.props ?? []).find((p) => p.key === k)?.value;

export function planifierComposition(air: ProjectAir): CompositionPlan {
  const lignesParEntite = new Map<string, number>();
  for (const d of air.datasets) {
    lignesParEntite.set(d.entityId, (lignesParEntite.get(d.entityId) ?? 0) + d.rowCount);
  }
  const secondaires = new Set(
    air.actions
      .filter((a) => a.trigger.kind === "ui" && a.trigger.role === "secondary")
      .map((a) => (a.trigger.kind === "ui" ? a.trigger.blockId : "")),
  );
  const ecrans = air.screens.map((s): EcranPlan => {
    const listes = s.blocks.filter((b) => b.blockType === "list");
    const nbListes = listes.length;
    const sections = s.blocks.map((b): SectionPlan => {
      const est = b.blockType === "list";
      const layout = est ? (prop(b, "layout") as string | undefined) : undefined;
      const mode = est ? modeListe(layout, nbListes) : undefined;
      return {
        blockId: b.id,
        blockType: b.blockType,
        zone: ZONE_PAR_BLOCK_TYPE[b.blockType] ?? "contenu",
        ...(mode === undefined ? {} : { mode }),
        ...(mode === "apercu"
          ? { apercu: tailleApercu(layout, prop(b, "pageSize") as number | undefined) }
          : {}),
        ...(est && b.entityId !== undefined
          ? { lignesDisponibles: lignesParEntite.get(b.entityId) ?? 0 }
          : {}),
        voirPlus: typeof prop(b, "seeAllLabel") === "string" && secondaires.has(b.id),
        titre: typeof prop(b, "title") === "string",
      };
    });
    const verticales = sections.filter((x) => x.mode === "fenetre" || x.mode === "apercu");
    const role: RoleEcran =
      s.showsPrimaryNav === false && s.id === air.navigation.entryScreenId
        ? "porte"
        : s.blocks.some((b) => b.blockType === "detail_header")
          ? "fiche"
          : nbListes === 1 && verticales.some((x) => x.mode === "fenetre")
            ? "fenetre"
            : nbListes >= 2
              ? "fleuve"
              : s.blocks.some((b) => b.blockType === "form")
                ? "formulaire"
                : "page";
    // Un écran DÉFILE sauf quand sa liste unique est la fenêtre (elle est le
    // défileur) — MÊME décision que l'émission, désormais écrite UNE fois.
    const defile = !(nbListes === 1 && verticales.some((x) => x.mode === "fenetre"));
    return { screenId: s.id, role, defile, sections };
  });
  const provisionRequise = [
    ...new Set(
      air.datasets.flatMap((d) =>
        d.sourceKind === "remote" && typeof d.sourceDomain === "string" ? [d.sourceDomain] : [],
      ),
    ),
  ].sort();
  return { ecrans, provisionRequise };
}

export interface DiagnosticPlan {
  code: "PLAN_APERCU_SANS_SUITE" | "PLAN_VITRINE_VIDE" | "PLAN_CHROME_DUPLIQUE";
  path: string;
  message: string;
  /**
   * ÉTAPE ④ (2026-09-11) — la sévérité appartient au DIAGNOSTIC, jamais à
   * l'appelant (aucun drapeau de contournement possible) :
   *   `bloquant` — incohérence structurelle : l'ÉMISSION refuse ;
   *   `qualite`  — indigne d'une génération payante : la CAMPAGNE refuse,
   *                mais un document historique gelé reste émissible.
   * Mesuré sur le corpus réel : PLAN_APERCU_SANS_SUITE touche 21 documents
   * dont dougplace (antérieurs à seeAllLabel 1.21) — bloquer l'émission
   * aurait cassé des références gelées ; PLAN_CHROME_DUPLIQUE n'en touche
   * aucun et décrit deux promesses persistantes empilées : bloquant.
   */
  severite: "bloquant" | "qualite";
}

/**
 * VALIDATION DU BLUEPRINT — répond localement, AVANT toute émission :
 * « cette application est-elle correctement planifiée ? ».
 *
 * ① Un APERÇU qui tronque (moins d'éléments montrés que disponibles) doit
 *   offrir sa suite — « Voir plus » câblé (libellé + geste secondaire).
 * ② Une section de contenu dont le dataset est VIDE au plan n'a rien à
 *   montrer à la première ouverture : vitrine morte, refusée.
 */
export function validerPlan(plan: CompositionPlan): DiagnosticPlan[] {
  const out: DiagnosticPlan[] = [];
  for (const e of plan.ecrans) {
    // ③ UN chrome de recherche par écran — deux barres persistantes sont
    // deux promesses identiques empilées.
    const chromes = e.sections.filter((s) => s.zone === "chrome");
    if (chromes.length > 1) {
      out.push({
        code: "PLAN_CHROME_DUPLIQUE",
        severite: "bloquant",
        path: e.screenId,
        message: `${String(chromes.length)} éléments de chrome persistant sur un même écran`,
      });
    }
    for (const s of e.sections) {
      if (
        s.mode === "apercu" &&
        s.apercu !== undefined &&
        s.lignesDisponibles !== undefined &&
        s.lignesDisponibles > s.apercu &&
        !s.voirPlus
      ) {
        out.push({
          code: "PLAN_APERCU_SANS_SUITE",
          severite: "qualite",
          path: `${e.screenId}.${s.blockId}`,
          message: `aperçu de ${String(s.apercu)} sur ${String(s.lignesDisponibles)} disponibles sans « Voir plus » câblé`,
        });
      }
      if (
        (s.mode === "apercu" || s.mode === "rangee" || s.mode === "fenetre") &&
        s.lignesDisponibles === 0
      ) {
        out.push({
          code: "PLAN_VITRINE_VIDE",
          severite: "qualite",
          path: `${e.screenId}.${s.blockId}`,
          message: `la section "${s.blockId}" n'a AUCUNE ligne à montrer à la première ouverture`,
        });
      }
    }
  }
  return out;
}
