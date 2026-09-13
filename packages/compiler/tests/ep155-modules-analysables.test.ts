// EP-155 — UN MODULE QUI NE SE CHARGE PAS N'EST PAS UN MODULE.
//
// CE QUI S'EST PASSÉ, ET QUI N'AURAIT PAS DÛ : la correction d'EP-154 a
// introduit des accents graves NON ÉCHAPPÉS dans un template literal. Le
// fichier était syntaxiquement invalide — et RIEN ne l'a vu :
//   · la batterie était verte (1596/1596) ;
//   · `tsc --noEmit` passait (le fichier est du JavaScript, hors de son
//     périmètre) ;
//   · mes propres tests lisaient la SOURCE avec `readFileSync` et vérifiaient
//     son TEXTE — ils n'ont jamais chargé le module.
//
// Le défaut n'est apparu qu'au lancement d'un run, c'est-à-dire au moment le
// plus cher. Ce test le rend impossible : chaque module du banc doit être
// ANALYSABLE, et cela se vérifie sans rien exécuter ni rien dépenser.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BANC = join(import.meta.dirname, "..", "..", "..", "benchmarks", "air-emission");

const modules = (): string[] =>
  readdirSync(BANC).filter((f) => f.endsWith(".mjs"));

describe("EP-155 · chaque module du banc est analysable", () => {
  it("il y a bien des modules à vérifier", () => {
    expect(modules().length).toBeGreaterThan(5);
  });

  it("AUCUN n'a d'erreur de syntaxe — `node --check` sur chacun", () => {
    // `--check` analyse sans exécuter : aucune campagne n'est lancée, aucune
    // garde n'est touchée, aucun sou n'est dépensé.
    const casses: string[] = [];
    for (const f of modules()) {
      try {
        execFileSync(process.execPath, ["--check", join(BANC, f)], { stdio: "pipe" });
      } catch (e) {
        const message = e instanceof Error && "stderr" in e
          ? String((e as { stderr: Buffer }).stderr).split("\n").find((l) => l.includes("Error")) ?? ""
          : String(e);
        casses.push(`${f} — ${message.slice(0, 120)}`);
      }
    }
    expect(casses, "modules non analysables").toEqual([]);
  });

  it("le module d'émission en particulier — c'est lui qui a cassé", () => {
    expect(() =>
      execFileSync(process.execPath, ["--check", join(BANC, "emit-v3.mjs")], { stdio: "pipe" }),
    ).not.toThrow();
  });

  it("les accents graves du prompt sont ÉCHAPPÉS — la faute exacte", () => {
    // Le prompt vit dans un template literal : un accent grave non échappé le
    // termine, et tout ce qui suit devient du code. C'est ce qui est arrivé.
    const source = execFileSync(
      process.execPath,
      ["-e", `process.stdout.write(require("fs").readFileSync(${JSON.stringify(join(BANC, "emit-v3.mjs"))}, "utf8"))`],
      { stdio: "pipe" },
    ).toString();
    const regle = source.slice(
      source.indexOf("41. SURFACES DE L'APPLICATION"),
      source.indexOf("\n", source.indexOf("41. SURFACES DE L'APPLICATION")),
    );
    // Tout accent grave de cette ligne doit être précédé d'une barre inverse.
    const nus = [...regle.matchAll(/(^|[^\\])`/g)];
    expect(nus.map((m) => m[0]), "accent grave non échappé dans la règle 41").toEqual([]);
  });
});
