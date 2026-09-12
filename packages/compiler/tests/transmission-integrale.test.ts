// EP-122 · ① — CE QUE LE PLAN DÉCIDE, IL LE TRANSMET : LE PRINCIPE.
//
// Mesuré (EP-121) : 2 propriétés de surface sur 11 étaient transmises ; les 9
// autres étaient décidées et muettes, et quatre symptômes d'usage en
// découlaient. Aucune raison de principe ne justifiait ce silence — la
// correction est donc le PRINCIPE, pas l'énumération des quatre cas, et le
// CLIQUET ci-dessous rend la septième occurrence du motif impossible.
// Preuve sur kaviva (16 écrans).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  decisionDeSurface,
  ecransDe,
  obligationsPrescriptives,
  PROPRIETES_SURFACE_NON_TRANSMISES,
  surfacesDe,
  type ModeleMetier,
} from "../../../benchmarks/air-emission/modele-metier.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, "..", "..", "..");
const lire = (f: string): ModeleMetier => {
  const brut = JSON.parse(readFileSync(join(R, "benchmarks", "air-emission", "results", f), "utf8")) as {
    modele?: ModeleMetier;
  };
  return (brut.modele ?? brut) as ModeleMetier;
};
const KAVIVA = lire("kaviva-spa.2026-09-11T23-00-50-047Z.modele-p0-t1.air.json");

describe("LE CLIQUET — toute propriété décidée est transmise, ou exclue AVEC SA RAISON", () => {
  it("partition exhaustive : aucune propriété de surface ne peut rester muette en silence", () => {
    const plan = ecransDe(KAVIVA);
    const texte = obligationsPrescriptives("ecrans", KAVIVA, plan);
    const surfaces = surfacesDe(KAVIVA);
    expect(surfaces.length).toBeGreaterThan(0);
    for (const sf of surfaces) {
      for (const cle of Object.keys(sf)) {
        const exclue = cle in PROPRIETES_SURFACE_NON_TRANSMISES;
        if (exclue) {
          // une exclusion PORTE SA RAISON — sinon c'est un oubli déguisé.
          expect(
            String((PROPRIETES_SURFACE_NON_TRANSMISES)[cle]).length,
            `${cle} exclue sans raison`,
          ).toBeGreaterThan(10);
        } else {
          expect(texte, `propriété décidée mais MUETTE : ${cle}`).toContain(`${cle}=`);
        }
      }
    }
  });

  it("une propriété AJOUTÉE demain fait échouer la batterie (la 7e occurrence est impossible)", () => {
    const sf = { ...surfacesDe(KAVIVA)[0], nouvelleDecision: "valeur" } as Record<string, unknown>;
    // la sérialisation la prend AUTOMATIQUEMENT : rien à ajouter à la main.
    expect(decisionDeSurface(sf as never)).toContain("nouvelleDecision=valeur");
  });
});

describe("les trois décisions autrefois muettes (EP-121), désormais dites", () => {
  it("① CHROME : quels écrans le portent, et surtout lesquels ne le portent PAS", () => {
    const plan = ecransDe(KAVIVA);
    const texte = obligationsPrescriptives("ecrans", KAVIVA, plan);
    expect(texte).toContain("PORTE LE CHROME");
    expect(texte).toContain("SANS chrome");
    expect(texte).toContain("nulle part ailleurs");
    // la barre primaire aussi : les écrans de flux ne la portent pas.
    expect(texte).toContain("showsPrimaryNav: false");
  });

  it("② PORTÉES : instance:X voyage, comme les portées de collection depuis EP-118", () => {
    const texte = obligationsPrescriptives("ecrans", KAVIVA, ecransDe(KAVIVA));
    const instances = surfacesDe(KAVIVA).filter((s) => s.portee.startsWith("instance:"));
    expect(instances.length).toBeGreaterThan(0);
    for (const s of instances) expect(texte).toContain(`portee=${s.portee}`);
  });

  it("③ ATTRIBUTS : tous nommés, et déclarés obligatoires (4 sur 7 émis, mesuré)", () => {
    const texte = obligationsPrescriptives("entites", KAVIVA, ecransDe(KAVIVA));
    for (const c of KAVIVA.concepts.filter((x) => x.donnees)) {
      for (const a of c.attributs ?? []) expect(texte, `${c.id}.${a.id}`).toContain(a.id);
    }
    expect(texte).toContain("TOUS OBLIGATOIRES");
  });

  it("les clauses EP-105/113/115/118 et la gate EP-102 ne bougent pas", () => {
    const juges = readFileSync(join(R, "benchmarks", "air-emission", "acceptation.mjs"), "utf8");
    const emitV3 = readFileSync(join(R, "benchmarks", "air-emission", "emit-v3.mjs"), "utf8");
    expect(juges).toContain("INDISSOCIABLES");
    expect(juges).toContain("champs éligibles");
    expect(emitV3).toContain("elargit(perimetreAvant, perimetreApres)");
    const actions = obligationsPrescriptives("actions", KAVIVA, ecransDe(KAVIVA));
    expect(actions).toContain("DEPUIS l'écran");
    expect(obligationsPrescriptives("ecrans", KAVIVA, ecransDe(KAVIVA))).toContain("PORTÉES OBLIGATOIRES");
  });
});
