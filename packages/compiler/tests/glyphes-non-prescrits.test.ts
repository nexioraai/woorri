// EP-131 · ② — LE MOTEUR NE DESSINE AUCUN SYMBOLE QUE LE DOCUMENT N'A PAS
// DEMANDÉ.
//
// Question posée : un symbole observé à l'appareil (une roue dentée) n'est
// dans AUCUN document AIR — mesuré deux fois. D'où vient-il ? Trois réponses
// possibles : un reste de débogage, une décision du shell non prescrite par
// le plan, ou un élément qui n'appartient pas au moteur du tout.
//
// LA PREUVE NE PEUT PAS ÊTRE UN JUGE DE DOCUMENT : ce qui est en cause est du
// code d'hôte, pas un document. Elle est donc faite par EXHAUSTIVITÉ STATIQUE,
// ce qui est plus fort qu'une observation — tout symbole dessinable par le
// moteur est écrit quelque part dans ces fichiers. Le test les énumère et
// exige que chacun soit JUSTIFIÉ :
//   · soit dérivé de la table des rôles — donc commandé par le document ;
//   · soit dans la liste FERMÉE ci-dessous, où chaque entrée nomme la
//     primitive qui le pose et le motif fonctionnel qui l'exige.
//
// C'est un CLIQUET : tout symbole neuf écrit en dur casse ce test. Le moteur
// ne peut donc plus acquérir silencieusement un élément de chrome que
// personne n'a prescrit — la famille des blocs surnuméraires (EP-122), un
// étage plus bas.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLYPHE_PAR_ROLE } from "@deribfy/primitives/roles-icones";

const RACINE = join(import.meta.dirname, "../..");

/** Chaque symbole en dur, avec le motif qui l'exige. Liste FERMÉE. */
const JUSTIFIES: Readonly<Record<string, string>> = {
  "search-outline": "entrée de recherche — le signe de la fonction elle-même",
  "camera-outline": "recherche par image — option déclarée par le document",
  "eye-outline": "révéler une saisie masquée",
  "eye-off-outline": "masquer à nouveau une saisie révélée",
};

function sources(): { fichier: string; code: string }[] {
  const out: { fichier: string; code: string }[] = [];
  const dossiers = [join(RACINE, "compiler/runtime"), join(RACINE, "primitives/src")];
  for (const d of dossiers) {
    for (const f of readdirSync(d)) {
      // La TABLE des rôles est la source légitime : elle porte tous les
      // glyphes par construction, c'est son rôle. Tout le reste est jugé.
      if (f === "roles-icones.ts") continue;
      if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
      out.push({ fichier: f, code: readFileSync(join(d, f), "utf8") });
    }
  }
  return out;
}

describe("EP-131 · ② aucun symbole non prescrit dans le moteur", () => {
  it("tout symbole écrit en dur est justifié, un par un", () => {
    const vus = new Map<string, string>();
    for (const { fichier, code } of sources()) {
      for (const m of code.matchAll(/"([a-z][a-z0-9-]*-outline)"/g)) {
        vus.set(m[1] ?? "", fichier);
      }
    }
    for (const [glyphe, fichier] of vus) {
      expect(JUSTIFIES[glyphe], `${fichier} pose « ${glyphe} » sans motif déclaré`).toBeDefined();
    }
    // Le cliquet mord dans les DEUX sens : une justification qui ne
    // correspond plus à aucun symbole posé est une liste qui a vieilli.
    for (const glyphe of Object.keys(JUSTIFIES)) {
      expect(vus.has(glyphe), `« ${glyphe} » est justifié mais plus posé`).toBe(true);
    }
  });

  it("le symbole des réglages n'est posable QUE par le document", () => {
    // Il EXISTE dans la table — un document a le droit de le demander. Ce que
    // le test interdit, c'est que le moteur le pose de sa propre initiative.
    expect(GLYPHE_PAR_ROLE.reglages).toBe("settings-outline");
    expect(Object.keys(JUSTIFIES)).not.toContain("settings-outline");
    for (const { fichier, code } of sources()) {
      expect(code.includes('"settings-outline"'), `${fichier}`).toBe(false);
    }
  });

  it("aucun en-tête natif ne reçoit d'élément que le plan n'a pas prescrit", () => {
    // `headerRight` / `headerLeft` sont les deux portes par lesquelles un
    // élément de chrome entrerait sans passer par le document.
    const emission = readFileSync(join(RACINE, "compiler/src/emit-project.ts"), "utf8");
    expect(emission).not.toMatch(/headerRight|headerLeft/);
  });
});
