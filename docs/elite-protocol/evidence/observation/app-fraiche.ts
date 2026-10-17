// ════════════════════════════════════════════════════════════════════
//  COMPILER L'APPLICATION À NEUF — UN SEUL GESTE, ÉCRIT UNE FOIS.
// ════════════════════════════════════════════════════════════════════
//
// ── LE DÉFAUT QUE CE FICHIER EXISTE POUR FERMER, ET IL EST GRAVE.
//
// Mesuré le 2026-10-17 : les fichiers d'observation montent
// `slices/resto-riche/app/` — la tranche COMMISE. Elle embarque sa propre
// copie du runtime, et son dernier commit date du **2026-09-11**, cinq
// semaines avant le correctif du jour.
//
// Conséquence : onze fichiers d'observation étaient VERTS sur un instantané
// de cinq semaines. Ils seraient restés verts si le compilateur avait cassé
// entièrement. C'est onze fois le piège « un contrôle peut être vert et
// faux » — déjà payé une fois sur EP-247, où le cliquet était vert PARCE QUE
// les applications clientes portaient l'orange de Deribfy.
//
// J'ai moi-même failli le payer une douzième fois : mon premier EP-258
// montait la tranche commise, et ses deux mutations passaient au vert.
//
// ── CE QUE CE MODULE FAIT.
//
// Il compile un document AIR dans un dossier NEUF, et rend son chemin. Un
// cliquet qui juge le COMPILATEUR passe ainsi par le compilateur.
//
// Il existe parce que j'avais déjà écrit ce geste DEUX fois —
// `scripts/verifier-une-app.mjs` et `ep258-regle-portee.obs.tsx`. Ce dépôt a
// vu quatre fois « une liste écrite deux fois diverge » ; une procédure n'y
// échappe pas.
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO = new URL("../../../../", import.meta.url).pathname;

/**
 * LES DÉPENDANCES SONT EMPRUNTÉES, JAMAIS RÉINSTALLÉES.
 *
 * Le `tsconfig.json` émis étend `expo/tsconfig.base`, et les écrans importent
 * `react-native`. Depuis un dossier temporaire nu, tout est introuvable — et
 * l'échec parle de résolution de module, jamais du document.
 *
 * La gate de compilation résout cela en liant symboliquement les dépendances
 * d'une tranche déjà installée. On fait pareil. Si l'emprunt est impossible,
 * on le DIT : un échec dont on ignore la cause vaut moins qu'un refus net.
 */
// ── UNE SEULE DÉCISION POUR LES FICHIERS BINAIRES (2026-10-17).
//
// `.png` n'est plus seul : les polices embarquées voyagent aussi en base64.
// Quatre écrivains décidaient séparément, et l'en-tête de celui-ci dit
// « piège base64 fermé DEUX FOIS déjà ». La décision vit dans
// `packages/compiler/src/fichiers-binaires.ts`, une fois.
const { estBinaire } = (await import(REPO + "packages/compiler/src/fichiers-binaires.ts")) as {
  estBinaire: (chemin: string) => boolean;
};

const DEPENDANCES = REPO + "slices/resto-riche/app/node_modules";

export interface AppFraiche {
  /** Le dossier de l'application émise, terminé par « / ». */
  readonly base: string;
  /** Le nombre de fichiers écrits — un zéro se voit. */
  readonly fichiers: number;
}

/**
 * Compile `document` dans un dossier neuf et rend son chemin.
 *
 * @param document chemin du `.air.json`, relatif à la racine du dépôt
 * @param nom      nom du dossier temporaire — distinct par cliquet, sinon
 *                 deux fichiers d'observation s'écrasent l'un l'autre
 * @param superposer dossiers du dépôt à RECOPIER par-dessus l'émission.
 *
 * ── POURQUOI LA SUPERPOSITION EXISTE, ET CE QU'ELLE N'EST PAS.
 *
 * Mesuré le 2026-10-17 en convertissant `slot-invoque` : il importe
 * `slots/index.ts`, du code ÉCRIT À LA MAIN (commis le 2026-08-31) que le
 * compilateur n'émet pas — il émet le MÉCANISME (`slot-provider.tsx`), jamais
 * le contenu d'un Code Slot, qui appartient à l'utilisateur.
 *
 * Compiler à neuf SANS cette superposition détruisait donc ce que le cliquet
 * mesure : l'intégration d'un slot humain dans une application émise.
 *
 * CE QU'ELLE NE FAIT PAS : recopier le runtime. Si un jour quelqu'un passait
 * `lib/runtime` ici, il remettrait l'aveuglement que ce module existe pour
 * fermer — c'est pourquoi ce chemin-là est REFUSÉ.
 */
export async function compilerANeuf(
  document: string,
  nom: string,
  superposer: readonly string[] = [],
): Promise<AppFraiche> {
  const { migrateAirDocument } = (await import(REPO + "packages/air-schema/src/index.ts")) as {
    migrateAirDocument: (d: Record<string, unknown>) => unknown;
  };
  const { compileProject } = (await import(REPO + "packages/compiler/src/compile-project.ts")) as {
    compileProject: (a: unknown) => { files: Map<string, string> };
  };

  const air = migrateAirDocument(
    JSON.parse(readFileSync(join(REPO, document), "utf8")) as Record<string, unknown>,
  );
  const fichiers = compileProject(air).files;

  // ── UN DOSSIER NEUF À CHAQUE FOIS.
  //
  // Un reliquat ferait monter des écrans qui n'existent plus, et le verdict
  // porterait sur une application qui n'est pas celle qu'on tient.
  const base = join(tmpdir(), nom) + "/";
  rmSync(base, { recursive: true, force: true });
  for (const [chemin, contenu] of fichiers) {
    const abs = join(base, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    // Les `.png` voyagent en base64 dans la carte — convention du dépôt.
    writeFileSync(abs, estBinaire(chemin) ? Buffer.from(contenu, "base64") : contenu);
  }

  if (!existsSync(DEPENDANCES)) {
    throw new Error(
      `app-fraiche — aucun \`node_modules\` de référence en ${DEPENDANCES} ` +
        "(lancer `npm ci` dans slices/resto-riche/app)",
    );
  }
  symlinkSync(DEPENDANCES, join(base, "node_modules"), "dir");

  // ── LA SUPERPOSITION, ET SON GARDE-FOU.
  //
  // Recopier `lib/runtime` reviendrait à remettre le code figé par-dessus le
  // code frais — exactement l'aveuglement que ce module ferme. On REFUSE,
  // plutôt que de laisser l'erreur passer en silence.
  for (const dossier of superposer) {
    if (/(^|\/)lib(\/runtime)?(\/|$)/u.test(dossier)) {
      throw new Error(
        `app-fraiche — superposition REFUSÉE : « ${dossier} » recouvrirait le ` +
          "runtime fraîchement compilé, ce qui rendrait le cliquet aveugle.",
      );
    }
    const depuis = join(REPO, dossier);
    if (!existsSync(depuis)) {
      throw new Error(`app-fraiche — dossier à superposer introuvable : ${depuis}`);
    }
    cpSync(depuis, join(base, dossier.split("/").pop() ?? dossier), { recursive: true });
  }

  return { base, fichiers: fichiers.size };
}
