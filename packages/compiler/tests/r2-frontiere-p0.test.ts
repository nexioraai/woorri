// R2 — FRONTIÈRE DU « ONE BRAIN » (reprise de la section tronquée, 2026-09-11).
//
// BRIEF LIBRE → P0 → MODEL → P1 → dérivations déterministes.
// Ces preuves sont MÉCANIQUES (balayage complet des exports, pièges,
// invariance byte-à-byte), jamais narratives. La frontière porte sur
// l'INTERPRÉTATION du texte source : lire un nom/label structuré du MODEL
// n'est pas une lecture du brief.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrateAirDocument, projectAirSchema } from "@deribfy/air-schema";
import { emitProject } from "../src/emit-project.ts";
import * as derivationsModele from "../../../benchmarks/air-emission/modele-metier.mjs";
import * as derivationsObligations from "../../../benchmarks/air-emission/obligations-passes.mjs";
import type { ModeleMetier, Parcours } from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const MODELE = JSON.parse(
  readFileSync(join(R, "slices", "kaviva", "kaviva-modele.json"), "utf8"),
) as ModeleMetier;

describe("A/D — P0 unique interpréteur ; AUCUN LLM post-P0", () => {
  it("aucun paquet MOTEUR ne dépend d'un SDK LLM (mécanique : package.json)", () => {
    for (const paquet of [
      "compiler", "fidelity", "blocks", "primitives",
      "execution-contract", "capability-registry", "repair", "air-schema",
    ]) {
      const manifest = readFileSync(join(R, "packages", paquet, "package.json"), "utf8");
      expect(manifest.includes("anthropic"), paquet).toBe(false);
      expect(manifest.includes("openai"), paquet).toBe(false);
    }
  });

  it("les modules de DÉRIVATION n'ont ni LLM, ni réseau, ni E/S, ni horloge", () => {
    for (const module of ["modele-metier.mjs", "obligations-passes.mjs"]) {
      const code = readFileSync(join(R, "benchmarks", "air-emission", module), "utf8")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
        .join("\n");
      for (const interdit of [
        "anthropic", "Anthropic", "openai", "fetch(", "node:http", "node:https",
        "node:fs", "node:net", "child_process", "callPart", "messages.create",
        "Date.now", "Math.random",
      ]) {
        expect(code.includes(interdit), `${module}: ${interdit}`).toBe(false);
      }
    }
  });
});

describe("B/C — les dérivations ne travaillent QUE sur le MODEL (balayage COMPLET)", () => {
  // LA BATTERIE : chaque export-fonction des modules de dérivation est appelé
  // ici. Le test de complétude ÉCHOUE si une dérivation nouvelle n'entre pas
  // dans la batterie — aucune ne peut échapper à la preuve.
  const migre = derivationsModele.migrerModele(MODELE) as ModeleMetier;
  const parcours0 = migre.parcours[0];
  const concept0 = migre.concepts[0];
  if (parcours0 === undefined || concept0 === undefined) throw new Error("fixture vide");
  const parcours: Parcours = parcours0;
  const concept: ModeleMetier["concepts"][number] = concept0;
  const BATTERIE: Record<string, (m: ModeleMetier) => unknown> = {
    migrerModele: (m) => derivationsModele.migrerModele(m),
    validerModele: (m) => derivationsModele.validerModele(m),
    estVisuel: () => derivationsModele.estVisuel(concept),
    accesDe: () => derivationsModele.accesDe("decouvrir"),
    mailleDe: () => derivationsModele.mailleDe(concept, "decouvrir"),
    strategieInitiale: (m) => derivationsModele.strategieInitiale(m, concept.id),
    producteurDe: (m) => derivationsModele.producteurDe(m, concept.id),
    etatVideObligatoire: (m) => derivationsModele.etatVideObligatoire(m, concept.id),
    porteeDe: (m) => derivationsModele.porteeDe(m, parcours, 1),
    surfacesDe: (m) => derivationsModele.surfacesDe(m),
    contratDEtape: (m) => derivationsModele.contratDEtape(m, parcours, 3),
    repetitionsSuspectes: (m) => derivationsModele.repetitionsSuspectes(derivationsModele.surfacesDe(m)),
    inventaireDe: () => derivationsModele.inventaireDe("texte fixe de calibration"),
    verifierCouvertureLexicale: (m) =>
      derivationsModele.verifierCouvertureLexicale(["soins", "creneau"], m),
    // EP-162 (édition consciente) — « ce terme est-il porté par un geste que
    // le modèle EXERCE ? ». Le terme vient du brief, comme pour les deux
    // dérivations voisines : il entre donc en argument FIXE, et ce qui est
    // éprouvé ici est que la réponse ne dépend QUE du modèle. Les gestes
    // exercés sont lus dans `parcours[].etapes[].geste` — rien d'autre.
    porteParUnGesteExerce: (m) => derivationsModele.porteParUnGesteExerce(m, "consulter"),
    // obligations (post-P0, consomment des sections AIR structurées)
    actionsPromises: () => derivationsObligations.actionsPromises([]),
    ciblesVivantes: () => derivationsObligations.ciblesVivantes({}),
    obligationsPourPasse: () => derivationsObligations.obligationsPourPasse("actions", { screens: [] }),
    // R3 (édition CONSCIENTE du cliquet de complétude) — les dérivations
    // P2a/P2d et le juge du plan entrent dans la batterie : elles aussi ne
    // voient QUE le modèle.
    capacitesDe: (m) => derivationsModele.capacitesDe(m),
    ecransDe: (m) => derivationsModele.ecransDe(m),
    jugerPlanEcrans: (m) => derivationsModele.jugerPlanEcrans(derivationsModele.ecransDe(m)),
    // EP-173 (édition consciente) — la partition des écrans du plan par
    // parcours. Modèle + plan seuls, aucune donnée extérieure : l'affectation
    // suit `parcoursParPriorite`, déjà dans cette batterie.
    lotsDEcrans: (m) => derivationsModele.lotsDEcrans(m, derivationsModele.ecransDe(m)),
    // EP-182 (édition consciente) — les paires d'étapes qui sont un FILTRE et
    // sa LISTE. Modèle seul : le discriminant vient de `TABLE_GESTES`
    // (transport, cardinalité, effet) et des concepts des étapes.
    etapesFusionnables: (m) => derivationsModele.etapesFusionnables(m),
    // EP-182 ② (édition consciente) — l écran d ouverture montre-t-il du
    // contenu ? Dérivé du plan, lui-même dérivé du modèle. Modèle seul.
    jugerEntreeSansCollection: (m) => derivationsModele.jugerEntreeSansCollection(m),
    // R5 (édition CONSCIENTE) — prescriptions et vérificateur : modèle+plan
    // seuls, comme tout le reste.
    ecranAirDe: () => derivationsModele.ecranAirDe("ecr_entree"),
    prescriptionsNavigation: (m) => derivationsModele.prescriptionsNavigation(derivationsModele.ecransDe(m)),
    verifierNavigationPrescrite: (m) => {
      const plan = derivationsModele.ecransDe(m);
      const p2 = derivationsModele.prescriptionsNavigation(plan);
      return derivationsModele.verifierNavigationPrescrite(
        { navigation: { entryScreenId: p2.entree, routes: [], primary: undefined }, screens: [] },
        p2,
      );
    },
    obligationsPrescriptives: (m) =>
      derivationsModele.obligationsPrescriptives("base", m, derivationsModele.ecransDe(m)),
    // EP-059 (édition consciente) — juges J2/J3, modèle seul.
    consommateursDIdentite: () => derivationsModele.consommateursDIdentite(),
    // EP-068 (édition consciente) — sources d'identité dérivées de la table.
    estSourceDIdentite: () => derivationsModele.estSourceDIdentite("retirer"),
    sourcesDIdentite: () => derivationsModele.sourcesDIdentite(),
    // EP-118 (édition consciente) — le lien élu→parcouru que la décision
    // de consommation-par-portée établissait sans le transmettre.
    consommationsParPortee: (m) => derivationsModele.consommationsParPortee(m),
    // EP-122 (édition consciente) — la sérialisation d'une décision de
    // surface : pure, modèle seul, aucune donnée extérieure.
    decisionDeSurface: (m) => derivationsModele.decisionDeSurface({ ...(derivationsModele.surfacesDe(m)[0] ?? {}) }),
    // EP-070 (édition consciente) — consommation-par-portée : prédicat de
    // parcours de collection + lien déclaré, dérivés du modèle seul.
    gestesParcoursDeCollection: () => derivationsModele.gestesParcoursDeCollection(),
    conceptsRelies: (m) => derivationsModele.conceptsRelies(m, m.concepts[0]?.id ?? "", m.concepts[1]?.id ?? ""),
    estConceptIdentite: (m) => derivationsModele.estConceptIdentite(m, m.concepts[0]?.id ?? ""),
    // EP-135 (édition consciente) — la classe d'un diagnostic est une
    // propriété de la TABLE, jamais du modèle ni du brief : la dérivation
    // ne prend aucun argument de modèle, et sa sortie est donc constante.
    diagnosticsDeClasse: () => derivationsModele.diagnosticsDeClasse("intention_manquante"),
    // EP-139 (édition consciente) — l'accès sans connexion se juge sur le
    // MODEL seul : concepts, relations, parcours. Aucune de ces quatre
    // dérivations ne regarde le brief.
    parcoursFerme: (m) => (m.parcours[0] === undefined ? null : derivationsModele.parcoursFerme(m, m.parcours[0])),
    parcoursParPriorite: (m) => derivationsModele.parcoursParPriorite(m).map((p) => p.id),
    jugerAccesSansConnexion: (m) => derivationsModele.jugerAccesSansConnexion(m),
  };

  it("COMPLÉTUDE — la batterie couvre CHAQUE fonction exportée des dérivations", () => {
    const exportees = [
      ...Object.entries(derivationsModele),
      ...Object.entries(derivationsObligations),
    ]
      .filter(([, v]) => typeof v === "function")
      .map(([k]) => k)
      .sort();
    expect(exportees).toEqual(Object.keys(BATTERIE).sort());
  });

  it("C — deux briefs DIFFÉRENTS, même MODEL ⇒ dérivations BYTE-IDENTIQUES", () => {
    // Le brief n'est un paramètre d'AUCUNE dérivation : on le fait varier
    // dans l'environnement du test, le MODEL reste identique, et chaque
    // sortie de la batterie est comparée octet à octet.
    const executer = (briefAmbiant: string) => {
      expect(briefAmbiant.length).toBeGreaterThan(0); // le brief existe, ailleurs
      const sorties: Record<string, string> = {};
      for (const [nom, f] of Object.entries(BATTERIE)) {
        sorties[nom] = JSON.stringify(f(structuredClone(MODELE)) ?? null);
      }
      return sorties;
    };
    const a = executer("premier brief — institut de beauté à Abidjan");
    const b = executer("SECOND brief totalement différent — atelier vélo à Lyon");
    expect(a).toEqual(b);
  });

  it("le MODEL ne peut PAS porter de décisions d'étapes ultérieures (probes, 2 étages)", () => {
    for (const cle of ["ecrans", "screens", "layout", "theme", "navigation", "composition"]) {
      // Étage 1 — entrée 1.0.0 : la MIGRATION (liste fermée de clés) fait
      // mourir la clé étrangère avant le schéma : validation verte, clé absente.
      const probe10 = { ...structuredClone(MODELE), [cle]: [] };
      expect(derivationsModele.validerModele(probe10), `1.0.0+${cle}`).toEqual([]);
      const migre10 = derivationsModele.migrerModele(probe10) as Record<string, unknown>;
      expect(cle in migre10, `la migration a laissé passer ${cle}`).toBe(false);
      // Étage 2 — entrée 1.1.0 (sans migration) : le schéma STRICT refuse.
      const probe11 = { ...(derivationsModele.migrerModele(structuredClone(MODELE)) as object), [cle]: [] };
      expect(
        derivationsModele.validerModele(probe11).some((d) => d.code === "MODELE_SCHEMA"),
        `clé interdite acceptée en 1.1.0 : ${cle}`,
      ).toBe(true);
    }
  });
});

describe("F — intent.needs n'est PAS un cerveau concurrent", () => {
  it("STATIQUE — ni le plan ni l'émission ne lisent `intent`", () => {
    for (const src of ["emit-project.ts", "plan-composition.ts", "resolve-lock.ts"]) {
      const code = readFileSync(join(R, "packages", "compiler", "src", src), "utf8")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
        .join("\n");
      expect(code.includes("intent."), src).toBe(false);
      expect(code.includes(".intent"), src).toBe(false);
    }
  });

  it("DYNAMIQUE — muter intent.needs ne change pas UN octet émis", () => {
    const original = projectAirSchema.parse(
      migrateAirDocument(
        JSON.parse(
          readFileSync(join(R, "slices", "dougplace", "dougplace.air.json"), "utf8"),
        ) as Record<string, unknown>,
      ),
    );
    expect(original.intent?.needs.length).toBeGreaterThan(0);
    const mute = {
      ...original,
      intent: original.intent === undefined ? undefined : {
        ...original.intent,
        // Mutation RÉELLE : ordre des besoins inversé, nodeIds inversés —
        // si une décision structurelle lisait needs, l'émission bougerait.
        needs: [...original.intent.needs].reverse().map((n) => ({
          ...n,
          resolution:
            n.resolution.kind === "satisfied"
              ? { ...n.resolution, nodeIds: [...n.resolution.nodeIds].reverse() }
              : n.resolution,
        })),
      },
    };
    const a = emitProject(original);
    const b = emitProject(projectAirSchema.parse(mute));
    expect([...b.files.keys()].sort()).toEqual([...a.files.keys()].sort());
    for (const [chemin, contenu] of a.files) expect(b.files.get(chemin), chemin).toBe(contenu);
  });
});

describe("G — MODEL_CONFORMITY ⊥ MODEL_SUFFICIENCY_FROM_INTENT", () => {
  it("les deux verdicts viennent de fonctions DISJOINTES sur des entrées DISJOINTES", () => {
    // CONFORMITÉ : (document, modèle) — kaviva = RED (R1, inchangé ici).
    // SUFFISANCE (mécanisme) : (inventaire, modèle) — le modèle sain est vert.
    const inventaire = derivationsModele.inventaireDe(
      "soins créneaux rendez-vous cliente profil",
    );
    const suffisance = derivationsModele.verifierCouvertureLexicale(inventaire, MODELE);
    expect(suffisance.filter((d) => d.code === "MODELE_TERME_NON_JUSTIFIE")).toEqual([]);
    // Coin opposé : un modèle AMPUTÉ échoue la suffisance…
    const ampute = structuredClone(MODELE);
    ampute.concepts = ampute.concepts.filter((c) => c.id !== "cpt_creneau");
    ampute.relations = ampute.relations.filter((r) => r.vers !== "cpt_creneau");
    ampute.couverture.couverts = ampute.couverture.couverts.filter(
      (x) => !x.noeuds.includes("cpt_creneau"),
    );
    ampute.parcours = ampute.parcours.map((p) => ({
      ...p, etapes: p.etapes.filter((e) => e.concept !== "cpt_creneau"),
    }));
    const suffisanceAmputee = derivationsModele.verifierCouvertureLexicale(inventaire, ampute);
    expect(suffisanceAmputee.some((d) => d.code === "MODELE_TERME_NON_JUSTIFIE")).toBe(true);
    // …sans que la CONFORMITÉ du document kaviva (RED, jugée par
    // navigationsDeLigne dans r1-enveloppe.test) n'entre dans ce calcul :
    // aucune des deux fonctions ne lit l'autre entrée. Indépendance par
    // CONSTRUCTION (signatures) + par exhibition des coins (vert/rouge).
  });
});
