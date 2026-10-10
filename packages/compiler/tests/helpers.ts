// Aides de TEST (jamais importées par src/ — le chemin de résolution reste
// pur, sans fs) : hash Merkle d'un arbre de sources, même algorithme que
// le calcul des scellés du release train (fichiers triés par point de
// code, `chemin sha256(contenu)` par ligne, SHA-256 de l'ensemble).
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sha256 = (data: string | Buffer): string =>
  createHash("sha256").update(data).digest("hex");

const byCodeUnit = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

export function hashSourceTree(
  root: string,
  extraFiles: readonly (readonly [name: string, path: string])[] = [],
): string {
  const files: string[] = [];
  const walk = (rel: string): void => {
    const entries = readdirSync(join(root, rel === "" ? "." : rel), {
      withFileTypes: true,
    }).sort((x, y) => byCodeUnit(x.name, y.name));
    for (const entry of entries) {
      const relPath = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(relPath);
      else files.push(relPath);
    }
  };
  walk("");
  const lines = files
    .sort(byCodeUnit)
    .map((p) => `${p} ${sha256(readFileSync(join(root, p)))}`);
  for (const [name, path] of extraFiles) {
    lines.push(`${name} ${sha256(readFileSync(path))}`);
  }
  return sha256(lines.join("\n"));
}

// ── `requis` — LE NARROWING QUI SE VÉRIFIE, À LA PLACE DU `!` QUI AFFIRME.
//
// `expr!` dit au compilateur « crois-moi » et ne laisse AUCUNE trace à
// l'exécution : quand l'hypothèse est fausse, le test casse plus loin, sur un
// symptôme (`Cannot read properties of undefined`) qui ne nomme ni la valeur
// ni l'endroit. Le lint du moteur l'interdit depuis le premier commit
// (`packages/README.md`) — cette règle n'est pas décorative, elle interdit
// d'affirmer sans vérifier, ce qui est exactement le protocole de preuve.
//
// `requis` échoue AU POINT de l'hypothèse et la NOMME. Sur le chemin nominal
// — la valeur est présente — les deux formes rendent rigoureusement la même
// chose : la substitution ne change aucun test qui passait.
export function requis<T>(valeur: T | null | undefined, quoi: string): T {
  if (valeur === null || valeur === undefined) {
    throw new Error(`valeur requise absente : ${quoi}`);
  }
  return valeur;
}

/**
 * LES ARTEFACTS HISTORIQUES PRÉCÈDENT LA RÈGLE DE PROPRIÉTÉ (2026-10-10).
 *
 * Les documents de `benchmarks/air-emission/results/` sont des SORTIES DE
 * MESURE passées — ce que le moteur émettait à une date donnée. Plusieurs
 * portent des tables que le client mute sans dire à qui appartient une
 * ligne : `kaviva-spa` laisse lire, modifier et ANNULER le rendez-vous de
 * n'importe qui, parce que `ent_rendez_vous` ne référence que le soin et le
 * créneau, jamais la personne. C'est exactement la faille que le juge de
 * propriété existe pour refuser — et la refuser est JUSTE.
 *
 * ⚠️ CES ARTEFACTS NE SONT DONC PAS DES EXEMPLES SÛRS. On ne les corrige
 * pas : ce sont des mesures, et une mesure qu'on retouche ne mesure plus
 * rien. Les tests qui s'en servent mesurent AUTRE CHOSE (le fichier de
 * publication, les clés du manifeste, les primitives émises) : cette
 * fonction leur déclare la propriété que la règle exige désormais, pour que
 * ce qu'ils mesurent reste mesurable — sans toucher un octet du fichier.
 */
export function avecProprieteDeclaree<T>(doc: T): T {
  const air = JSON.parse(JSON.stringify(doc)) as {
    entities: { id: string; name: string; fields: { id: string; type: string; referencesEntityId?: string }[] }[];
    actions?: { effect?: { kind?: string; entityId?: string; instanceFrom?: string } }[];
    datasets?: { entityId: string }[];
  };
  const actions = air.actions ?? [];
  const identite = actions.find(
    (a) => a.effect?.kind === "mutation" && a.effect.instanceFrom === "session",
  )?.effect?.entityId;
  if (identite === undefined) return air as unknown as T;

  // Pour chaque entité que le client MUTE sans aucune référence vers les
  // personnes : on déclare le porteur. Un seul champ, nommé pour qu'il se
  // voie dans une sortie — personne ne doit croire qu'il vient du moteur.
  for (const entite of air.entities) {
    if (entite.id === identite) continue;
    const mutee = actions.some(
      (a) => a.effect?.kind === "mutation" && a.effect.entityId === entite.id,
    );
    if (!mutee) continue;
    const aUnPorteur = entite.fields.some((f) => f.type === "reference" && f.referencesEntityId === identite);
    if (aUnPorteur) continue;
    entite.fields.push({
      id: `fld_${entite.name}_porteur_declare_par_le_test`,
      name: "porteur_declare_par_le_test",
      type: "reference",
      required: true,
      referencesEntityId: identite,
    } as (typeof entite.fields)[number]);
  }
  return air as unknown as T;
}
