// ============================================================
// EP-222 · LES RÈGLES DE FERMETURE SONT ENSEIGNÉES, PAS SEULEMENT PUNIES.
//
// ── CE QUI A ÉTÉ MESURÉ, ET COMBIEN ÇA A COÛTÉ.
//
// Tir réel du 2026-10-15 (`app_generations` b3a37d92) : trois tirages P0,
// 2,4386 $ dépensés, `sections=0`, rien produit.
//
//   tirage 1 · arrêt P1 · MODELE_ETAT_NON_OBSERVABLE · MODELE_COEUR_EXIGE_CONNEXION
//   tirage 2 · arrêt P2 · DERIVATION_CONFIRMATION_SANS_ECRITURE
//   tirage 3 · arrêt P2 · DERIVATION_CONFIRMATION_SANS_ECRITURE ×2
//
// Diagnostic : les juges exigeaient deux règles de fermeture que l'invite P0
// n'énonçait JAMAIS. Le modèle ne pouvait pas les deviner — il les apprenait
// par le reproche, c'est-à-dire APRÈS un refus payé. Le code du juge, lui,
// recopiait la table des gestes en dur (`saisir || payer || retirer`), si
// bien qu'il existait DEUX vérités sur ce qu'« écrire » veut dire.
//
// LE CLIQUET NE JUGE PAS LE JUGE — il exige que la PROSE et la TABLE disent
// la même chose, et que le juge dérive de la table. Si la table des gestes
// gagne une écriture demain et que l'invite l'oublie, ce fichier rougit.
//
// Chaque contrôle positif est doublé d'un contrôle NÉGATIF : un contrôle qui
// ne sait pas échouer ne prouve rien.
// ============================================================
import { describe, expect, it } from "vitest";
import { PROMPT_P0 } from "../../../benchmarks/air-emission/passe0.mjs";
import {
  GESTES,
  gestesEcrivants,
  ecransDe,
  jugerPlanEcrans,
  validerModele,
  DIAGNOSTICS,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const INVITE: string = PROMPT_P0;

/** Les refus du couple de juges P2, lus comme le moteur les concatène. */
const refusDe = (m: ModeleMetier): string[] => {
  const plan = ecransDe(m);
  return [...plan.diagnostics, ...jugerPlanEcrans(plan, m)].map((d: { code: string }) => d.code);
};

/**
 * Un modèle minimal VALIDE — même forme que le gabarit déjà éprouvé dans
 * `reparation-plan.verif.mjs`, pour qu'un refus ne puisse venir QUE des
 * étapes que l'on fait varier. Mesuré : un gabarit approximatif rend onze
 * `MODELE_SCHEMA` et le contrôle ne prouve plus rien.
 */
const modeleAvecEtapes = (
  etapes: readonly Record<string, unknown>[],
  etats?: readonly Record<string, unknown>[],
): ModeleMetier =>
  ({
    version: "modele-metier/1.2.0",
    acteurs: [{ id: "act_client", nom: "Client" }],
    concepts: [
      {
        id: "ent_releve",
        nom: "Relevé",
        donnees: true,
        // MESURÉ : le schéma exige { id, nature, requis } et REFUSE `nom`.
        // Le gabarit de `reparation-plan.verif.mjs` porte encore `nom` —
        // il ne passe jamais par `validerModele`, et ce fichier-là n'est
        // lancé par AUCUNE étape du gate ; nul ne l'a donc vu vieillir.
        attributs: [{ id: "att_index", nature: "texte", requis: true }],
        ...(etats === undefined ? {} : { etats }),
      },
    ],
    relations: [],
    parcours: [
      {
        id: "par_principal",
        acteur: "act_client",
        besoin: "Relever son compteur et en garder la preuve",
        etapes: etapes.map((e) => ({ concept: "ent_releve", ...e })),
      },
    ],
      couverture: { couverts: [{ terme: "relevé", noeuds: ["ent_releve"] }], nonRetenus: [] },
      // Gabarit littéral : le contrat complet porte bien plus de champs
      // optionnels, et c'est `validerModele` — pas le typeur — qui dit si
      // ce modèle tient debout. Les contrôles ci-dessous l'interrogent.
  }) as unknown as ModeleMetier;

describe("EP-222 · les règles de fermeture sont enseignées", () => {
  // ══════════════════════════════════════════════════════════════════
  // ① LA CONFIRMATION OBSERVE UNE ÉCRITURE — prose, table, juge.
  // ══════════════════════════════════════════════════════════════════

  it("l'invite P0 énonce la règle de la confirmation", () => {
    expect(
      INVITE,
      "l'invite ne dit pas qu'une confirmation exige une écriture en amont — " +
        "le modèle ne l'apprendrait qu'après un refus payé",
    ).toMatch(/UNE CONFIRMATION OBSERVE UNE ÉCRITURE/);
  });

  it("l'invite nomme EXACTEMENT les écritures de la table — ni plus, ni moins", () => {
    // LE CONTRÔLE QUI COMPTE. La prose ne recopie pas une liste à la main :
    // elle dérive de `gestesEcrivants()`. Si la table change et que l'invite
    // ne suit pas, c'est ici que ça rougit — pas dans un tir à 2,44 $.
    const ligne = INVITE.split("\n").find((l) => l.includes("UNE CONFIRMATION OBSERVE"));
    expect(ligne, "la règle de confirmation est introuvable").toBeDefined();
    const attendu = gestesEcrivants().join("/");
    expect(
      ligne,
      `l'invite doit nommer « ${attendu} », la liste DÉRIVÉE de la table des gestes`,
    ).toContain(attendu);
    // NÉGATIF : aucun geste NON écrivant ne doit être présenté comme une écriture.
    const nonEcrivants = GESTES.filter((g: string) => !gestesEcrivants().includes(g));
    const fautifs = nonEcrivants.filter((g: string) => ligne?.includes(`${g}/`) === true);
    expect(fautifs, `l'invite présente comme écriture(s) : ${fautifs.join(", ")}`).toEqual([]);
  });

  it("le juge REFUSE une confirmation que rien n'écrit en amont", () => {
    const refus = refusDe(
      modeleAvecEtapes([{ geste: "consulter" }, { geste: "confirmer" }]),
    );
    expect(
      refus,
      "une confirmation sans écriture amont doit être refusée — c'est le cas mesuré",
    ).toContain("DERIVATION_CONFIRMATION_SANS_ECRITURE");
  });

  it("le juge ACCEPTE une confirmation après CHAQUE écriture de la table", () => {
    // Dérivé, et non trois cas écrits à la main : un geste ajouté à la table
    // est couvert d'office. Le juge codait ces trois noms en dur ; ce
    // contrôle est ce qui rend la dérivation vérifiable.
    for (const ecriture of gestesEcrivants()) {
      const refus = refusDe(modeleAvecEtapes([{ geste: ecriture }, { geste: "confirmer" }]));
      expect(
        refus,
        `« ${ecriture} » est une écriture de la table : une confirmation en aval doit passer`,
      ).not.toContain("DERIVATION_CONFIRMATION_SANS_ECRITURE");
    }
  });

  it("CONTRÔLE NÉGATIF — aucun geste non écrivant ne satisfait la confirmation", () => {
    // Sans cela, le contrôle précédent passerait au vert même si le juge
    // acceptait n'importe quel amont.
    const lecteurs = GESTES.filter(
      (g: string) => !gestesEcrivants().includes(g) && g !== "confirmer",
    );
    for (const lecture of lecteurs) {
      const refus = refusDe(modeleAvecEtapes([{ geste: lecture }, { geste: "confirmer" }]));
      expect(
        refus,
        `« ${lecture} » n'écrit pas : une confirmation en aval doit rester refusée`,
      ).toContain("DERIVATION_CONFIRMATION_SANS_ECRITURE");
    }
  });

  it("EP-231 — l invite énonce la règle du partage entre acteurs", () => {
    // MESURE PAYÉE (tir du 2026-10-15 à 19:10, tirage 1, 0,8397 $) :
    // « ecrans[ecr_entree] : écran traversé par 2 acteurs avec surface NON
    // publique ». Le juge l'exigeait, `porteeDe` la dérive — et l'invite ne
    // la prononçait NULLE PART. Même famille qu'EP-222.
    expect(INVITE).toMatch(/DEUX ACTEURS NE PARTAGENT/u)
    const ligne = INVITE.split("\n").find((l) => l.includes("DEUX ACTEURS NE PARTAGENT"))
    // Les deux sources de privauté, telles que `porteeDe` les calcule.
    expect(ligne, "consulter_historique rend TOUJOURS l étape privée").toMatch(
      /consulter_historique/u,
    )
    expect(ligne, "un geste sur un concept que l acteur PRODUIT est privé, sauf saisir").toMatch(
      /saisir/u,
    )
    // Et la sortie : ce que le générateur doit faire à la place.
    expect(ligne, "la règle doit dire quoi faire, pas seulement interdire").toMatch(/chercher/u)
  })

  it("EP-231 — CONTRÔLE NÉGATIF : le juge refuse bien ce que la règle décrit", () => {
    // Sans ce contrôle, enseigner la règle serait inutile — et si le juge
    // changeait d avis, la prose mentirait.
    const codes = Object.keys(DIAGNOSTICS)
    expect(
      codes,
      "le code que la règle enseigne n existe plus dans la table des juges",
    ).toContain("DERIVATION_TRAVERSEE_ACTEUR")
  })

  // ══════════════════════════════════════════════════════════════════
  // ② TOUT ÉTAT ATTEINT SE MONTRE — et pas seulement l'exogène.
  // ══════════════════════════════════════════════════════════════════

  it("l'invite P0 étend l'observabilité à TOUTE transition, pas au seul exogène", () => {
    // L'invite enseignait la visibilité DANS le point « transition exogène ».
    // Le juge, lui, l'exige pour tout état atteint — geste mutant compris :
    // c'est le `MODELE_ETAT_NON_OBSERVABLE` du tirage 1.
    expect(INVITE).toMatch(/TOUT ÉTAT ATTEINT SE MONTRE/);
    const ligne = INVITE.split("\n").find((l) => l.includes("TOUT ÉTAT ATTEINT SE MONTRE"));
    expect(
      ligne,
      "la règle doit dire explicitement qu'un geste MUTANT y est soumis aussi",
    ).toMatch(/MUTANT/);
  });

  it("le juge REFUSE un état atteint par un geste mutant que rien ne montre", () => {
    // CONTRÔLE NÉGATIF de la règle ci-dessus : si ce refus n'existait pas,
    // enseigner la règle serait inutile.
    const m = modeleAvecEtapes(
      [{ geste: "saisir" }, { geste: "consulter" }],
      [
        { id: "eta_brouillon", transitions: [{ vers: "eta_valide", geste: "saisir" }] },
        { id: "eta_valide", transitions: [] },
      ],
    );
    expect(
      validerModele(m).map((d: { code: string }) => d.code),
      "« eta_valide » est atteint par saisir et aucune étape ne le consomme",
    ).toContain("MODELE_ETAT_NON_OBSERVABLE");
  });

  // ══════════════════════════════════════════════════════════════════
  // ③ UN DIAGNOSTIC DIT TOUJOURS OÙ — sinon la trace ne sert à rien.
  // ══════════════════════════════════════════════════════════════════

  it("tout diagnostic porte un chemin ET un message non vides", () => {
    // Le tir du 2026-10-15 n'a gardé que les CODES : deux fois le même code,
    // sans savoir QUEL parcours. Le moteur garde désormais `path : message`
    // — ce contrôle garantit que ce qu'il garde dit quelque chose.
    const fautif = modeleAvecEtapes([{ geste: "consulter" }, { geste: "confirmer" }]);
    const plan = ecransDe(fautif);
    const diags = [...plan.diagnostics, ...jugerPlanEcrans(plan, fautif)] as {
      code: string
      path: string
      message: string
    }[];
    expect(diags.length, "aucun diagnostic produit : le contrôle ne prouverait rien").toBeGreaterThan(0);
    for (const d of diags) {
      expect(d.path, `${d.code} sans chemin`).toBeTruthy();
      expect(d.message, `${d.code} sans message`).toBeTruthy();
    }
  });
});
