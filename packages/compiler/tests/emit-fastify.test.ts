/**
 * LE SERVEUR NODE / FASTIFY — LE JUMEAU DU SPRING.
 *
 * Mesure qui a commandé ce lot : sur le MÊME document, un client Java
 * recevait 19 fichiers et 1 016 lignes ; un client Node recevait un
 * document à lire et écrivait les 1 016 lignes lui-même. Ce n'était pas le
 * même service.
 *
 * Ces preuves tiennent les TROIS REFUS que le contrat impose. Ils doivent
 * être DANS LE CODE ÉMIS, pas dans un commentaire — un refus commenté ne
 * refuse rien.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileBackend } from "../src/compile-backend.ts";
import type { ProjectAir } from "@deribfy/air-schema";

const DOC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "slices", "tontine", "tontine.air.json",
);
const air = (): ProjectAir =>
  ({
    ...(JSON.parse(readFileSync(DOC, "utf8")) as ProjectAir),
    backend: { kind: "genere", stack: "fastify" },
  });

const sortie = (): Map<string, string> => new Map(compileBackend(air()).files);
const tout = (): string => [...sortie().values()].join("\n");

describe("le document choisit la pile, pas le moteur", () => {
  it("`fastify` émet du TypeScript, et AUCUN Java", () => {
    const f = [...sortie().keys()];
    expect(f).toContain("src/serveur.ts");
    expect(f.some((x) => /\.java$|pom\.xml/u.test(x))).toBe(false);
  });

  it("`spring_boot` émet toujours du Java — rien n’a été remplacé", () => {
    const java = compileBackend({ ...air(), backend: { kind: "genere", stack: "spring_boot" } });
    expect([...java.files.keys()].some((x) => x.endsWith(".java"))).toBe(true);
  });

  it("un projet complet, pas des morceaux", () => {
    const f = [...sortie().keys()];
    for (const attendu of ["package.json", "tsconfig.json", "src/serveur.ts"]) {
      expect(f, attendu).toContain(attendu);
    }
    // Par entité : un modèle, un dépôt, des routes.
    const n = air().entities.length;
    expect(f.filter((x) => x.startsWith("src/modele/"))).toHaveLength(n);
    expect(f.filter((x) => x.startsWith("src/depot/"))).toHaveLength(n);
    expect(f.filter((x) => x.startsWith("src/api/") && x !== "src/api/regles-metier.ts")).toHaveLength(n);
  });
});

// ── L'ADRESSE ET LES CLÉS SONT UN CONTRAT, PAS UN CHOIX D'ÉMETTEUR.
//
// Mesuré le 2026-10-11 : cet émetteur servait /<table> et nommait ses clés
// par identifiant de colonne. Il compilait, et AUCUNE application générée
// n'aurait pu lui parler — son client appelle /air/v1/entities/<id>/rows et
// nomme les champs par leur NOM. Deux tests pour que ça ne redérive pas.
// ── CE QUE LE SERVEUR A LE DROIT D'EXPOSER.
//
// Mesuré le 2026-10-12 : 39 règles d'autorisation au corpus, et le serveur
// rendait TOUTES les lignes. 37 sont des filtres sur les données, les 2
// autres désignent l'appelant. Trois pièges, trois cliquets.
describe("la visibilité des lignes est imposée par le serveur", () => {
  const avecRegle = (operateur: string, valeur: unknown): ProjectAir => {
    const a = structuredClone(air());
    const e = a.entities.find((x) => x.fields.some((f) => f.transitions !== undefined));
    const f = e?.fields.find((x) => x.transitions !== undefined);
    if (e === undefined || f === undefined) return a;
    (a.rules as unknown[]).push({
      id: "rule_test_visibilite",
      kind: "authorization",
      entityId: e.id,
      description: "visibilité de test",
      assertions: [{ fieldId: f.id, operator: operateur, value: valeur }],
    });
    return a;
  };

  // Filtrer après coup en mémoire se contourne : il suffit de demander une
  // ligne par son identifiant. La condition doit être DANS la requête.
  it("le filtre est DANS le SQL, pas appliqué après coup", () => {
    const files = new Map(compileBackend(avecRegle("neq", "TERMINEE")).files);
    const depot = [...files.entries()].find(([k]) => k.startsWith("src/depot/tontines"));
    expect(depot?.[1] ?? "").toContain("where");
    expect(depot?.[1] ?? "").toContain("<> ?");
  });

  // `lire` sert au contrôle d'EXISTENCE avant écriture. La filtrer ferait
  // passer une ligne cachée pour absente : un journal invisible redeviendrait
  // réécrivable, et une ligne masquée serait écrasée comme si elle n'était
  // pas là. Le piège le plus facile à introduire de tout ce lot.
  it("le contrôle d’existence avant écriture n’est PAS filtré", () => {
    const files = new Map(compileBackend(avecRegle("neq", "TERMINEE")).files);
    const depot = [...files.entries()].find(([k]) => k.startsWith("src/depot/tontines"));
    const lire = /lire: async[\s\S]*?\n {4}\/\/|lire: async[\s\S]*?,\n {4}[a-z]/u.exec(depot?.[1] ?? "");
    expect(depot?.[1] ?? "").toContain("where id = ?`, [id])");
    expect(lire?.[0] ?? "").not.toContain("VISIBLE");
  });

  // Une règle qui désigne l'appelant ne peut pas devenir une condition SQL.
  // L'entité est alors FERMÉE — et AUCUNE autre route ne doit rendre ses
  // lignes, sinon le refus n'est qu'une façade.
  // DEUX SENTINELLES, DEUX ISSUES. `@currentUser.email` correspond à une
  // revendication standard du jeton : elle se RÉSOUT, et la lecture exige
  // alors un appelant. Toute autre sentinelle ne se résout pas — l'entité est
  // FERMÉE plutôt que servie sans filtre. Confondre les deux donnerait soit
  // une fuite, soit une collection inutilisable.
  it("une sentinelle résoluble exige un APPELANT, pas une fermeture", () => {
    const files = new Map(compileBackend(avecRegle("eq", "@currentUser.email")).files);
    const src = [...files.entries()].find(([k]) => k.startsWith("src/api/tontines"))?.[1] ?? "";
    expect(src).toContain("AIR_APPELANT_REQUIS");
    expect(src).toContain("appelantDe(req.headers");
    expect(src).not.toContain("AIR_VISIBILITE_INAPPLICABLE");
    expect((src.match(/app\.get\(/gu) ?? []).length).toBe(1);
  });

  it("une sentinelle NON résoluble FERME l’entité, sans route de contournement", () => {
    const files = new Map(compileBackend(avecRegle("eq", "@currentUser.reference_client")).files);
    const src = [...files.entries()].find(([k]) => k.startsWith("src/api/tontines"))?.[1] ?? "";
    expect(src).toContain("AIR_VISIBILITE_INAPPLICABLE");
    expect(src).toContain("rep.code(403)");
    // Une seule route de lecture de collection, et elle refuse.
    expect((src.match(/app\.get\(/gu) ?? []).length).toBe(1);
  });
});

// ── LA BRANCHE QUE LE CORPUS N'ATTEINT JAMAIS.
//
// Mesuré le 2026-10-12 : sur les 31 documents, la clé qui relie l'enfant au
// parent se résout TOUJOURS — un seul champ candidat. Le refus prévu pour le
// cas ambigu n'avait donc jamais été exécuté : du code que personne n'a vu
// tourner, exactement ce que ce dépôt traque.
//
// On fabrique donc le cas : un SECOND champ de l'enfant pointant vers le même
// parent. Rien dans le document ne dit alors lequel compte.
describe("une clé ambiguë fait REFUSER le calcul, pas deviner", () => {
  const ambigu = (): ProjectAir => {
    const a = structuredClone(air());
    const calcule = a.entities
      .flatMap((e) => e.fields)
      .find((f) => f.derived?.kind === "count" || f.derived?.kind === "sum");
    if (calcule === undefined) return a;
    const d = calcule.derived as { relationId: string };
    const rel = a.relations.find((r) => r.id === d.relationId);
    const enfant = a.entities.find((e) => e.id === rel?.toEntityId);
    const cle = enfant?.fields.find((f) => f.referencesEntityId === rel?.fromEntityId);
    if (enfant === undefined || cle === undefined) return a;
    // Un second chemin vers le même parent — « créé par » et « validé par ».
    (enfant.fields as unknown[]).push({ ...cle, id: `${cle.id}_bis`, name: `${cle.name} bis` });
    return a;
  };

  it("le code LÈVE en nommant le champ, et ne calcule pas", () => {
    const a = ambigu();
    const calcule = a.entities
      .flatMap((e) => e.fields)
      .find((f) => f.derived?.kind === "count" || f.derived?.kind === "sum");
    if (calcule === undefined) return;
    const files = new Map(compileBackend(a).files);
    const src = files.get("src/calcul/en-base.ts") ?? "";
    expect(src, "le refus doit nommer le champ").toContain(
      `AIR_CALCUL_A_ECRIRE:${calcule.id}`,
    );
    expect(src, "aucune requête ne doit être inventée").not.toContain("coalesce(sum(");
    // La raison doit être ÉCRITE : « ça ne marche pas » n'aide personne.
    expect(src).toMatch(/pointent vers/u);
  });

  it("le serveur reste lisible : la ligne n’est pas perdue", () => {
    const files = new Map(compileBackend(ambigu()).files);
    const api = [...files.entries()].find(([f]) => f.startsWith("src/api/") && f.includes("tontines"));
    expect(api?.[1] ?? "").toContain("X-Air-Non-Calcule");
  });
});

// ── LES RÈGLES DU DOCUMENT NE SONT PAS DÉCORATIVES.
//
// Mesuré au corpus le 2026-10-12 : 160 règles de validation sur 31
// documents, et le serveur n'en appliquait AUCUNE. L'écran les vérifiait
// seul — or un écran ne protège de rien, la route s'appelle directement.
describe("les règles du document sont faites respecter par le serveur", () => {
  it("chaque règle de validation est dans le code, et nommée", () => {
    const a = air();
    const validation = a.rules.filter((r) => r.kind === "validation");
    if (validation.length === 0) return;
    const src = sortie().get("src/api/regles-metier.ts") ?? "";
    for (const r of validation) expect(src, r.id).toContain(JSON.stringify(r.id));
  });

  // Une règle d'AUTORISATION dit QUI a le droit. Ce contrat ne transporte pas
  // l'identité de l'appelant jusqu'au serveur ; l'appliquer en la devinant
  // donnerait l'illusion d'un contrôle d'accès — pire que de ne pas en avoir.
  it("les règles d’autorisation sont dites, pas simulées", () => {
    const a = air();
    const autorisation = a.rules.filter((r) => r.kind !== "validation");
    if (autorisation.length === 0) return;
    const src = sortie().get("src/api/regles-metier.ts") ?? "";
    for (const r of autorisation) expect(src, r.id).toContain(r.id);
    expect(src).toContain("AUTORISATION");
  });

  it("le refus nomme la règle, et répond 422", () => {
    const s = sortie();
    let mesures = 0;
    for (const e of air().entities) {
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      if (!src.includes("AIR_REGLE_VIOLEE")) continue;
      mesures += 1;
      expect(src, e.id).toContain("rep.code(422)");
      expect(src, e.id).toContain("regle: violation.regle");
    }
    expect(mesures, "les routes doivent vérifier les règles").toBeGreaterThan(0);
  });
});

describe("le serveur émis respecte le contrat que le client appelle", () => {
  it("les routes sont montées sur /air/v1/entities/<id>/rows", () => {
    const s = sortie();
    for (const e of air().entities) {
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain(`"/air/v1/entities/${e.id}/rows"`);
    }
  });

  // La ligne est `{ id, values }` — la pile Java le documente ainsi et
  // l'application ne le négocie pas. Mesuré le 2026-10-11 : cet émetteur
  // rendait une ligne PLATE, et l'application lisait `undefined` partout.
  it("une ligne rendue est { id, values }, pas une ligne plate", () => {
    const s = sortie();
    for (const e of air().entities) {
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain('return { id: src["id"], values: vue };');
    }
  });

  it("les champs passent par leur NOM, dans les deux sens", () => {
    const s = sortie();
    let mesures = 0;
    for (const e of air().entities) {
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      for (const f of e.fields) {
        if (f.sensitive === true || f.derived !== undefined) continue;
        mesures += 1;
        expect(src, `${e.id}.${f.id}`).toContain(JSON.stringify(f.name));
      }
    }
    expect(mesures).toBeGreaterThan(0);
  });
});

describe("les refus sont DANS le code, pas en commentaire", () => {
  // Les routes d'un journal EXISTENT et refusent, au lieu d'être absentes.
  // Une route absente répond 404 — « cette adresse n'existe pas » — ce qui
  // est faux : l'adresse existe, c'est le geste qui est interdit. Et c'est
  // le refus que prononce déjà la pile Java : un même document ne doit pas
  // vouloir dire deux choses selon le serveur qu'on en tire.
  it("une entité JOURNAL refuse la réécriture et l’effacement, en le disant", () => {
    const journaux = air().entities.filter((e) => e.appendOnly === true);
    expect(journaux.length, "le document de référence doit porter un journal").toBeGreaterThan(0);
    for (const e of journaux) {
      const src = sortie().get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain("AIR_JOURNAL_REECRITURE");
      expect(src, e.id).toContain("AIR_JOURNAL_SUPPRESSION");
      // Le refus doit être rendu, pas seulement nommé dans un commentaire.
      expect(src, e.id).toContain("rep.code(409)");
      // …et aucune route ne doit MODIFIER pour de vrai.
      expect(src, e.id).not.toContain("depot.modifier");
      expect(src, e.id).not.toContain("depot.supprimer");
    }
  });

  // Une transition non déclarée se refuse sur le SERVEUR. L'écran n'affiche
  // pas les boutons impossibles, mais la route s'appelle directement.
  it("une transition non déclarée est refusée côté serveur", () => {
    const s = sortie();
    let mesures = 0;
    for (const e of air().entities) {
      if (e.appendOnly === true) continue;
      const etats = e.fields.filter((f) => f.transitions !== undefined);
      if (etats.length === 0) continue;
      mesures += 1;
      const src = s.get(`src/api/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      expect(src, e.id).toContain("AIR_TRANSITION_INTERDITE");
      for (const f of etats) {
        for (const t of f.transitions ?? []) {
          expect(src, `${e.id}.${f.id}`).toContain(`${t.from}>${t.to}`);
        }
      }
    }
    expect(mesures, "le document de référence doit porter des transitions").toBeGreaterThan(0);
  });

  // Un `count`/`sum` traverse une relation : la requête dépend de la base
  // réelle. Rendre 0 serait le pire choix — une cagnotte à zéro ressemble à
  // une cagnotte vide. La fonction lève, et nomme le champ.
  // ── UN CALCUL SE FAIT, OU SE NOMME. JAMAIS ZÉRO EN SILENCE.
  //
  // Le trou n'était justifié que tant que l'émetteur ignorait les tables :
  // il les produit, et la colonne qui relie l'enfant au parent est déclarée
  // par `referencesEntityId`. Il calcule donc — SAUF si l'enfant porte deux
  // champs vers le même parent, où rien ne dit lequel compte : il LÈVE
  // alors, et son nom part dans l'en-tête. Rendre zéro serait le pire des
  // trois : une cagnotte à zéro ressemble à une cagnotte vide.
  it("un calcul se fait vraiment, ou se nomme — jamais zéro en silence", () => {
    const a = air();
    const enBase = a.entities.flatMap((e) =>
      e.fields.filter((f) => f.derived?.kind === "count" || f.derived?.kind === "sum"),
    );
    if (enBase.length === 0) return;
    const src = sortie().get("src/calcul/en-base.ts") ?? "";
    for (const f of enBase) {
      const d = f.derived;
      if (d === undefined || (d.kind !== "count" && d.kind !== "sum")) continue;
      const rel = a.relations.find((r) => r.id === d.relationId);
      const enfant = a.entities.find((x) => x.id === rel?.toEntityId);
      const cles =
        rel === undefined || enfant === undefined
          ? []
          : enfant.fields.filter((x) => x.referencesEntityId === rel.fromEntityId);
      if (cles.length === 1) {
        expect(src, f.id).toContain(d.kind === "count" ? "count(*)" : "coalesce(sum(");
      } else {
        expect(src, f.id).toContain(`AIR_CALCUL_A_ECRIRE:${f.id}`);
      }
    }
    expect(src).not.toContain("return 0;");
  });

  it("un champ SENSIBLE ne sort d’aucune lecture", () => {
    const s = sortie();
    for (const e of air().entities) {
      const sensibles = e.fields.filter((f) => f.sensitive === true);
      if (sensibles.length === 0) continue;
      const depot = s.get(`src/depot/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      const lues = /COLONNES_LUES = (\[[^\]]*\])/u.exec(depot)?.[1] ?? "[]";
      for (const f of sensibles) {
        expect(lues, `${e.id}.${f.id}`).not.toContain(f.id.replace(/^fld_/u, ""));
      }
    }
  });

  it("un champ CALCULÉ est absent du modèle — il ne se stocke jamais", () => {
    const s = sortie();
    for (const e of air().entities) {
      const calcules = e.fields.filter((f) => f.derived !== undefined);
      if (calcules.length === 0) continue;
      const modele = s.get(`src/modele/${e.id.replace(/^ent_/u, "")}.ts`) ?? "";
      const corps = modele.slice(0, modele.indexOf("}"));
      for (const f of calcules) {
        expect(corps, `${e.id}.${f.id}`).not.toContain(`${f.id.replace(/^fld_/u, "")}:`);
      }
    }
  });
});

describe("ce qui dépend de la base ne se devine pas", () => {
  // Le dépôt N'EST PLUS un trou : il parle à une vraie base. Ce test garde
  // la porte fermée — un émetteur qui recommencerait à livrer un dépôt « à
  // écrire » rendrait la pile Node plus pauvre que Java, qui reçoit sa
  // persistance de JPA.
  it("le dépôt n’est pas un trou : il parle à une vraie base", () => {
    expect(tout()).not.toContain("AIR_DEPOT_A_ECRIRE");
    expect(tout()).toContain("insert into");
    expect(tout()).toContain("on conflict (id) do update set");
  });

  // Un seul endroit connaît les deux moteurs. Si une requête SQL apparaissait
  // ailleurs avec des `$1`, la traduction serait faite deux fois.
  it("un seul endroit traduit pour Postgres", () => {
    const s = sortie();
    for (const [f, c] of s) {
      if (f === "src/base.ts" || !f.endsWith(".ts")) continue;
      expect(c, f).not.toMatch(/\$1/u);
    }
    expect(s.get("src/base.ts") ?? "").toContain("numeroter");
  });

  // Le même texte voyage deux fois : lisible par un humain, et embarqué pour
  // que le serveur ne dépende pas du dossier d'où on le lance. Deux copies
  // qui divergeraient appliqueraient un schéma différent de celui qu'on lit.
  it("le schéma lisible et le schéma appliqué sont le MÊME texte", () => {
    const s = sortie();
    const fichier = s.get("schema.sql") ?? "";
    const embarque = s.get("src/schema.ts") ?? "";
    expect(fichier).not.toBe("");
    expect(embarque).toContain(JSON.stringify(fichier));
  });

  // Le schéma est ÉMIS parce que Node n'a pas d'équivalent au `ddl-auto` de
  // JPA. Sans lui, le serveur démarre et échoue à la première écriture.
  it("le schéma des tables est émis, et ne détruit rien", () => {
    const ddl = sortie().get("schema.sql") ?? "";
    for (const e of air().entities) {
      expect(ddl, e.id).toContain(`create table if not exists ${e.id.replace(/^ent_/u, "")} (`);
    }
    expect(ddl).not.toMatch(/\bdrop\b/iu);
  });

  // CE QUI RESTE À ÉCRIRE DOIT CONTINUER DE SE NOMMER.
  //
  // Un `count`/`sum` traverse une relation : la requête dépend du schéma
  // réel, que le document ne décrit pas. Les règles métier, elles, n'ont de
  // marqueur que si le document en déclare — tontine n'en déclare aucune,
  // alors l'exiger sans condition faisait échouer un test sur une propriété
  // du document, pas de l'émetteur.
  it("ce qui dépend vraiment de la base porte un code repérable", () => {
    const enBase = air().entities.flatMap((e) =>
      e.fields.filter((f) => f.derived?.kind === "count" || f.derived?.kind === "sum"),
    );
    // Le calcul n'est plus un trou dès que la clé se résout : ne l'exiger que
    // là où le document est réellement muet.
    const muet = enBase.some((f) => {
      const dd = f.derived;
      if (dd === undefined || (dd.kind !== "count" && dd.kind !== "sum")) return false;
      const rel = air().relations.find((r) => r.id === dd.relationId);
      const enfant = air().entities.find((x) => x.id === rel?.toEntityId);
      if (rel === undefined || enfant === undefined) return true;
      return enfant.fields.filter((x) => x.referencesEntityId === rel.fromEntityId).length !== 1;
    });
    if (muet) expect(tout()).toContain("AIR_CALCUL_A_ECRIRE");
    if (air().rules.length > 0) expect(tout()).toContain("AIR_REGLE_A_ECRIRE");
    expect(enBase.length + air().rules.length).toBeGreaterThan(0);
  });

  // ── LE DÉFAUT NE DOIT JAMAIS ÊTRE « EN CLAIR » NI « SANS VÉRIFIER ».
  //
  // Mesuré le 2026-10-12 : une URL Supabase sans `sslmode` donne
  // `ssl = undefined` chez `pg` — connexion EN CLAIR vers l'internet. Ça
  // marche, et ça fuit : personne ne le voit. Et `rejectUnauthorized: false`
  // serait pire qu'utile — chiffrer sans protéger.
  it("un hôte distant est chiffré, et son certificat vérifié", () => {
    const b = sortie().get("src/base.ts") ?? "";
    expect(b).toContain("rejectUnauthorized: true");
    expect(b).not.toContain("rejectUnauthorized: false");
    expect(b).toContain("localhost");
  });

  it("aucun secret, aucune clé dans le code émis", () => {
    expect(tout()).not.toMatch(/password[ \t]*[:=][ \t]*["']?[A-Za-z0-9]{3,}/u);
    expect(tout()).not.toMatch(/sk-[A-Za-z0-9]{8,}/u);
  });
});
