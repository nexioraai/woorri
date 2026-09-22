// EP-180 — LE MOTEUR CONNAÎT LA RÉPONSE : IL LA POSE.
//
// Douze transmissions ont montré qu'une treizième ne changerait rien. Trois
// runs de suite ont écrit « Mon compte », « Rechercher », « Rechercher » là où
// la primitive impose « Accueil » — et depuis EP-169 le juge le disait au
// PREMIER appel sur douze. Le verdict arrivait ; il n'était pas suivi.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProjectAir } from "@deribfy/air-schema";
import { LIBELLES_PRIMITIFS, jugerLibellesPrimitifs } from "@deribfy/execution-contract";
import { emitProject } from "../src/emit-project.ts";

import { requis } from "./helpers.ts";
const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
// UNE SEULE affirmation de type, ici, à la FRONTIÈRE du fichier — et elle ne
// décide de rien : `emitProject` revalide le document pour de bon. Ce qui
// disparaît avec elle, ce sont les 29 accès `any` qui suivaient, où le
// compilateur ne vérifiait plus RIEN — ni le nom d'un champ, ni sa forme.
const charger = (motif: string): ProjectAir =>
  JSON.parse(
    readFileSync(
      join(RES, requis(readdirSync(RES).find((f) => f.includes(motif)), "résultat de run « " + motif + " »")),
      "utf8",
    ),
  ) as ProjectAir;

// DEUX TAILLES, et désignées par leur HORODATAGE — jamais « le dernier »
// (L-179-B : une fixture doit désigner un cas, pas une date).
const SAHEL = charger("marche-immobilier.2026-09-13T18-29-46");
const KAVIVA = charger("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2");

// EP-191 — AUCUNE OPTION N'EST PLUS PASSÉE, ET C'EST TOUT L'OBJET.
// La version précédente de ce fichier FOURNISSAIT `ecransDIdentite` au
// compilateur ; les neuf appelants réels ne le faisaient pas. Seize tests
// verts mesuraient donc une chaîne qui n'existait nulle part ailleurs.
// Ce qui suit appelle `emitProject` EXACTEMENT comme la vraie chaîne l'appelle.
const libelles = (doc: ProjectAir): string[] => {
  const nav = emitProject(doc).files.get("nav.data.ts") ?? "";
  return [...nav.matchAll(/"label":"([^"]+)"/g)].map((m) => requis(m[1], "m1"));
};

/** Pose le genre AU DOCUMENT — le seul canal désormais. */
const avecCompte = (doc: ProjectAir, screenId: string): ProjectAir => ({
  ...doc,
  screens: doc.screens.map((e) =>
    e.id === screenId ? { ...e, purpose: "account_home" } : e,
  ),
});

describe("EP-180 · les libellés primitifs sont ÉMIS", () => {
  it("L'ACCUEIL PORTE SON LIBELLÉ, quoi qu'ait écrit le générateur", () => {
    // MESURÉ sur le document du run EP-178 : le générateur avait écrit
    // « Rechercher » en première destination.
    const ecrit = (SAHEL.navigation.primary?.destinations ?? [])
      .map((d: { label?: { text: string }[] }) => (d.label ?? []).map((l) => l.text).join(""));
    expect(ecrit[0], "la fixture ne porte plus le cas").not.toBe(LIBELLES_PRIMITIFS.accueil);
    expect(libelles(SAHEL)).toContain(LIBELLES_PRIMITIFS.accueil);
  });

  it("LE COMPTE AUSSI — quand le DOCUMENT porte le genre `account_home`", () => {
    // Un écran qui EST une destination de la barre — sinon le libellé ne
    // s'applique à rien et le test ne prouverait rien.
    const entree = KAVIVA.navigation.entryScreenId;
    const cibles = (KAVIVA.navigation.primary?.destinations ?? []).map(
      (d: { routeId: string }) =>
        (KAVIVA.navigation.routes as { id: string; screenId: string }[]).find((r) => r.id === d.routeId)
          ?.screenId,
    );
    const compte = requis(cibles.find((id: string | undefined) => id !== undefined && id !== entree), "findidstringundefinedidundefinedidentree");
    // AVANT : le document ne porte pas le genre, donc AUCUN « Compte ».
    expect(libelles(KAVIVA)).not.toContain(LIBELLES_PRIMITIFS.compte);
    // APRÈS : le genre est au document, et le compilateur le lit SEUL.
    expect(libelles(avecCompte(KAVIVA, compte))).toContain(LIBELLES_PRIMITIFS.compte);
  });

  it("LE CLIQUET D'EP-191 — le compilateur n'accepte plus qu'on lui DISE le compte", () => {
    // LE DÉFAUT QUE CE TEST GARDE, ET IL A ÉTÉ RÉEL : tant que le compte
    // s'annonçait par une OPTION, neuf appelants sur neuf l'omettaient et le
    // libellé n'était jamais posé — quatre runs durant, jusque sur l'appareil.
    // Le remède n'est pas de brancher l'option : c'est qu'il n'y ait plus
    // d'option à brancher. Si `EmitOptions` en regagne une, ce test tombe.
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    const opts = src.slice(src.indexOf("interface EmitOptions"), src.indexOf("function emitSlotRegistry"));
    expect(opts, "le compte redevient une option que l'appelant peut taire")
      .not.toMatch(/readonly ecransDIdentite/);
    // Et la dérivation ne lit QUE le document.
    const helper = src.slice(src.indexOf("function libellePrimitif"), src.indexOf("export function emitProject"));
    expect(helper).toContain("account_home");
    expect(helper, "le compilateur relit une option").not.toMatch(/\boptions\b/);
  });

  it("LA GARDE — les destinations du DOMAINE gardent leur libellé libre", () => {
    // Sans elle, la barre deviendrait un gabarit, et c'est exactement ce que
    // l'App Store punit sous 4.3. Une app à plusieurs destinations doit
    // garder intacts tous ses libellés du milieu.
    const dests = SAHEL.navigation.primary?.destinations ?? [];
    expect(dests.length, "fixture à moins de 3 destinations").toBeGreaterThanOrEqual(3);
    const ecrits = dests.map((d: { label?: { text: string }[] }) =>
      (d.label ?? []).map((l) => l.text).join(""),
    );
    const rendus = libelles(SAHEL);
    // Tous SAUF l'entrée sont inchangés.
    for (const l of ecrits.slice(1)) {
      expect(rendus, `libellé de domaine écrasé : ${l}`).toContain(l);
    }
  });

  it("SANS GENRE AU DOCUMENT, AUCUN COMPTE N'EST FABRIQUÉ — le cas de Sahel Immo", () => {
    // Le document de ce run ne déclare aucun `account_home` : l'app n'a pas
    // d'espace compte, et ne doit pas en gagner un de force. L'ignorance ne
    // fabrique rien.
    expect((SAHEL.screens as { purpose?: string }[]).some((e) => e.purpose === "account_home"))
      .toBe(false);
    expect(libelles(SAHEL)).not.toContain(LIBELLES_PRIMITIFS.compte);
  });

  it("LE JUGE DEVIENT MUET SUR LES PRIMITIVES — sinon la correction n'a pas transmis", () => {
    // Le document émis ne peut plus porter le défaut : on le vérifie sur
    // l'artefact, pas sur l'intention.
    const nav = emitProject(SAHEL).files.get("nav.data.ts") ?? "";
    expect(nav).toContain(`"label":"${LIBELLES_PRIMITIFS.accueil}"`);
    // Et le juge, rejoué sur le document SOURCE, parle encore — c'est normal :
    // il juge ce que le générateur a écrit, pas ce que le moteur a émis.
    // La correction vit dans l'ÉMISSION, et c'est elle qui atteint l'écran.
    const ctx = { entryScreenId: SAHEL.navigation.entryScreenId, ecransDIdentite: [] };
    expect(jugerLibellesPrimitifs(SAHEL as never, ctx).length).toBeGreaterThan(0);
  });

  it("RÈGLE D'EP-132 — par quel AUTRE chemin un libellé primitif s'écrirait-il ?", () => {
    // Le chemin de fuite : un second endroit qui pose un libellé de
    // destination sans passer par `libellePrimitif`. Il n'y en a qu'UN, et
    // le cliquet le tient.
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    const poses = [...src.matchAll(/resolveLocalized\(d\.label/g)].length;
    expect(poses, "un second site pose un libellé de destination").toBe(1);
    expect(src).toContain("libellePrimitif(route.screenId, air)");
    // Et le compilateur ne recopie JAMAIS un libellé primitif en dur.
    const helper = src.slice(src.indexOf("function libellePrimitif"), src.indexOf("export function emitProject"));
    expect(helper, "libellé recopié en dur").not.toMatch(/"(Accueil|Compte)"/);
    expect(helper).toContain("LIBELLES_PRIMITIFS");
  });
});
