// EP-145 — LE PARTAGE AVEC DES TIERS.
//
// Apple 5.1.2(i) : divulguer avec qui les données personnelles sont partagées
// et obtenir un consentement explicite. Le contrat savait dire CE QUI est
// collecté, jamais AVEC QUI c'est partagé.
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@deribfy/capability-registry";
import {
  PARTAGE_PAR_CAPACITE,
  jugerDivulgationProeminente,
  jugerEspaceCompte,
  obligationsDuProprietaire,
  partagesDe,
  rendrePublicationMd,
  surfacesAttendues,
} from "../src/index.ts";
import type { GenreEcran } from "../src/presentation.ts";
import { L, P, air } from "./fixtures.ts";

type Air = ReturnType<typeof air>;
const codes = (f: readonly { code: string }[]): string[] => f.map((x) => x.code);

function document(
  integrations: Air["integrations"],
  genres: readonly GenreEcran[] = [],
): Air {
  const ecran = (id: string, purpose?: GenreEcran) => ({
    id,
    title: L(id),
    ...(purpose === undefined ? {} : { purpose }),
    blocks: [{ id: `blk_${id}`, blockType: "header" as const, props: P({ title: id }) }],
  });
  return air({
    screens: [ecran("scr_a"), ...genres.map((g) => ecran(`scr_${g}`, g))],
    navigation: { entryScreenId: "scr_a", routes: [{ id: "nav_a", screenId: "scr_a" }] },
    actions: genres.map((g) => ({
      id: `act_${g}`,
      name: `ouvrir ${g}`,
      trigger: { kind: "ui" as const, blockId: `blk_scr_${g}` },
      effect: { kind: "navigate" as const, screenId: `scr_${g}` },
    })),
    integrations,
    compliance: { commerceClass: "none", accountDeletionRequired: false, dataCollected: [] },
  });
}

const AVEC_PAIEMENT = document([
  { id: "intg_p", providerClass: "payments_psp", capability: "payments.psp" },
]);
const SANS_INTEGRATION = document([]);
const LOCAL_SEUL = document([
  { id: "intg_b", providerClass: "biometrics", capability: "biometrics" },
]);

describe("EP-145 · ① le partage se DÉRIVE, il ne se déclare pas", () => {
  it("brancher un paiement partage avec le prestataire, sans que personne ne le dise", () => {
    const p = partagesDe(AVEC_PAIEMENT);
    expect(p).toHaveLength(1);
    expect(p[0]!.aupresDe).toBe("payments_psp");
    expect(p[0]!.recoit).toContain("purchases");
  });

  it("aucune intégration, aucun partage", () => {
    expect(partagesDe(SANS_INTEGRATION)).toEqual([]);
  });

  it("une capacité LOCALE ne partage rien — et c'est une réponse, pas un trou", () => {
    // Le gabarit biométrique ne quitte jamais l'appareil.
    expect(PARTAGE_PAR_CAPACITE.biometrics).toEqual([]);
    expect(partagesDe(LOCAL_SEUL)).toEqual([]);
  });

  it("REPLI PRUDENT — une intégration sans capacité déclarée compte comme partage", () => {
    // Mesuré : les documents réels portent des classes libres. Sous-déclarer
    // ferait refuser l'application ; sur-déclarer alourdit une politique.
    const p = partagesDe(document([{ id: "intg_x", providerClass: "rest_api" }]));
    expect(p).toHaveLength(1);
    expect(p[0]!.recoit.length).toBeGreaterThan(0);
  });

  it("CLIQUET — la partition couvre EXACTEMENT le registre des capacités", () => {
    expect(Object.keys(PARTAGE_PAR_CAPACITE).sort())
      .toEqual(CAPABILITIES.map((c) => c.id).sort());
  });
});

describe("EP-145/147 · ② le consentement est une SURFACE — SA PLACE A CHANGÉ", () => {
  // EP-147 DÉFAIT ce qu'EP-145 avait posé : le consentement était rangé parmi
  // les surfaces de l'espace compte. La lecture complète de la politique
  // Google dit l'inverse — « must be displayed in the normal usage of the app
  // and not require the user to navigate into a menu or settings ». Une
  // correction fondée sur la source prime sur une décision fondée sur une
  // lecture partielle, et ces tests changent avec elle.
  const avecPartage = (genres: readonly GenreEcran[]): Air =>
    document([{ id: "intg_p", providerClass: "payments_psp", capability: "payments.psp" }], genres);

  it("le consentement N'EST PLUS une surface de l'espace compte", () => {
    expect(surfacesAttendues(false, true)).not.toContain("privacy_consent");
    // Le juge de l'espace compte ne le réclame plus.
    const f = jugerEspaceCompte(avecPartage(surfacesAttendues(false, true)), { ecransDIdentite: [] });
    expect(codes(f)).toEqual([]);
  });

  it("un partage SANS divulgation est refusé, par l'autre juge", () => {
    const f = jugerDivulgationProeminente(avecPartage([]), {
      avecPartage: true,
      ecransDIdentite: [],
    });
    expect(codes(f)).toEqual(["PRESENTATION_DIVULGATION_ABSENTE"]);
    expect(f[0]!.message).toContain("normal usage");
  });

  it("sans partage, un écran de consentement est REFUSÉ — consentir à rien", () => {
    // `privacy_consent` a quitté SURFACES_DE_COMPTE : le type des genres de
    // cette table ne le porte plus, alors que le SCHÉMA, lui, le porte.
    const f = jugerDivulgationProeminente(document([], ["privacy_consent" as GenreEcran]), {
      avecPartage: false,
      ecransDIdentite: [],
    });
    expect(codes(f)).toEqual(["PRESENTATION_CONSENTEMENT_SANS_OBJET"]);
  });

  it("LE RETRAIT du consentement, lui, vit bien dans le compte", () => {
    // Reprendre son accord est un réglage durable, pas une demande
    // ponctuelle : 5.1.1(ii) exige qu'il soit « easily accessible ».
    expect(surfacesAttendues(false, true)).toContain("consent_withdraw");
  });
});

describe("EP-145 · ③ ce qui relève du propriétaire est DIT", () => {
  it("les tiers et ce qu'ils reçoivent sont rendus au propriétaire", () => {
    const o = obligationsDuProprietaire(AVEC_PAIEMENT);
    const divulgation = o.find((x) => x.quoi.includes("prestataires"));
    expect(divulgation).toBeDefined();
    expect(divulgation!.ou).toBe("fournir");
    expect(divulgation!.matiere!.some((m) => m.startsWith("payments_psp"))).toBe(true);
  });

  it("le moteur ne NOMME aucune société — il ne connaît que des classes", () => {
    const md = rendrePublicationMd(AVEC_PAIEMENT);
    // « Google » et « Apple » apparaissent dans les SOURCES citées : nommer la
    // plateforme qui exige une règle n'est pas nommer un destinataire des
    // données. Ce que le moteur ne doit jamais faire, c'est désigner le
    // prestataire de CETTE application — il ne connaît que des classes.
    for (const societe of ["Stripe", "PayPal", "Supabase", "Firebase", "Adyen"]) {
      expect(md.includes(societe), societe).toBe(false);
    }
    expect(md).toContain("vous seul les connaissez");
  });

  it("sans partage, aucune ligne de divulgation", () => {
    expect(obligationsDuProprietaire(SANS_INTEGRATION).some((x) => x.quoi.includes("prestataires")))
      .toBe(false);
  });
});
