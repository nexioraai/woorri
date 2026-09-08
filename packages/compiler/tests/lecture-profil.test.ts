// FALSIFICATIONS DE LA RELECTURE — port injecté, aucun réseau.
// La règle : ne relire que ce qu'on a le droit de relire, une seule fois par
// identité, et n'inventer aucune valeur quand le serveur n'a rien.
import { describe, expect, it } from "vitest";
import { creerMagasin } from "../runtime/magasin-donnees.ts";
import { armerLectureProfil } from "../runtime/lecture-profil.ts";
import type { PortLecture, ReponseLecture } from "../runtime/lecture-profil.ts";
import type { SessionProvider } from "../runtime/session-contract.ts";

function sessionFausse(): SessionProvider & { ouvrir(id: string): void; fermer(): void } {
  let id: string | undefined;
  const ecouteurs = new Set<() => void>();
  return {
    estAuthentifie: () => id !== undefined,
    identifiant: () => id,
    abonner: (e) => {
      ecouteurs.add(e);
      return () => ecouteurs.delete(e);
    },
    ouvrir: (v) => {
      id = v;
      for (const e of ecouteurs) e();
    },
    fermer: () => {
      id = undefined;
      for (const e of ecouteurs) e();
    },
  };
}

function port(r: ReponseLecture): { p: PortLecture; appels: string[] } {
  const appels: string[] = [];
  return {
    appels,
    p: {
      lire: (table, id) => {
        appels.push(`${table}:${id}`);
        return Promise.resolve(r);
      },
    },
  };
}

const LIGNE: ReponseLecture = { data: { fld_nom: "Youssouf" }, error: null };

describe("relecture du profil — n'invente rien, ne répète rien", () => {
  it("🔴 sans identité : AUCUN appel — on ne relit pas la ligne d'un inconnu", () => {
    const magasin = creerMagasin({ ent_voyageur: [] });
    const { p, appels } = port(LIGNE);
    armerLectureProfil({ magasin, session: sessionFausse(), port: p, entityId: "ent_voyageur" });
    expect(appels).toEqual([]);
  });

  it("🟢 identité établie : la ligne est relue et entre dans l'instantané", async () => {
    const magasin = creerMagasin({ ent_voyageur: [] });
    const s = sessionFausse();
    const { p, appels } = port(LIGNE);
    armerLectureProfil({ magasin, session: s, port: p, entityId: "ent_voyageur" });
    s.ouvrir("u1");
    await Promise.resolve();
    await Promise.resolve();
    expect(appels).toEqual(["ent_voyageur:u1"]);
    expect(magasin.getInstance("ent_voyageur", "u1")?.values.fld_nom).toBe("Youssouf");
  });

  it("🔴 notifications répétées : UNE seule lecture par identité", async () => {
    const s = sessionFausse();
    const { p, appels } = port(LIGNE);
    armerLectureProfil({
      magasin: creerMagasin({ ent_voyageur: [] }), session: s, port: p, entityId: "ent_voyageur",
    });
    s.ouvrir("u1");
    s.ouvrir("u1");
    s.ouvrir("u1");
    await Promise.resolve();
    // Le piège : un appel réseau à chaque notification du magasin.
    expect(appels).toEqual(["ent_voyageur:u1"]);
  });

  it("🟢 aucune ligne côté serveur : c'est un FAIT, pas une erreur", async () => {
    const magasin = creerMagasin({ ent_voyageur: [] });
    const s = sessionFausse();
    armerLectureProfil({
      magasin, session: s, port: port({ data: null, error: null }).p, entityId: "ent_voyageur",
    });
    s.ouvrir("u1");
    await Promise.resolve();
    await Promise.resolve();
    // On n'invente aucune valeur : la personne n'a simplement rien enregistré.
    expect(magasin.listInstances("ent_voyageur")).toHaveLength(0);
  });

  it("🔴 lecture REFUSÉE : l'instantané reste INCHANGÉ", async () => {
    const magasin = creerMagasin({ ent_voyageur: [] });
    const s = sessionFausse();
    armerLectureProfil({
      magasin, session: s,
      port: port({ data: null, error: { message: "permission denied" } }).p,
      entityId: "ent_voyageur",
    });
    s.ouvrir("u1");
    await Promise.resolve();
    await Promise.resolve();
    expect(magasin.listInstances("ent_voyageur")).toHaveLength(0);
  });

  it("🟢 l'arrêt DÉSABONNE réellement", async () => {
    const s = sessionFausse();
    const { p, appels } = port(LIGNE);
    const arreter = armerLectureProfil({
      magasin: creerMagasin({ ent_voyageur: [] }), session: s, port: p, entityId: "ent_voyageur",
    });
    arreter();
    s.ouvrir("u1");
    await Promise.resolve();
    expect(appels).toEqual([]);
  });
});
