// R8 · V1 (EP-076) — CAMPAGNE PARAPHRASES : 7 domaines × 3, P0 SEUL.
//
// JAMAIS les huit passes. Chaque tirage : P0 (adaptateur seul) → P1
// (validerModele) → P2 (ecransDe + jugerPlanEcrans) → signatures — les
// dérivations sont PURES, la campagne ne paie que P0. Prompt SCELLÉ v7
// pour toute la campagne (hash recomparé au lancement) ; un prompt ajusté
// en cours de campagne ne mesure plus rien. Un échec P1/P2 est un TIRAGE,
// pas un domaine : la matrice publie les deux séparément.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { BRIEFS_V1 } from "./v1-briefs.mjs";

const HERE = join(fileURLToPath(import.meta.url), "..");
const passe0 = await import(join(HERE, "passe0.mjs"));
const mm = await import(join(HERE, "modele-metier.mjs"));
const adaptateur = await import(join(HERE, "adaptateur-anthropic.mjs"));

// ── GARDE (patron EP-030/EP-065) : jeton + plafond obligatoires. ──
if (process.env.GO_V1_PARAPHRASES !== "OUI-JE-PAIE") {
  console.error("REFUS : GO_V1_PARAPHRASES=OUI-JE-PAIE requis (GO budgétaire EP-076).");
  process.exit(2);
}
const PLAFOND_USD = Number(process.env.BUDGET_USD ?? NaN);
if (!Number.isFinite(PLAFOND_USD) || PLAFOND_USD <= 0) {
  console.error("REFUS : BUDGET_USD requis.");
  process.exit(2);
}
const REGLAGES = { max_tokens: 9000, plafondUsd: 0.3 };
const HASH_PROMPT_SCELLE = "7b41480edb1719f569b64a917f69736d233aaa249fae301e1a81a1b6e413582d";
const hash = createHash("sha256").update(passe0.PROMPT_P0).digest("hex");
if (hash !== HASH_PROMPT_SCELLE) {
  console.error(`REFUS : prompt non scellé (${hash.slice(0, 8)}… ≠ v7).`);
  process.exit(2);
}

const client = await adaptateur.creerClient((chemin) =>
  readFileSync(join(HERE, "..", "..", ...chemin), "utf8"),
);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const JOURNAL = join(HERE, "results", `v1-paraphrases-${RUN_ID}.jsonl`);
let depense = 0;
let alerte90 = false;
const lignes = [];

const signatureGrossiere = (m) => {
  const caps = (mm.capacitesDe(m).capacites ?? [])
    .map((c) => c.capacite + (c.methode ? "." + c.methode : ""))
    .sort();
  const gestes = [...new Set(m.parcours.flatMap((p) => p.etapes.map((e) => e.geste)))].sort();
  const chrome = mm.ecransDe(m).chrome;
  return `caps[${caps.join(",")}] gestes[${gestes.join(",")}] chrome[${JSON.stringify(chrome)}]`;
};

for (const brief of BRIEFS_V1) {
  const etiquette = `${brief.domaine}#p${brief.paraphrase}`;
  if (depense + REGLAGES.plafondUsd > PLAFOND_USD) {
    console.log(`ARRÊT BUDGET avant ${etiquette} — dépensé ${depense.toFixed(4)} $, appel pire cas ${REGLAGES.plafondUsd} $.`);
    break;
  }
  const requete = passe0.construireRequeteP0(brief.text);
  const { grammaire } = adaptateur.degraderGrammaire(requete.grammaire);
  const reponse = await client.messages.create(
    adaptateur.construireAppel({ ...requete, grammaire }, REGLAGES),
  );
  const neutre = adaptateur.lireReponse(reponse);
  const cout = adaptateur.coutUsd(neutre.usage);
  depense += cout;
  if (!alerte90 && depense >= 0.9 * PLAFOND_USD) {
    alerte90 = true;
    console.log(`  ⚠ ALERTE 90 % (EP-050) — dépensé ${depense.toFixed(4)} / ${PLAFOND_USD} $ après ${etiquette}`);
  }
  const verdict = passe0.jugerSortieP0(neutre.texte, brief.text, { tronquee: neutre.tronquee });
  writeFileSync(
    join(HERE, "results", `v1-${etiquette.replace("#", "-")}.${RUN_ID}.json`),
    JSON.stringify({ brief: brief.text, coutUsd: cout, sortieBrute: neutre.texte, p1: verdict.diagnostics.map((d) => d.code) }, null, 2) + "\n",
    { flag: "wx" },
  );
  const ligne = { domaine: brief.domaine, paraphrase: brief.paraphrase, coutUsd: Number(cout.toFixed(4)) };
  if (!verdict.ok) {
    ligne.arret = "P1";
    ligne.diagnostics = verdict.diagnostics.map((d) => d.code);
  } else {
    const m = verdict.modele;
    const plan = mm.ecransDe(m);
    const d2 = [...plan.diagnostics, ...mm.jugerPlanEcrans(plan, m)];
    if (d2.length > 0) {
      ligne.arret = "P2";
      ligne.diagnostics = d2.map((x) => x.code);
    } else {
      ligne.arret = "passe";
    }
    ligne.concepts = m.concepts.length;
    ligne.parcours = m.parcours.length;
    ligne.surfaces = mm.surfacesDe(m).length;
    ligne.signature = signatureGrossiere(m);
    ligne.signatureSurfaces = mm.surfacesDe(m).map((s) => `${s.role}:${s.cardinalite}`).sort().join("|");
  }
  lignes.push(ligne);
  writeFileSync(JOURNAL, lignes.map((l) => JSON.stringify(l)).join("\n") + "\n");
  console.log(`  [${etiquette}] ${ligne.arret} · ${cout.toFixed(4)} $${ligne.signature ? " · " + ligne.signature.slice(0, 90) : " · " + (ligne.diagnostics ?? []).join(",")}`);
}

// ── MATRICE ET MESURES, telles qu'elles sortent ──
console.log(`\nMATRICE 7×3 (run ${RUN_ID}) :`);
const domaines = [...new Set(lignes.map((l) => l.domaine))];
for (const d of domaines) {
  const trio = lignes.filter((l) => l.domaine === d);
  const etats = trio.map((l) => (l.arret === "passe" ? "✓" : l.arret)).join(" · ");
  const sigs = new Set(trio.filter((l) => l.signature).map((l) => l.signature));
  const stable = trio.filter((l) => l.signature).length >= 2 && sigs.size === 1;
  console.log(`  ${d.padEnd(12)} ${etats} · coût ${trio.reduce((s, l) => s + l.coutUsd, 0).toFixed(4)} $ · signatures distinctes intra-domaine : ${sigs.size}${stable ? " (STABLE)" : ""}`);
}
const majoritaires = domaines
  .map((d) => {
    const sigs = lignes.filter((l) => l.domaine === d && l.signature).map((l) => l.signature);
    const compte = {};
    for (const s of sigs) compte[s] = (compte[s] ?? 0) + 1;
    return Object.entries(compte).sort((a, b) => b[1] - a[1])[0]?.[0];
  })
  .filter((s) => s !== undefined);
console.log(`signatures MAJORITAIRES distinctes entre domaines : ${new Set(majoritaires).size}/${majoritaires.length}`);
const passes = lignes.filter((l) => l.arret === "passe").length;
console.log(`taux P0→P2 global : ${passes}/${lignes.length} · coût total ${depense.toFixed(4)} $ · journal ${JOURNAL}`);
