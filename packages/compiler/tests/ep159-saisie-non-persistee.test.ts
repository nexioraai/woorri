// EP-159 — LES CHAMPS QUI EXISTENT À LA SAISIE ET PAS EN BASE.
//
// Une confirmation de mot de passe n'existe dans aucune base : on ne stocke
// pas deux fois le même secret. `fieldIds` ne pouvait donc pas la porter, et
// le contrat ne savait pas l'exprimer — mesuré avant d'écrire.
//
// L'EXTENSION PORTE SUR LA FAMILLE, jamais sur un cas : confirmation,
// acceptation, vérification partagent la même structure — une saisie
// CONTRAINTE et NON PERSISTÉE.
import { describe, expect, it } from "vitest";
import { getBlock } from "@deribfy/blocks/registry";
import { requis } from "./helpers.ts";
import {
  ROLES_SAISIE,
  champsDeSaisie,
  saisieAcceptable,
} from "../runtime/champs-de-saisie.ts";

describe("EP-159 · la famille est un vocabulaire FERMÉ", () => {
  it("trois rôles, et le contrat les porte tous", () => {
    expect([...ROLES_SAISIE]).toEqual(["confirmation", "acceptation", "verification"]);
    const forme = requis(getBlock("form"), "getBlockform").propsSchema.safeParse({
      fieldIds: ["fld_x"],
      submitLabel: "Créer",
      saisieRoles: [...ROLES_SAISIE],
      saisieCibles: ["fld_x", "", ""],
    });
    expect(forme.success).toBe(true);
  });

  it("un rôle inventé est REFUSÉ par le contrat", () => {
    const r = requis(getBlock("form"), "getBlockform").propsSchema.safeParse({
      fieldIds: ["fld_x"],
      submitLabel: "Créer",
      saisieRoles: ["captcha"],
    });
    expect(r.success).toBe(false);
  });
});

describe("EP-159 · un formulaire de création porte la confirmation", () => {
  it("la confirmation vise le champ qu'elle confirme", () => {
    const c = champsDeSaisie(["confirmation"], ["fld_mot_de_passe"], ["fld_mot_de_passe"]);
    expect(c).toHaveLength(1);
    expect(requis(c[0], "c0").role).toBe("confirmation");
    expect(requis(c[0], "c0").cible).toBe("fld_mot_de_passe");
  });

  it("elle HÉRITE du secret de ce qu'elle confirme — jamais déclaré", () => {
    // Masquer ou non se DÉDUIT du champ visé : une confirmation de mot de
    // passe est masquée, une confirmation d'adresse ne l'est pas.
    expect(requis(champsDeSaisie(["confirmation"], ["fld_mdp"], ["fld_mdp"])[0], "hampsDeSaisieconfirmationfld_mdpfld_mdp0").secret).toBe(true);
    expect(requis(champsDeSaisie(["confirmation"], ["fld_email"], ["fld_mdp"])[0], "mpsDeSaisieconfirmationfld_emailfld_mdp0").secret).toBe(false);
  });

  it("elle n'est acceptée QUE si les deux saisies coïncident", () => {
    const c = requis(champsDeSaisie(["confirmation"], ["fld_mdp"], ["fld_mdp"])[0], "hampsDeSaisieconfirmationfld_mdpfld_mdp0");
    expect(saisieAcceptable(c, "secret123", "secret123")).toBe(true);
    expect(saisieAcceptable(c, "secret124", "secret123")).toBe(false);
  });
});

describe("EP-159 · un formulaire de connexion n'en porte pas", () => {
  it("sans rôle déclaré, aucun champ de saisie n'apparaît", () => {
    expect(champsDeSaisie(undefined, undefined)).toEqual([]);
    expect(champsDeSaisie([], [])).toEqual([]);
  });

  it("le contrat n'en exige aucun — la connexion reste deux champs", () => {
    const r = requis(getBlock("form"), "getBlockform").propsSchema.safeParse({
      fieldIds: ["fld_email", "fld_mdp"],
      submitLabel: "Se connecter",
    });
    expect(r.success).toBe(true);
  });
});

describe("EP-159 · les deux autres membres de la famille", () => {
  it("une acceptation ne vise AUCUN champ — et c'est normal", () => {
    const c = requis(champsDeSaisie(["acceptation"], [""])[0], "champsDeSaisieacceptation0");
    expect(c.cible).toBeUndefined();
    expect(c.secret).toBe(false);
    expect(saisieAcceptable(c, "true", "")).toBe(true);
    expect(saisieAcceptable(c, "false", "")).toBe(false);
  });

  it("une vérification exige une valeur, et ne PROMET pas plus", () => {
    // La comparaison à un secret externe se fait ailleurs : prétendre la
    // faire ici serait mentir sur ce que le moteur vérifie.
    const c = requis(champsDeSaisie(["verification"], [""])[0], "champsDeSaisieverification0");
    expect(saisieAcceptable(c, "123456", "")).toBe(true);
    expect(saisieAcceptable(c, "  ", "")).toBe(false);
  });
});

describe("EP-159 · rien n'est déclaré sans être consommé", () => {
  it("un champ de saisie pure n'apparaît dans AUCUNE entité", () => {
    // C'est sa définition : il n'a pas d'identifiant de champ d'entité, et
    // `saisieSeule` le marque pour que l'écriture l'ignore.
    const c = requis(champsDeSaisie(["confirmation"], ["fld_mdp"], ["fld_mdp"])[0], "hampsDeSaisieconfirmationfld_mdpfld_mdp0");
    expect(Object.keys(c).sort()).toEqual(["cible", "role", "secret"]);
    expect("fieldId" in c).toBe(false);
  });

  it("un rôle hors vocabulaire est IGNORÉ, jamais rendu au hasard", () => {
    expect(champsDeSaisie(["captcha", "confirmation"], ["", "fld_mdp"], ["fld_mdp"]))
      .toHaveLength(1);
  });

  it("le RUNTIME lit les deux props — sans quoi le cliquet du dépôt refuse", () => {
    // `props-cablees` vérifie que le runtime ÉMIS lit chaque prop déclarée.
    // Ce test dit pourquoi : une prop déclarée et non lue est un fait sans
    // effet, ce qu'EP-141 interdit.
    // Le schéma est typé de façon opaque : on l'interroge par ce qu'il
    // ACCEPTE, comme en EP-142, plutôt que par sa forme interne.
    const forme = requis(getBlock("form"), "getBlockform");
    expect(forme.propsSchema.safeParse({
      fieldIds: ["fld_x"], submitLabel: "Créer",
      saisieRoles: ["confirmation"], saisieCibles: ["fld_x"],
    }).success).toBe(true);
  });
});
