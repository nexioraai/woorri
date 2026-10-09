// ============================================================
// VOLET ② CONVERGENCE — L'IDENTITÉ S'EXIGE AU PLAN, PAS AU DOCUMENT.
//
// ── LE DÉFAUT MESURÉ (tir réel n°2, 2026-10-09).
//
// Les juges de PLAN ont laissé passer un modèle sans concept d'identité ;
// les juges de DOCUMENT l'ont refusé 2,94 $ plus tard, sur la DÉCISION
// PRODUIT de `presentation.ts` : « l'identité doit être au modèle ». Le
// même refus doit tomber au plan, à 0,11 $.
//
// Deux choses sont tenues ici : les DEUX FIXTURES contre le vrai juge, et
// le CLIQUET BIDIRECTIONNEL qui lie le juge de plan à la source produit —
// sans import `.ts` depuis le module du plan, qui réintroduirait le défaut
// « Node ne sait pas lire un .ts » en production.
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as derivationsModele from "../../../benchmarks/air-emission/modele-metier.mjs";
import type { ModeleMetier } from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const lire = (p: string): string => readFileSync(join(REPO, p), "utf8");
const sansCommentaires = (t: string): string =>
  t.replace(
    /("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(`(?:\\.|[^`\\])*`)|(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)/g,
    (m, _d, _s, _t, ligne, bloc) =>
      ligne === undefined && bloc === undefined ? m : m.replace(/[^\n]/g, " "),
  );

// ── FIXTURE 1 — le modèle du tir réel n°2, reconstitué : « noter mes
// dépenses du jour » SANS concept d'identité. C'est exactement la forme qui
// a coûté 2,94 $ avant de mourir au document.
const SANS_IDENTITE: ModeleMetier = {
  version: "modele-metier/1.2.0",
  acteurs: [{ id: "act_moi", nom: "Moi" }],
  concepts: [
    {
      id: "ent_depense",
      nom: "Dépense",
      donnees: true,
      attributs: [
        { id: "att_libelle", nature: "texte", requis: true },
        { id: "att_montant", nature: "nombre", requis: true },
      ],
    },
  ],
  relations: [],
  parcours: [
    {
      id: "par_noter",
      besoin: "noter une dépense",
      acteur: "act_moi",
      etapes: [
        { concept: "ent_depense", geste: "saisir" },
        { concept: "ent_depense", geste: "confirmer" },
      ],
    },
    {
      id: "par_consulter",
      besoin: "consulter mes dépenses du jour",
      acteur: "act_moi",
      etapes: [
        { concept: "ent_depense", geste: "decouvrir" },
        { concept: "ent_depense", geste: "choisir" },
        { concept: "ent_depense", geste: "consulter" },
      ],
    },
  ],
  couverture: {
    couverts: [
      { terme: "dépenses", noeuds: ["ent_depense"] },
      { terme: "noter", noeuds: ["par_noter"] },
      { terme: "consulter", noeuds: ["par_consulter"] },
    ],
    nonRetenus: [],
  },
} as unknown as ModeleMetier;

// ── FIXTURE 2 — le MÊME modèle, étendu d'un concept compte et d'un
// parcours qui s'identifie : ce que le tirage informé doit obtenir de P0.
const AVEC_IDENTITE: ModeleMetier = JSON.parse(JSON.stringify(SANS_IDENTITE)) as ModeleMetier;
(AVEC_IDENTITE as { concepts: unknown[] }).concepts.push({
  id: "ent_compte",
  nom: "Compte",
  donnees: true,
  attributs: [{ id: "att_email", nature: "texte", requis: true }],
});
(AVEC_IDENTITE as { parcours: unknown[] }).parcours.push({
  id: "par_connexion",
  besoin: "retrouver mes dépenses",
  acteur: "act_moi",
  etapes: [
    { concept: "ent_compte", geste: "s_identifier" },
    { concept: "ent_depense", geste: "consulter_historique" },
  ],
});
(AVEC_IDENTITE as { couverture: { couverts: unknown[] } }).couverture.couverts.push({
  terme: "retrouver",
  noeuds: ["par_connexion"],
});

describe("volet ② — le juge de plan, contre les DEUX fixtures", () => {
  it("le modèle du tir n°2 (sans identité) est REFUSÉ au plan, en nommant la réparation", () => {
    const diags = derivationsModele.jugerIdentiteDuModele(SANS_IDENTITE);
    expect(diags).toHaveLength(1);
    const seul = diags[0];
    if (seul === undefined) throw new Error("aucun diagnostic rendu");
    expect(seul.code).toBe("MODELE_IDENTITE_ABSENTE");
    // Le message est le véhicule du reproche : il doit dire QUOI poser —
    // un concept d'identité ET le geste qui le consomme — sans jargon de
    // chemin interne.
    expect(seul.message).toContain("s_identifier");
    expect(seul.message).toContain("espace compte");
  });

  it("le même modèle étendu d'un compte + s_identifier passe en SILENCE", () => {
    expect(derivationsModele.jugerIdentiteDuModele(AVEC_IDENTITE)).toEqual([]);
  });

  it("la condition est LE MÊME PRÉDICAT que le chemin document", () => {
    // `estConceptIdentite` décide des deux côtés : si ce prédicat dit vrai
    // pour un concept, le juge de plan se tait — et `ecransDIdentite` du
    // prescriptif sera non vide, donc la branche document visée ne peut
    // plus se déclencher. Vérifié sur les fixtures, pas affirmé.
    expect(
      AVEC_IDENTITE.concepts.some((c) =>
        derivationsModele.estConceptIdentite(AVEC_IDENTITE, (c as { id: string }).id),
      ),
    ).toBe(true);
    expect(
      SANS_IDENTITE.concepts.some((c) =>
        derivationsModele.estConceptIdentite(SANS_IDENTITE, (c as { id: string }).id),
      ),
    ).toBe(false);
  });

  it("EP-135 : le diagnostic est classé, et en faute de production", () => {
    const entree = (derivationsModele.DIAGNOSTICS as Record<string, { classe: string } | undefined>)
      .MODELE_IDENTITE_ABSENTE;
    if (entree === undefined) throw new Error("MODELE_IDENTITE_ABSENTE absent de DIAGNOSTICS");
    expect(entree.classe).toBe("faute_de_production");
  });
});

describe("volet ② — le cliquet BIDIRECTIONNEL plan ↔ document", () => {
  const PRESENTATION = lire("packages/execution-contract/src/presentation.ts");
  const MODELE_METIER = sansCommentaires(lire("benchmarks/air-emission/modele-metier.mjs"));
  const MOTEUR = sansCommentaires(lire("benchmarks/air-emission/moteur.mjs"));

  it("sens 1 : la DÉCISION PRODUIT existe ⇒ le juge de plan est câblé", () => {
    // La prémisse d'abord : si elle disparaît, ce test tombera par le
    // sens 2 — jamais en silence.
    expect(PRESENTATION).toContain("PRESENTATION_ESPACE_COMPTE_ABSENT");
    // Le juge existe, sur le bon prédicat…
    const juge = MODELE_METIER.slice(
      MODELE_METIER.indexOf("export function jugerIdentiteDuModele"),
    );
    expect(juge.slice(0, 400)).toContain("estConceptIdentite");
    // …et le moteur le replie dans les diagnostics de PLAN — l'arrêt P2,
    // pas une vérification décorative.
    expect(MOTEUR).toContain("jugerIdentiteDuModele(candidat)");
  });

  it("sens 2 : si la DÉCISION PRODUIT disparaissait, cette garde devrait partir aussi", () => {
    // Le jour où `presentation.ts` ne porte plus l'exigence, ce test force
    // la main : retirer le juge de plan OU réaffirmer la décision. Les deux
    // juges ne peuvent pas diverger sans qu'un test le dise.
    const decisionVit = PRESENTATION.includes("PRESENTATION_ESPACE_COMPTE_ABSENT");
    const gardeVit = MODELE_METIER.includes("MODELE_IDENTITE_ABSENTE");
    expect(gardeVit).toBe(decisionVit);
  });

  it("aucun import `.ts` dans le module du plan — le lien est le cliquet, pas un import", () => {
    // Un import de `presentation.ts` depuis ce module tué la route en
    // production (« Node ne sait pas lire un .ts ») : interdit ici.
    expect(MODELE_METIER).not.toMatch(/from\s+["'][^"']*\.ts["']|import\(["'][^"']*\.ts/u);
  });
});
