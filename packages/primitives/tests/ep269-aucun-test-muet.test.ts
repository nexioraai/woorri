// ════════════════════════════════════════════════════════════════════
//  EP-269 — UN FICHIER DE TEST QUI NE SE CHARGE PLUS EST UN TEST MUET.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT, MESURÉ LE 2026-10-18, ET IL ÉTAIT INVISIBLE.
//
// `Anneau` (D11) importe `react-native-svg`. C'est un module NATIF : son code
// publié n'est pas transformable en node, et le monter lève
// « SyntaxError: Unexpected token 'typeof' ».
//
// Ce qui est arrivé ensuite n'est pas un échec, c'est un SILENCE :
//
//   · `packages/blocks` — TROIS fichiers cessent de se charger. Le cliquet du
//     registre de blocs en faisait partie : je venais de l'éditer, et il ne
//     mesurait plus rien. 57 tests réels, 32 affichés.
//   · `packages/primitives` — DEUX fichiers, dont `primitives.test.tsx`, qui
//     juge les primitives que je modifiais. 39 tests réels, 22 affichés.
//
// ── ET L'OUTIL N'ÉTAIT PAS AVEUGLE : MOI JE L'ÉTAIS.
//
// `vitest` écrivait « Test Files 2 failed | 4 passed » et sortait non-zéro.
// Mon filtre de lecture ne retenait que la ligne « Tests », qui ne compte que
// ce qui s'est EXÉCUTÉ. La gate, elle, lit le code de sortie : c'est elle qui
// a trouvé le défaut. Ce cliquet existe pour que la PROCHAINE fois, la cause
// soit nommée à la source plutôt que déduite d'un code de sortie.
//
// ── CE QU'IL TIENT.
//
// La propriété STRUCTURELLE, pas l'incident : tout module natif importé par
// les sources de ce paquet doit être neutralisé dans la config qui monte ses
// tests. Un nouveau module natif ajouté sans stub fait rougir ICI, en disant
// quoi faire — au lieu d'éteindre des fichiers de test en silence.
//
// ── CE QU'IL NE PROUVE PAS.
//
// 🟠 Il ne prouve pas que les stubs sont fidèles — un stub qui jetterait ses
//    props rendrait le montage vert et aveugle. Cette propriété-là est tenue
//    par les contrôles qui LISENT les props posées (D11 lit
//    `strokeDashoffset` sur les nœuds du stub SVG).
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ICI = dirname(fileURLToPath(import.meta.url));
// ICI = packages/primitives/tests → deux crans pour atteindre `packages/`.
const PAQUETS = join(ICI, "..", "..");

// Les paquets qui MONTENT des composants en node. Les autres n'ont pas besoin
// de stub : ils ne chargent jamais de module natif.
const PAQUETS_QUI_MONTENT = ["primitives", "blocks"] as const;

/**
 * Tout module natif que les sources d'un paquet importent.
 *
 * On lit les VRAIS imports, pas une liste tenue à la main : une liste
 * recopiée dérive, et c'est exactement le défaut que ce cliquet ferme.
 */
const modulesNatifsImportes = (paquet: string): string[] => {
  const src = join(PAQUETS, paquet, "src");
  const trouves = new Set<string>();
  for (const f of readdirSync(src)) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
    const texte = readFileSync(join(src, f), "utf8");
    for (const m of texte.matchAll(/from "(react-native[^"]*)"/gu)) {
      const nom = m[1];
      if (nom !== undefined) trouves.add(nom);
    }
  }
  return [...trouves].sort();
};

describe("EP-269 · aucun fichier de test ne s'éteint en silence", () => {
  it("chaque module natif importé est neutralisé dans la config qui monte", () => {
    const manquants: string[] = [];
    for (const paquet of PAQUETS_QUI_MONTENT) {
      const config = readFileSync(join(PAQUETS, paquet, "vitest.config.ts"), "utf8");
      for (const mod of modulesNatifsImportes(paquet)) {
        if (!config.includes(`"${mod}": fileURLToPath(`)) manquants.push(`${paquet} → ${mod}`);
      }
    }
    expect(
      manquants,
      `module(s) natif(s) importé(s) SANS stub : ${manquants.join(", ")} — ajoutez ` +
        `l'alias dans la config du paquet, sinon ses fichiers de test cesseront ` +
        `de se CHARGER et vitest affichera « 0 test » sans que personne le voie.`,
    ).toEqual([]);
  });

  it("l'alias du module le plus spécifique passe AVANT le plus général", () => {
    // Vite résout par PRÉFIXE : « react-native-svg » commence par
    // « react-native ». Posé après, il serait réécrit vers le stub de
    // react-native, et le module SVG n'existerait jamais — un défaut qui
    // ressemble trait pour trait au précédent, par une autre porte.
    for (const paquet of PAQUETS_QUI_MONTENT) {
      const config = readFileSync(join(PAQUETS, paquet, "vitest.config.ts"), "utf8");
      const mods = modulesNatifsImportes(paquet);
      const positions = mods
        .map((m) => ({ m, i: config.indexOf(`"${m}": fileURLToPath(`) }))
        .filter((x) => x.i >= 0);
      for (const a of positions) {
        for (const b of positions) {
          // `a` plus spécifique que `b` ⇒ `a` doit apparaître AVANT `b`.
          if (a.m !== b.m && a.m.startsWith(b.m)) {
            expect(
              a.i,
              `${paquet} : l'alias « ${a.m} » est posé APRÈS « ${b.m} ». Vite ` +
                `résout par préfixe : il sera réécrit vers le mauvais stub.`,
            ).toBeLessThan(b.i);
          }
        }
      }
    }
  });

  it("les deux paquets chargent TOUS leurs fichiers de test", () => {
    // Le nombre de fichiers de test présents sur le disque. Si l'un cesse de
    // se charger, `vitest` sort non-zéro — mais ce compte, lui, dit COMBIEN
    // auraient dû l'être, et c'est ce qui manquait pour lire le silence.
    const comptes = PAQUETS_QUI_MONTENT.map((p) => ({
      paquet: p,
      fichiers: readdirSync(join(PAQUETS, p, "tests")).filter((f) => f.includes(".test.")).length,
    }));
    // Mesuré le 2026-10-18, APRÈS réparation : primitives 7, blocks 9.
    // Ces nombres ne peuvent que MONTER — un fichier de test qui disparaît
    // est une perte de couverture, et elle se voit ici.
    expect(comptes.find((c) => c.paquet === "primitives")?.fichiers).toBeGreaterThanOrEqual(7);
    expect(comptes.find((c) => c.paquet === "blocks")?.fichiers).toBeGreaterThanOrEqual(9);
  });
});
