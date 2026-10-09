// ============================================================
// LE TABLEAU DE DECISION DE LA GATE — prouve contre les VRAIS juges.
//
// `validateLocal`, `perimetreDeJugement`, `elargit` sont ceux
// d'`acceptation.mjs` — pas des imitations : un faux juge prouverait un
// faux tableau. Cout nul : aucune grammaire ne part, aucun appel.
// (Execution : npx tsx — acceptation importe des .ts.)
// ============================================================
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

let echecs = 0;
const verifie = (nom, condition, detail = "") => {
  if (condition) { console.log(`  ✅ ${nom}`); return; }
  console.error(`  🔴 ${nom}${detail === "" ? "" : ` — ${detail}`}`);
  echecs += 1;
};

const acceptation = await import(join(HERE, "acceptation.mjs"));
const { creerGateReparation } = await import(join(HERE, "gate-reparation.mjs"));
const airSchema = await import(join(REPO, "packages/air-schema/src/index.ts"));
const gate = creerGateReparation({
  validateLocal: acceptation.validateLocal,
  perimetreDeJugement: acceptation.perimetreDeJugement,
  elargit: acceptation.elargit,
});

// Un document VALIDE au schema (le vrai corpus, migre) et un INVALIDE.
const DOC_VALIDE = airSchema.migrateAirDocument(
  JSON.parse(readFileSync(join(REPO, "packages/golden-corpus/corpus-v3/bus-intercites.air.json"), "utf8")),
);
const AIR_VALIDE = acceptation.validateLocal(DOC_VALIDE).air;
const DOC_INVALIDE = { airSchemaVersion: "1.34.0" }; // air null garanti
const PRESCRIPTIF = { modele: {}, plan: {}, ecransDIdentite: [] };
const D = (code, path) => ({ code, path });

// ── VECTEUR 1 : OSCILLATION — un introduit, meme perimetre → REJET.
{
  const v = gate.verdict({
    diagnosticsAvant: [D("A", "x")],
    diagnosticsApres: [D("A", "x"), D("B", "y")],
    documentAvant: DOC_VALIDE,
    airApres: AIR_VALIDE,
    prescriptif: PRESCRIPTIF,
  });
  verifie("oscillation : diagnostic INTRODUIT a perimetre egal → rejetee",
    v.rejetee === true && v.revelation === false && v.introduits.length === 1 && v.introduits[0].code === "B");
}

// ── VECTEUR 2 : REVELATION — le perimetre s'ELARGIT (invalide → valide) :
// les diagnostics apparus sont REVELES, la reparation est RETENUE.
{
  const v = gate.verdict({
    diagnosticsAvant: [D("SCHEMA", "z")],
    diagnosticsApres: [D("C", "p"), D("E", "q")],
    documentAvant: DOC_INVALIDE,
    airApres: AIR_VALIDE,
    prescriptif: PRESCRIPTIF,
  });
  verifie("revelation : invalide→valide, introduits REVELES → retenue",
    v.rejetee === false && v.revelation === true &&
      v.perimetreAvant.length === 0 && v.perimetreApres.length === 3);
}

// ── VECTEUR 3 : REDUCTION — aucun introduit → retenue (la stagnation, elle,
// se juge au compte, dans la boucle : la gate n'a rien a y dire).
{
  const v = gate.verdict({
    diagnosticsAvant: [D("A", "x"), D("B", "y")],
    diagnosticsApres: [D("A", "x")],
    documentAvant: DOC_VALIDE,
    airApres: AIR_VALIDE,
    prescriptif: PRESCRIPTIF,
  });
  verifie("reduction : aucun introduit → retenue", v.rejetee === false && v.introduits.length === 0);
}

// ── VECTEUR 4 : REGRESSION FRANCHE — le perimetre RETRECIT (valide →
// invalide) : les SCHEMA apparus sont des introduits, pas une revelation.
{
  const v = gate.verdict({
    diagnosticsAvant: [D("A", "x")],
    diagnosticsApres: [D("SCHEMA", "entities"), D("SCHEMA", "screens")],
    documentAvant: DOC_VALIDE,
    airApres: null,
    prescriptif: PRESCRIPTIF,
  });
  verifie("regression : perimetre retreci, SCHEMA introduits → rejetee",
    v.rejetee === true && v.revelation === false && v.perimetreApres.length === 0);
}

// ── VECTEUR 5 : MEME CHEMIN, MEME CODE — pas un introduit.
{
  const v = gate.verdict({
    diagnosticsAvant: [D("A", "x")],
    diagnosticsApres: [D("A", "x")],
    documentAvant: DOC_VALIDE,
    airApres: AIR_VALIDE,
    prescriptif: PRESCRIPTIF,
  });
  verifie("identite : memes diagnostics → aucun introduit, retenue",
    v.rejetee === false && v.introduits.length === 0);
}

console.log(echecs === 0 ? "\n✅ gate : le tableau de decision tient contre les vrais juges." : `\n🔴 ${String(echecs)} echec(s).`);
process.exit(echecs === 0 ? 0 : 1);
