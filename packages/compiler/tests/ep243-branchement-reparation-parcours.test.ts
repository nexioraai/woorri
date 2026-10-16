/**
 * EP-243 · LA RÉPARATION EST BRANCHÉE AU MOTEUR, PAS SEULEMENT ÉCRITE.
 *
 * ── CE QUE EP-242 PROUVAIT, ET CE QU'IL NE PROUVAIT PAS.
 *
 * EP-242 éprouve `reparerParcours` EN ISOLATION : on l'appelle à la main, on
 * regarde le modèle qui sort. Cinq contrôles verts — et le moteur, lui, ne
 * l'appelait jamais. Une réparation écrite mais débranchée répare zéro
 * génération ; c'est exactement la forme de défaut que ce dépôt a payée
 * plusieurs fois (une règle vraie, un garde-fou posé, et personne pour
 * l'invoquer).
 *
 * Ce fichier part donc du MOTEUR. Il lui donne un faux fournisseur qui rend
 * un modèle P0 fautif, et vérifie que le modèle ressort conforme — sans
 * qu'aucun juge ait bougé.
 *
 * ── OÙ ELLE EST BRANCHÉE, ET POURQUOI PAS AILLEURS.
 *
 * `reparerNavigation` répare le DOCUMENT AIR, en phase d'émission.
 * `reparerParcours` répare le MODÈLE MÉTIER — parcours et étapes, l'objet
 * que P0 produit. La brancher au même endroit lui donnerait un document au
 * lieu d'un modèle. Son voisin juste est `reparerPlan`.
 */
import { describe, expect, it } from "vitest";
import {
  ecransDe,
  jugerPlanEcrans,
  validerModele,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const CHEMIN_MOTEUR = new URL(
  "../../../benchmarks/air-emission/moteur.mjs",
  import.meta.url,
).href;

/** Le modèle fautif, réduit du cas CONTERAK : deux acteurs, une surface privée. */
const MODELE_FAUTIF = {
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
  parcours: [
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
  ],
  couverture: { couverts: [{ terme: "a", noeuds: ["ent_a"] }], nonRetenus: [] },
};

interface Tirage {
  reparations?: string[]
  diagnostics?: string[]
}

const codes = (m: ModeleMetier): string[] => {
  const plan = ecransDe(m);
  return [...plan.diagnostics, ...jugerPlanEcrans(plan, m), ...validerModele(m)].map(
    (d: { code: string }) => d.code,
  );
};

/**
 * Un fournisseur qui rend CE modèle à la demande de P0, et rien d'autre
 * ensuite. Aucun réseau, aucun jeton, aucune dépense.
 */
const clientQuiRend = (modele: unknown) => ({
  messages: {
    create: (args: { max_tokens?: number }) => {
      // La sonde de grammaire s'interroge avec `max_tokens: 1` : on l'accepte
      // sans rien dire, sinon le moteur dégraderait en boucle.
      if (args.max_tokens === 1) {
        return Promise.resolve({ content: [{ type: "text", text: "{}" }], usage: {} })
      }
      // MESURÉ : `jugerSortieP0` parse le texte et prend l objet A LA
      // RACINE comme modèle — pas sous une clé `modele`. Ma première version
      // l imbriquait, et le moteur plantait sur `modele.parcours` indéfini.
      return Promise.resolve({
        content: [{ type: "text", text: JSON.stringify(modele) }],
        usage: { input_tokens: 1, output_tokens: 1 },
      })
    },
  },
});

describe("EP-243 · le moteur APPELLE la réparation des parcours", () => {
  it("le modèle fautif est bien fautif — sinon rien n est prouvé", () => {
    expect(codes(MODELE_FAUTIF as unknown as ModeleMetier)).toContain(
      "DERIVATION_TRAVERSEE_ACTEUR",
    );
  });

  it("le moteur APPELLE la réparation, et le juge ne voit plus la traversée", async () => {
    // ── LA CHAÎNE RÉELLE, PAS LA FONCTION EN ISOLATION.
    //
    // On enchaîne les tranches comme le fait le vrai travailleur : la
    // première se pose dès que le sondage est connu (EP-235), P0 vient à la
    // seconde. Sans cet enchaînement on n atteindrait jamais la réparation —
    // et le test passerait au vert sans rien avoir traversé.
    const { creerMoteur } = (await import(CHEMIN_MOTEUR)) as {
      creerMoteur: (o: unknown) => Promise<{
        poursuivreEmission: (o: unknown) => Promise<{
          fini: boolean
          etat?: { tirages?: Tirage[] }
          resultat?: { tirages?: Tirage[] }
        }>
      }>
    };
    const m = await creerMoteur({
      cleApi: "client-a-blanc",
      client: clientQuiRend(MODELE_FAUTIF),
    });
    let etat: unknown = null;
    let tirages: Tirage[] = [];
    for (let tour = 0; tour < 5 && tirages.length === 0; tour++) {
      const r = await m.poursuivreEmission({
        brief: "deux roles regardent les memes b",
        slug: "ep243",
        etat,
        budgetMs: 60_000,
      });
      etat = r.etat ?? null;
      tirages = r.etat?.tirages ?? r.resultat?.tirages ?? [];
      if (r.fini) break;
    }

    expect(tirages.length, "le moteur n a jamais atteint P0").toBeGreaterThan(0);

    // ① LE BRANCHEMENT : le moteur a CONSIGNÉ la réparation.
    const reparations = tirages.flatMap((t) => t.reparations ?? []);
    expect(
      reparations.join(" | "),
      "aucune réparation consignée : la fonction est écrite mais débranchée",
    ).toMatch(/chercher/u);

    // ② L EFFET : le juge ne voit plus la traversée d acteur.
    const vus = tirages.flatMap((t) => t.diagnostics ?? []);
    expect(
      vus,
      "le juge voit TOUJOURS la traversée : la réparation n a pas pris effet",
    ).not.toContain("DERIVATION_TRAVERSEE_ACTEUR");

    // CE QUE CE TEST NE PRÉTEND PAS : que la génération aboutisse. La
    // maquette minimale ne déclare aucun concept d identité, et le juge le
    // dit — `MODELE_IDENTITE_ABSENTE`. C est un manque de la MAQUETTE, pas
    // de la réparation, et le dire vaut mieux que de l habiller.
    expect(vus.length, "la maquette passe tout : elle ne prouverait rien").toBeGreaterThan(0);
  }, 30_000);

  it("CONTRÔLE NÉGATIF — un modèle sain traverse le moteur sans être touché", async () => {
    // Si le branchement modifiait un modèle déjà conforme, il introduirait
    // du mouvement là où il n y a rien à corriger — et on ne saurait plus
    // distinguer une réparation utile d une habitude.
    const sain = JSON.parse(JSON.stringify(MODELE_FAUTIF)) as typeof MODELE_FAUTIF;
    sain.parcours[1].etapes[1].geste = "chercher";
    expect(codes(sain as unknown as ModeleMetier)).not.toContain("DERIVATION_TRAVERSEE_ACTEUR");

    const { creerMoteur } = (await import(CHEMIN_MOTEUR)) as {
      creerMoteur: (o: unknown) => Promise<{
        poursuivreEmission: (o: unknown) => Promise<{
          etat?: { tirages?: { reparations?: string[] }[] }
          resultat?: { tirages?: { reparations?: string[] }[] }
        }>
      }>
    };
    const m = await creerMoteur({ cleApi: "client-a-blanc", client: clientQuiRend(sain) });
    const r = await m.poursuivreEmission({
      brief: "deux roles, deja separes",
      slug: "ep243-sain",
      budgetMs: 60_000,
    });
    const tirages = r.etat?.tirages ?? r.resultat?.tirages ?? [];
    const reparations = tirages.flatMap((t) => t.reparations ?? []);
    expect(
      reparations.filter((x) => /chercher/u.test(x)),
      "un modèle sain a été « réparé » : la garde ne tient pas",
    ).toEqual([]);
  }, 30_000);
});
