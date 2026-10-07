// ============================================================
// CLIQUET — UN SLUG N'EST PAS UN NOM DE BASE DE DONNÉES.
//
// Le nom de base était le slug, recopié tel quel. Un slug accepte le tiret, et
// le propriétaire a demandé « Tontine.SY » — avec un point. Les deux cassent :
// en PostgreSQL, `tontine-sy` et `Tontine.SY` ne sont pas des identifiants
// valides sans guillemets, et un identifiant cité doit l'être PARTOUT, dans
// chaque requête et chaque migration. Le point est pire : il sépare le schéma
// du nom, donc `Tontine.SY` désigne la table `SY` du schéma `Tontine`.
//
// On ne refuse pas le nom choisi — il reste celui du PRODUIT. On refuse de le
// recopier là où il ne peut pas vivre.
// ============================================================
import { describe, expect, it } from "vitest";
import { identifiantSql } from "../src/emit-spring.ts";

/** Ce que PostgreSQL accepte sans guillemets. */
const SUR = /^[a-z_][a-z0-9_]*$/;

describe("CLIQUET — l'identifiant de base est toujours utilisable sans guillemets", () => {
  it("LE CAS DU PROPRIÉTAIRE : un point ne survit pas", () => {
    expect(identifiantSql("Tontine.SY")).toBe("tontine_sy");
  });

  it("le tiret d'un slug devient un tiret bas", () => {
    expect(identifiantSql("tontine-sy")).toBe("tontine_sy");
  });

  it("UN CHIFFRE EN TÊTE EST PRÉFIXÉ — sinon ce n'est pas un identifiant", () => {
    expect(identifiantSql("2048-jeu")).toBe("app_2048_jeu");
  });

  it("les accents sont réduits, jamais laissés tels quels", () => {
    expect(identifiantSql("Café Déli")).toBe("cafe_deli");
  });

  it("un slug vide ou entièrement illégal rend quand même un identifiant", () => {
    for (const cas of ["", "---", "...", "###"]) {
      expect(identifiantSql(cas), cas).toMatch(SUR);
    }
  });

  it("TOUT slug plausible rend un identifiant sûr", () => {
    const cas = [
      "resto-riche", "SGD_Dougouma", "boutique.en.ligne", "é", "a--b__c",
      "APP", "9", "mon app 2", "tontine-sy", "Tontine.SY",
    ];
    for (const c of cas) expect(identifiantSql(c), c).toMatch(SUR);
  });

  it("deux slugs différents peuvent converger — et c'est assumé", () => {
    // `tontine-sy` et `Tontine.SY` désignent la MÊME application : c'est
    // voulu. Ce test existe pour que la convergence soit une décision lue,
    // et non une surprise découverte le jour d'une collision.
    expect(identifiantSql("tontine-sy")).toBe(identifiantSql("Tontine.SY"));
  });
});
