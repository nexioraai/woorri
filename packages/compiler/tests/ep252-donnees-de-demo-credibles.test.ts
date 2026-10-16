/**
 * EP-252 · LES DONNÉES DE DÉMONSTRATION NE MENTENT PLUS SUR LEUR MÉTIER.
 *
 * ── CE QUE LE PROPRIÉTAIRE A VU, ET QUI ÉTAIT JUSTE.
 *
 * Sur l'écran d'une application de tontine camerounaise, le 2026-10-16 :
 * une amende disciplinaire de « 23 FCFA », une cotisation de « 897,31 FCFA »,
 * et sept mouvements sur vingt-quatre datés dans le FUTUR — le plus lointain
 * au 21 décembre.
 *
 * Trois défauts dans la même liste, et deux d'entre eux sont du MOTEUR.
 *
 * ── CE QUE LE MOTEUR PEUT SAVOIR, ET CE QU'IL NE PEUT PAS.
 *
 * ① LES SOUS-UNITÉS D'UNE DEVISE SE SAVENT. Le document déclare `unit`
 *    (code ISO 4217) et `Intl` tient de CLDR le nombre de décimales : zéro
 *    pour XAF et XOF, deux pour EUR, trois pour TND. « 897,31 FCFA » n'est
 *    pas une valeur improbable — c'est une valeur IMPOSSIBLE.
 *
 * ② LE SENS DU TEMPS D'UN JOURNAL SE SAIT. L'entité déclare `appendOnly` —
 *    le journal qu'on ne réécrit pas. Ce qui ne se réécrit pas ne
 *    s'anticipe pas non plus : c'est la même propriété, lue dans l'autre
 *    sens. Ailleurs — une échéance, un rendez-vous — le futur reste
 *    légitime et le tirage ne change pas.
 *
 * ③ L'ÉCHELLE, ELLE, RESTE INDEVINABLE, et ce fichier ne prétend pas le
 *    contraire. Trois pièces, 120 m², 45 000 000 FCFA n'ont aucune loi
 *    commune, et le contrat ne porte aucune borne. La réponse est
 *    `demoValues` dans le DOCUMENT — c'est ce qui a été fait pour la
 *    tontine, avec les chiffres du cahier des charges (cotisation
 *    10 000 XAF, pas d'enchère 500 XAF, pénalité 2 %/jour).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { migrateAirDocument, type ProjectAir } from "@deribfy/air-schema";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..");

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(readFileSync(join(RACINE, "slices/tontine/tontine.air.json"), "utf8")),
  );

interface Ligne {
  id: string;
  values: Record<string, string>;
}

const fixtures = async (air: ProjectAir): Promise<Record<string, Ligne[]>> => {
  const { compileProject } = await import("../src/index.ts");
  const demo = compileProject(air).files.get("demo.data.ts") ?? "";
  const m = /demoData[^=]*= (\{[\s\S]*\});\s*$/mu.exec(demo);
  expect(m, "les données de démonstration ne sont plus lisibles").not.toBeNull();
  return JSON.parse(m?.[1] ?? "{}") as Record<string, Ligne[]>;
};

describe("EP-252 · des montants qui existent, des dates qui ont eu lieu", () => {
  it("① AUCUN MONTANT EN XAF NE PORTE DE CENTIMES — ils n existent pas", async () => {
    const air = document();
    const data = await fixtures(air);

    let montantsVus = 0;
    for (const e of air.entities) {
      const lignes = data[e.id] ?? [];
      for (const f of e.fields) {
        if (f.unit !== "XAF") continue;
        for (const l of lignes) {
          const v = l.values[f.id];
          if (v === undefined || v === "") continue;
          montantsVus += 1;
          expect(
            v,
            `« ${f.name} » vaut ${v} : le franc CFA n a pas de centimes`,
          ).not.toMatch(/\./u);
        }
      }
    }
    // Sans ce compte, un document sans montant rendrait le contrôle vert
    // sans rien avoir mesuré.
    expect(montantsVus, "aucun montant XAF mesuré").toBeGreaterThan(20);
  });

  it("LA RÈGLE VIENT DE LA DEVISE, pas d une préférence — EUR garde ses centimes", async () => {
    // ── LE CONTRÔLE QUI EMPÊCHE DE CROIRE À UNE RÈGLE GÉNÉRALE.
    //
    // Si le moteur avait simplement cessé de produire des décimales, ce
    // serait un autre défaut : un prix en euros doit en porter deux. On
    // bascule donc la MÊME application en euros et on vérifie l inverse.
    const air = JSON.parse(JSON.stringify(document())) as ProjectAir;
    for (const e of air.entities) {
      for (const f of e.fields) {
        if (f.unit === "XAF") (f as { unit?: string }).unit = "EUR";
        // Les valeurs du document l emportent sur le tirage : on les retire
        // pour mesurer le TIRAGE, qui est ce que cette règle gouverne.
        delete (f as { demoValues?: readonly string[] }).demoValues;
      }
    }
    const data = await fixtures(air);
    const avecCentimes = (data.ent_transactions ?? []).filter((l) =>
      /\.\d{2}$/u.test(l.values.fld_transactions_montant_base ?? ""),
    );
    expect(
      avecCentimes.length,
      "en euros, les montants ont perdu leurs centimes : la règle n est pas celle de la devise",
    ).toBeGreaterThan(0);
  });

  it("② UN JOURNAL EN AJOUT SEUL NE PORTE QUE DU PASSÉ", async () => {
    const air = document();
    const data = await fixtures(air);

    const journaux = air.entities.filter((e) => e.appendOnly === true);
    expect(journaux.length, "aucun journal dans ce document : rien n est mesuré").toBeGreaterThan(
      0,
    );

    // La borne du moteur, pas l heure courante : une fixture est
    // déterministe et ne doit pas dépendre du jour où le test tourne.
    const BORNE = Date.UTC(2026, 0, 1);
    let datesVues = 0;
    for (const e of journaux) {
      for (const f of e.fields) {
        if (f.type !== "datetime") continue;
        for (const l of data[e.id] ?? []) {
          const v = l.values[f.id];
          if (v === undefined || v === "") continue;
          datesVues += 1;
          expect(
            Date.parse(v),
            `« ${e.id}.${f.name} » = ${v} : une écriture à venir dans un journal`,
          ).toBeLessThanOrEqual(BORNE);
        }
      }
    }
    expect(datesVues, "aucune date de journal mesurée").toBeGreaterThan(10);
  });

  it("AILLEURS LE FUTUR RESTE LÉGITIME — une échéance n est pas une écriture", async () => {
    // Sans ce contrôle, on aurait pu repousser TOUTES les dates dans le
    // passé et appeler ça une correction. Une date de prochaine séance, un
    // rendez-vous, une échéance : le futur y a sa place.
    const air = document();
    const data = await fixtures(air);
    const ordinaires = air.entities.filter((e) => e.appendOnly !== true);
    const BORNE = Date.UTC(2026, 0, 1);

    const futures = ordinaires.flatMap((e) =>
      e.fields
        .filter((f) => f.type === "datetime")
        .flatMap((f) =>
          (data[e.id] ?? [])
            .map((l) => l.values[f.id])
            .filter((v): v is string => v !== undefined && v !== "")
            .filter((v) => Date.parse(v) > BORNE),
        ),
    );
    expect(
      futures.length,
      "toutes les dates ont été repoussées dans le passé, y compris là où le futur est juste",
    ).toBeGreaterThan(0);
  });

  it("③ LES ORDRES DE GRANDEUR VIENNENT DU DOCUMENT, pas du moteur", async () => {
    // Le cahier V1.3 §4 : cotisation de base 10 000 XAF. Le moteur ne peut
    // pas le deviner — il le LIT, parce que le document le porte.
    const air = document();
    const coti = air.entities
      .find((e) => e.id === "ent_tontines")
      ?.fields.find((f) => f.id === "fld_tontines_montant_cotisation");
    expect(coti?.demoValues, "le montant de cotisation n a aucune valeur du cahier").toBeDefined();
    expect(coti?.demoValues ?? [], "10 000 XAF — le chiffre du cahier — n y est pas").toContain(
      "10000",
    );

    // ET CES VALEURS ARRIVENT À L ÉCRAN, pas seulement au document.
    const data = await fixtures(air);
    const vus = (data.ent_tontines ?? []).map((l) => l.values.fld_tontines_montant_cotisation);
    expect(vus, "la valeur du document n atteint pas les fixtures").toContain("10000");
    // Et plus aucun des montants à trois chiffres aléatoires d avant.
    for (const v of vus) {
      expect(Number(v), `cotisation de ${v} XAF : hors d échelle pour une tontine`).toBeGreaterThan(
        999,
      );
    }
  });

  it("AUCUN CODE DE BASE NE S AFFICHE — le validateur l a déjà refusé une fois", () => {
    // ── CE QUE CE CONTRÔLE RACONTE.
    //
    // En remplissant les emplacements libres de l écran « Mes tontines », la
    // fréquence et le statut allaient sortir en « MENSUEL » et « ACTIVE ».
    // Le validateur a REFUSÉ le document — AIR_ENUM_CODE_MONTRE — exactement
    // le défaut que le propriétaire avait vu le matin même avec
    // « DISTRIBUTION_INTERETS ».
    //
    // On tient donc ici ce que le validateur a imposé : toute énumération
    // AFFICHÉE porte ses libellés.
    const air = document();
    const tontines = air.entities.find((e) => e.id === "ent_tontines");
    for (const nom of ["fld_tontines_frequence", "fld_tontines_statut"]) {
      const f = tontines?.fields.find((x) => x.id === nom);
      expect(f?.enumLabels, `« ${nom} » affiché sans libellés : un code irait à l écran`)
        .toBeDefined();
      expect((f?.enumLabels ?? []).length, `« ${nom} » : libellés incomplets`).toBe(
        (f?.enumValues ?? []).length,
      );
    }
  });
});
