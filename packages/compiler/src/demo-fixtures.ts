// FIXTURES DÉTERMINISTES (4.5, D-026 S2 / D-030) — fonction PURE : pour
// chaque dataset de l'AIR, `rowCount` lignes dérivées du SCHÉMA d'entité,
// PRNG seedé par le `contentHash` du dataset (zéro LLM, zéro horloge,
// byte-stable — l'alternative LLM a été analysée et écartée au dossier
// D-026 : nécessité non démontrée). Valeurs textuelles = DONNÉES de l'AIR
// (noms de champs/d'énumérations) + numéros — jamais de texte moteur (F3,
// lecture D-028 §1). Dates : arithmétique pure sur base fixe 2026-01-01
// (aucun appel d'horloge). Assets : chaîne vide (Content Pipeline §19,
// phases ultérieures). Références : ligne déterministe de l'entité cible
// si un dataset existe, sinon chaîne vide.
import type { ProjectAir } from "@deribfy/air-schema";

// mulberry32 — PRNG 32 bits déterministe, sans dépendance.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seedFromHash = (contentHash: string): number =>
  Number.parseInt(contentHash.slice(0, 8), 16) >>> 0;

export interface DemoInstance {
  id: string;
  values: Record<string, string>;
}

const DAY_MS = 86_400_000;
const BASE_2026_01_01_MS = Date.UTC(2026, 0, 1);

// Ids de lignes PAR ENTITÉ (pas par dataset) : une entité servie par
// plusieurs datasets garde des ids continus — les champs `reference`
// pointent ainsi toujours sur des ids réels.
const rowId = (entityId: string, index: number): string =>
  `${entityId}_row_${index + 1}`;

export function buildDemoFixtures(air: ProjectAir): Record<string, DemoInstance[]> {
  // rowCount de la PREMIÈRE occurrence par entité (ordre des datasets de
  // l'AIR) — plusieurs datasets par entité : lignes concaténées dans
  // l'ordre de déclaration (déterministe).
  const rowCountByEntity = new Map<string, number>();
  for (const dataset of air.datasets) {
    rowCountByEntity.set(
      dataset.entityId,
      (rowCountByEntity.get(dataset.entityId) ?? 0) + dataset.rowCount,
    );
  }
  const entitiesById = new Map(air.entities.map((e) => [e.id, e]));

  const fixtures: Record<string, DemoInstance[]> = {};
  for (const dataset of air.datasets) {
    const entity = entitiesById.get(dataset.entityId);
    if (entity === undefined) continue; // impossible après validateurs.
    const rand = mulberry32(seedFromHash(dataset.contentHash));
    const rows = fixtures[dataset.entityId] ?? [];
    const offset = rows.length;
    for (let i = 0; i < dataset.rowCount; i += 1) {
      const values: Record<string, string> = {};
      for (const field of entity.fields) {
        // 1.12.0 — un champ SENSIBLE ne reçoit aucune valeur de démo : inventer
        // un mot de passe de fixture, c'est en écrire un dans l'artefact.
        if (field.sensitive === true) continue;
        values[field.id] = fixtureValue(field, offset + i, rand, {
          rowCountByEntity,
        });
      }
      rows.push({ id: rowId(dataset.entityId, offset + i), values });
    }
    fixtures[dataset.entityId] = rows;
  }
  return fixtures;
}

interface RefContext {
  rowCountByEntity: Map<string, number>;
}

function fixtureValue(
  field: ProjectAir["entities"][number]["fields"][number],
  index: number,
  rand: () => number,
  refs: RefContext,
): string {
  const n = index + 1;
  // 1.20.0 — le DOCUMENT déclare ses valeurs de démo : on les cycle,
  // déterministe. Sans déclaration, la forme historique reste.
  if (
    field.demoValues !== undefined &&
    (field.type === "string" ||
      field.type === "text" ||
      field.type === "asset" ||
      // 1.21 — un prix de démo réaliste (« 145000 ») vaut mieux qu'un tirage
      // décimal (« 622.44 ») : les valeurs d'instance sont des chaînes.
      field.type === "number" ||
      field.type === "decimal")
  ) {
    // 1.20 — pour un champ IMAGE, les demoValues sont des URLs https RÉELLES
    // (exigence propriétaire : « je veux voir de vraies images ») ; leur hôte
    // est vérifié contre allowedDomains par le validateur, fail-closed.
    return field.demoValues[index % field.demoValues.length] ?? "";
  }
  switch (field.type) {
    case "string":
    case "text":
      return `${field.name} ${n}`;
    case "number":
      // EP-188 ③ — CE TIRAGE EST LE DERNIER RECOURS, ET IL EST MAINTENANT DIT.
      //
      // MESURÉ sur le run EP-186 : un bureau de 907 pièces pour 933 m², un
      // terrain « à louer » à 628 FCFA. Tout champ numérique reçoit 1 à 999
      // QUEL QUE SOIT SON SENS — pièces, surface, prix : même loi. Un
      // relecteur d'Apple ouvre l'app et voit ça ; 4.2 punit la
      // fonctionnalité minimale.
      //
      // VÉRIFIÉ, ET C'EST POURQUOI LE TIRAGE RESTE : le contrat ne porte
      // AUCUNE borne sur un champ (`min`/`max` n'existent pas au schéma). Ce
      // module ne peut donc pas deviner l'échelle d'un nombre — 3 pièces,
      // 120 m², 45 000 000 FCFA n'ont aucune loi commune.
      //
      // L'ÉCHAPPEMENT EXISTE DÉJÀ ET EST EMPLOYÉ PLUS HAUT : si le champ
      // porte des `demoValues`, elles sont servies telles quelles — pour les
      // nombres comme pour les images. La réponse n'est donc pas ici mais
      // dans le PROMPT : c'est au générateur de poser des valeurs qui ont un
      // sens, comme la règle 1.20 l'exige déjà pour les images.
      return String(1 + Math.floor(rand() * 999));
    case "decimal":
      return (Math.floor(rand() * 99_900) / 100 + 1).toFixed(2);
    case "boolean":
      return rand() < 0.5 ? "true" : "false";
    case "date": {
      const days = Math.floor(rand() * 365);
      return new Date(BASE_2026_01_01_MS + days * DAY_MS)
        .toISOString()
        .slice(0, 10);
    }
    case "datetime": {
      const minutes = Math.floor(rand() * 365 * 24 * 60);
      return new Date(BASE_2026_01_01_MS + minutes * 60_000).toISOString();
    }
    case "enum": {
      const options = field.enumValues ?? [];
      if (options.length === 0) return "";
      return options[Math.floor(rand() * options.length)] ?? "";
    }
    case "reference": {
      const target = field.referencesEntityId;
      if (target === undefined) return "";
      const count = refs.rowCountByEntity.get(target) ?? 0;
      if (count === 0) return "";
      return rowId(target, Math.floor(rand() * count));
    }
    case "asset": {
      // PLACEHOLDER DETERMINISTE (D-087) — un `asset` rendait la chaine VIDE :
      // meme avec un bloc image, il n'y avait RIEN a afficher. Le defaut vivait
      // a trois etages (registre, runtime, fixtures) ; corriger les deux
      // premiers n'aurait rien montre.
      //
      // Data URI, jamais une URL : le cliquet ZERO-RESEAU l'exige, et une
      // preview qui telecharge n'est pas deterministe. La teinte derive de la
      // graine : deux lignes different, une meme ligne reste identique.
      //
      // C'est un SUBSTITUT, pas une image reelle. Les vrais visuels viendront
      // d'un provider de donnees (Phase 5+), pas d'ici.
      const teinte = Math.floor(rand() * 360);
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">' +
        `<rect width="96" height="96" fill="hsl(${String(teinte)},45%,72%)"/></svg>`;
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
    case "json":
      return "{}";
    default:
      return "";
  }
}
