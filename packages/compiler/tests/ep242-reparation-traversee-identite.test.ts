/**
 * EP-242 · LE MOTEUR RÉPARE CE QUE LES JUGES REFUSENT — SANS LES TOUCHER.
 *
 * ── CE QUI A COMMANDÉ CE FICHIER.
 *
 * Le cahier CONTERAK a été refusé en P0 aux TROIS tours, pour 2,74 $, sur
 * deux règles qui revenaient sans jamais converger :
 *
 *   DERIVATION_TRAVERSEE_ACTEUR       « écran traversé par 2 acteurs avec
 *                                       surface NON publique »
 *   DERIVATION_IDENTITE_NON_CONSOMMEE « identité élue par choisir, n'atteint
 *                                       aucun consommateur »
 *
 * ── LA DÉCISION DU PROPRIÉTAIRE, ET CE QU'ELLE INTERDIT.
 *
 * « On ne corrige pas les cahiers des utilisateurs, on rend le MOTEUR capable
 * de les traiter lui-même. » Les deux règles sont JUSTES — la première
 * empêche une fuite de données entre rôles, la seconde tient la cohérence
 * d'un parcours — et elles ne doivent NI changer NI s'assouplir.
 *
 * La réparation doit donc faire PASSER le juge, jamais le désarmer. Ce
 * fichier interroge les juges RÉELS, importés tels quels : si quelqu'un les
 * assouplissait pour faire passer la réparation, le contrôle de sécurité
 * ci-dessous rougirait.
 *
 * ── CE QUE LA MESURE A ÉTABLI, et qui rend la réparation DÉTERMINÉE.
 *
 * Une surface est identifiée par `concept|geste|état|PORTÉE`. Deux acteurs ne
 * partagent donc une surface PRIVÉE que si leur portée est identique — ce qui
 * exclut `acteur:<id>` (différent par acteur) et désigne `instance:<concept>`,
 * née de la propagation d'identité. La réduction ci-dessous le reproduit à
 * coût nul, et c'est elle qui a guidé le remède.
 */
import { describe, expect, it } from "vitest";
import {
  consommateursDIdentite,
  ecransDe,
  jugerPlanEcrans,
  surfacesDe,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";
import {
  reparerParcours,
} from "../../../benchmarks/air-emission/reparation-parcours.mjs";

/** Les juges RÉELS, concaténés comme le pipeline les lit. Jamais simulés. */
const juger = (m: ModeleMetier): { code: string; path?: string }[] => {
  const plan = ecransDe(m);
  return [
    ...plan.diagnostics,
    ...jugerPlanEcrans(plan, m),
    ...validerModele(m),
  ] as { code: string; path?: string }[];
};

const outils = { ecransDe, surfacesDe, consommateursDIdentite, juger };

const socle = (parcours: readonly Record<string, unknown>[]): ModeleMetier =>
  ({
    version: "modele-metier/1.2.0",
    acteurs: [
      { id: "act_un", nom: "Un" },
      { id: "act_deux", nom: "Deux" },
    ],
    concepts: [
      { id: "ent_a", nom: "A", donnees: true, attributs: [{ id: "att_a", nature: "texte", requis: true }] },
      { id: "ent_b", nom: "B", donnees: true, attributs: [{ id: "att_b", nature: "texte", requis: true }] },
    ],
    relations: [{ de: "ent_a", vers: "ent_b", nature: "possede" }],
    parcours,
    couverture: { couverts: [{ terme: "a", noeuds: ["ent_a"] }], nonRetenus: [] },
  }) as unknown as ModeleMetier;

const codes = (m: ModeleMetier): string[] => juger(m).map((d) => d.code);

describe("EP-242 · la réparation satisfait les juges, elle ne les désarme pas", () => {
  it("TRAVERSÉE D ACTEUR — réduite du cas CONTERAK, puis réparée", () => {
    // Deux acteurs qui font `choisir A` puis `decouvrir B` (B relié à A)
    // partagent `srf_ent_b_decouvrir` en portée `instance:ent_a`. C est la
    // forme exacte du refus de CONTERAK, en quatre lignes.
    const avant = socle([
      {
        id: "par_un", acteur: "act_un", besoin: "voir b depuis a",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "decouvrir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
      {
        id: "par_deux", acteur: "act_deux", besoin: "voir b aussi",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "decouvrir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
    ]);
    expect(
      codes(avant),
      "la réduction ne reproduit pas le défaut : elle ne prouverait rien",
    ).toContain("DERIVATION_TRAVERSEE_ACTEUR");

    const r = reparerParcours(avant, outils) as {
      modele: ModeleMetier
      reparations: { action: string }[]
    };
    expect(codes(r.modele), "le juge refuse toujours après réparation").not.toContain(
      "DERIVATION_TRAVERSEE_ACTEUR",
    );
    expect(r.reparations.length, "aucune réparation consignée").toBeGreaterThan(0);
    expect(
      r.reparations[0]?.action,
      "la réparation doit DIRE ce qu elle a fait, pas se contenter d agir",
    ).toMatch(/chercher/u);
  });

  it("LE CŒUR NE BOUGE PAS — c est le second parcours qui s écarte", () => {
    // Le parcours[0] donne l écran d entrée : le déplacer changerait
    // l application elle-même. La règle de choix doit être stable, sinon
    // deux exécutions répareraient deux choses différentes.
    const avant = socle([
      {
        id: "par_un", acteur: "act_un", besoin: "coeur",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "decouvrir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
      {
        id: "par_deux", acteur: "act_deux", besoin: "second",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "decouvrir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
    ]);
    const r = reparerParcours(avant, outils) as { modele: ModeleMetier }
    const p = (r.modele as unknown as { parcours: { id: string; etapes: { geste: string }[] }[] })
      .parcours
    expect(p[0]?.etapes[1]?.geste, "le cœur a été modifié").toBe("decouvrir")
    expect(p[1]?.etapes[1]?.geste, "le second parcours n a pas été séparé").toBe("chercher")
  });

  it("IDENTITÉ NON CONSOMMÉE — l étape manquante est posée", () => {
    const avant = socle([
      {
        id: "par_un", acteur: "act_un", besoin: "elire sans consommer",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
    ]);
    expect(codes(avant)).toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");

    const r = reparerParcours(avant, outils) as {
      modele: ModeleMetier
      reparations: { action: string }[]
    };
    expect(
      codes(r.modele),
      "l identité élue n atteint toujours aucun consommateur",
    ).not.toContain("DERIVATION_IDENTITE_NON_CONSOMMEE");
    expect(r.reparations[0]?.action).toMatch(/consulter ent_a/u);
  });

  it("SÉCURITÉ — un modèle réellement dangereux reste REFUSÉ", () => {
    // ── LE CONTRÔLE QUI COMPTE LE PLUS.
    //
    // Deux acteurs, un écran privé partagé — mais la surface fautive naît
    // d un `consulter`, pas d un `decouvrir`. La réparation n a PAS
    // d équivalent « recherche » pour ce geste : elle REFUSE de l inventer,
    // et le juge doit continuer à refuser.
    //
    // Sans ce contrôle, on pourrait faire passer n importe quoi en élargissant
    // la réparation jusqu à ce que plus rien ne soit refusé — ce qui reviendrait
    // à désarmer la règle en la contournant.
    const dangereux = socle([
      {
        id: "par_un", acteur: "act_un", besoin: "lire b d un a",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
      {
        id: "par_deux", acteur: "act_deux", besoin: "lire le meme b",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_b", geste: "consulter" },
        ],
      },
    ]);
    expect(
      codes(dangereux),
      "la maquette dangereuse ne déclenche pas le juge : elle ne prouve rien",
    ).toContain("DERIVATION_TRAVERSEE_ACTEUR");

    const r = reparerParcours(dangereux, outils) as { modele: ModeleMetier }
    expect(
      codes(r.modele),
      "LA FUITE EST PASSÉE : deux acteurs partagent une surface privée et le juge se tait",
    ).toContain("DERIVATION_TRAVERSEE_ACTEUR");
  });

  it("une réparation qui n améliore rien est JETÉE", () => {
    // La garde : on ne retient un modèle réparé que si les diagnostics
    // DIMINUENT STRICTEMENT et qu aucun code NOUVEAU n apparaît. Un modèle
    // déjà sain ne doit donc subir aucune modification.
    const sain = socle([
      {
        id: "par_un", acteur: "act_un", besoin: "sain",
        etapes: [
          { concept: "ent_a", geste: "choisir" },
          { concept: "ent_a", geste: "consulter" },
        ],
      },
    ]);
    const r = reparerParcours(sain, outils) as {
      modele: ModeleMetier
      reparations: unknown[]
    };
    expect(r.reparations, "un modèle sain a été modifié sans raison").toEqual([]);
    expect(JSON.stringify(r.modele)).toBe(JSON.stringify(sain));
  });
});
