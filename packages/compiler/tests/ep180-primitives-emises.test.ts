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
import { LIBELLES_PRIMITIFS, jugerLibellesPrimitifs } from "@deribfy/execution-contract";
import { emitProject } from "../src/emit-project.ts";

const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RES = join(R, "benchmarks", "air-emission", "results");
const charger = (motif: string): Record<string, any> =>
  JSON.parse(readFileSync(join(RES, readdirSync(RES).find((f) => f.includes(motif))!), "utf8"));

// DEUX TAILLES, et désignées par leur HORODATAGE — jamais « le dernier »
// (L-179-B : une fixture doit désigner un cas, pas une date).
const SAHEL = charger("marche-immobilier.2026-09-13T18-29-46");
const KAVIVA = charger("kaviva-spa.2026-09-11T23-00-50-047Z.attempt2");

const libelles = (doc: Record<string, any>, ecransDIdentite?: readonly string[]): string[] => {
  const emis = emitProject(doc, undefined, ecransDIdentite === undefined ? {} : { ecransDIdentite });
  const nav = emis.files.get("nav.data.ts") ?? "";
  return [...nav.matchAll(/"label":"([^"]+)"/g)].map((m) => m[1]!);
};

describe("EP-180 · les libellés primitifs sont ÉMIS", () => {
  it("L'ACCUEIL PORTE SON LIBELLÉ, quoi qu'ait écrit le générateur", () => {
    // MESURÉ sur le document du run EP-178 : le générateur avait écrit
    // « Rechercher » en première destination.
    const ecrit = (SAHEL.navigation.primary?.destinations ?? [])
      .map((d: { label?: { text: string }[] }) => (d.label ?? []).map((l) => l.text).join(""));
    expect(ecrit[0], "la fixture ne porte plus le cas").not.toBe(LIBELLES_PRIMITIFS.accueil);
    expect(libelles(SAHEL)).toContain(LIBELLES_PRIMITIFS.accueil);
  });

  it("LE COMPTE AUSSI — quand le modèle dit quels écrans portent l'identité", () => {
    // Un écran qui EST une destination de la barre — sinon le libellé ne
    // s'applique à rien et le test ne prouverait rien.
    const entree = KAVIVA.navigation.entryScreenId as string;
    const cibles = (KAVIVA.navigation.primary?.destinations ?? []).map(
      (d: { routeId: string }) =>
        (KAVIVA.navigation.routes as { id: string; screenId: string }[]).find((r) => r.id === d.routeId)
          ?.screenId,
    );
    const compte = cibles.find((id: string | undefined) => id !== undefined && id !== entree)!;
    expect(libelles(KAVIVA, [compte])).toContain(LIBELLES_PRIMITIFS.compte);
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

  it("SANS ÉCRANS D'IDENTITÉ, AUCUN COMPTE N'EST FABRIQUÉ — le cas de Sahel Immo", () => {
    // Le modèle de ce run ne porte AUCUN concept d'identité : l'app n'a pas
    // d'espace compte, et ne doit pas en gagner un de force.
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
    const ctx = { entryScreenId: SAHEL.navigation.entryScreenId as string, ecransDIdentite: [] };
    expect(jugerLibellesPrimitifs(SAHEL as never, ctx).length).toBeGreaterThan(0);
  });

  it("RÈGLE D'EP-132 — par quel AUTRE chemin un libellé primitif s'écrirait-il ?", () => {
    // Le chemin de fuite : un second endroit qui pose un libellé de
    // destination sans passer par `libellePrimitif`. Il n'y en a qu'UN, et
    // le cliquet le tient.
    const src = readFileSync(join(R, "packages", "compiler", "src", "emit-project.ts"), "utf8");
    const poses = [...src.matchAll(/resolveLocalized\(d\.label/g)].length;
    expect(poses, "un second site pose un libellé de destination").toBe(1);
    expect(src).toContain("libellePrimitif(route.screenId, air, options)");
    // Et le compilateur ne recopie JAMAIS un libellé primitif en dur.
    const helper = src.slice(src.indexOf("function libellePrimitif"), src.indexOf("export function emitProject"));
    expect(helper, "libellé recopié en dur").not.toMatch(/"(Accueil|Compte)"/);
    expect(helper).toContain("LIBELLES_PRIMITIFS");
  });
});
