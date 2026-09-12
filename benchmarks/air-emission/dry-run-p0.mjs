// DRY-RUN P0 — LE LANCEUR (conduite arrêtée AVANT le tirage, 2026-09-11).
//
// UN SEUL APPEL, sous GARDE MÉCANIQUE : ce script REFUSE de partir sans le
// jeton explicite GO_DRY_RUN_P0="OUI-15-CENTIMES" (le GO budgétaire de
// Youssouf ne se présume pas — EP-018). Avant d'appeler : le hash du
// prompt est RECOMPARÉ au scellé (toute édition = refus), les réglages
// sont AFFICHÉS et identiques à ceux consignés (EP-033). La sortie BRUTE
// est archivée TELLE QUELLE, le verdict et l'observation 2.3 à côté —
// rien n'est complété, rien n'est retouché (règle 2.2 : un FAIL se traite
// par deux tirages identiques sous GO distinct, puis D6).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── RÉGLAGES CONSIGNÉS (EP-033) — identiques à la campagne, rien d'improvisé ──
// EP-051 — le modèle et les tarifs appartiennent à l'ADAPTATEUR (config) ;
// ici ne restent que les RÉGLAGES DE MESURE (borne justifiée EP-050).
const REGLAGES = {
  max_tokens: 9000,
  plafondUsd: 0.3, // pire cas : 9000×25/1e6 + 4493×5/1e6 ≈ 0,2475 $
};
// v2 post-D6 (glossaire temporel) — v1 98014b65… = estampille de la série close.
const HASH_PROMPT_SCELLE = "913380d974fe3d0c4944c6fdda0f2686bface3b51e11c59ccc4d218c8c2d2cef";

// ── GARDE 1 : le jeton du GO budgétaire ──
if (process.env.GO_DRY_RUN_P0 !== "OUI-15-CENTIMES") {
  console.error(
    [
      "⛔ REFUS — dry-run P0 sans GO budgétaire explicite.",
      'Le GO appartient à Youssouf : GO_DRY_RUN_P0="OUI-15-CENTIMES" node dry-run-p0.mjs',
      "Critère figé : EP-030-A · portée pré-rédigée : EP-032 · réglages : EP-033.",
    ].join("\n"),
  );
  process.exit(1);
}

const { construireRequeteP0, jugerSortieP0, PROMPT_P0 } = await import(join(HERE, "passe0.mjs"));
const adaptateur = await import(join(HERE, "adaptateur-anthropic.mjs"));
const { INTENTIONS } = await import(join(HERE, "intentions.mjs"));

// ── GARDE 2 : le prompt effectivement utilisé EST le scellé ──
const hash = createHash("sha256").update(PROMPT_P0).digest("hex");
if (hash !== HASH_PROMPT_SCELLE) {
  console.error(`⛔ REFUS — le prompt a été édité depuis le scellement : ${hash} ≠ ${HASH_PROMPT_SCELLE}`);
  process.exit(1);
}

const intention = INTENTIONS.find((i) => i.slug === "kaviva-spa");
if (intention === undefined) {
  console.error("⛔ intention kaviva-spa introuvable");
  process.exit(1);
}
const requete = construireRequeteP0(intention.text);

// ── GARDE 3 : plafond, estimé AVANT l'appel ──
const prix = adaptateur.CONFIG.prixParMtok;
const coutMax =
  ((requete.system.length + requete.user.length) / 4 / 1e6) * prix.entree +
  (REGLAGES.max_tokens / 1e6) * prix.sortie;
if (coutMax > REGLAGES.plafondUsd) {
  console.error(`⛔ REFUS — coût max estimé ${coutMax.toFixed(4)} $ > plafond ${REGLAGES.plafondUsd} $`);
  process.exit(1);
}
// EP-051 — la grammaire ENVOYÉE est la CANONIQUE dégradée par l'adaptateur,
// qui DÉCLARE ses écarts (consignés dans l'archive).
const { grammaire: grammaireDialecte, ecarts } = adaptateur.degraderGrammaire(requete.grammaire);
console.log(`réglages: ${JSON.stringify({ ...REGLAGES, model: adaptateur.CONFIG.model, hashPrompt: hash.slice(0, 16) })}`);
console.log(`écarts déclarés par l'adaptateur: ${ecarts.length}`);
console.log(`coût max estimé: ${coutMax.toFixed(4)} $ — UN SEUL APPEL.`);

// ── L'APPEL (unique) — TOUT dialecte via l'adaptateur (EP-051) ──
const client = await adaptateur.creerClient((chemin) =>
  readFileSync(join(HERE, "..", "..", ...chemin), "utf8"),
);
const t0 = Date.now();
const reponse = await client.messages.create(
  adaptateur.construireAppel({ ...requete, grammaire: grammaireDialecte }, REGLAGES),
);
const neutre = adaptateur.lireReponse(reponse);
const texte = neutre.texte;
const cout = adaptateur.coutUsd(neutre.usage);

// ── ARCHIVE BRUTE + VERDICT, rien de retouché ──
// ADAPTATEUR (de fait) : le dialecte fournisseur se mappe ICI en signal
// neutre — le juge ne connaît aucun stop_reason (§1).
const verdict = jugerSortieP0(texte, intention.text, { tronquee: neutre.tronquee });
// Règle des 90 % (EP-050) : une marge frôlée est une borne falsifiée.
const taux = neutre.usage.sortie / REGLAGES.max_tokens;
if (taux >= 0.9) console.log(`⚠ RÈGLE 90 % : sortie à ${(taux * 100).toFixed(0)} % de la borne — réviser AVANT la mesure suivante.`);
const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
const artefact = join(HERE, "results", `dry-run-p0.${horodatage}.json`);
writeFileSync(
  artefact,
  JSON.stringify(
    {
      reglages: { ...REGLAGES, model: adaptateur.CONFIG.model },
      ecartsAdaptateur: ecarts,
      hashPromptUtilise: hash,
      dureeMs: Date.now() - t0,
      coutUsd: cout,
      usage: neutre.usage,
      sortieBrute: texte,
      verdict: {
        ok: verdict.ok,
        diagnostics: verdict.diagnostics,
        critereKaviva: verdict.critereKaviva,
        observation: verdict.observation,
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(`archive: ${artefact}`);
console.log(`coût réel: ${cout.toFixed(4)} $ · tronquée: ${neutre.tronquee}`);
console.log(`P1: ${verdict.ok ? "VERT" : "ROUGE"} (${verdict.diagnostics.length} diagnostic(s))`);
if (verdict.critereKaviva) console.log(`critère 2.1 (structurel): ${verdict.critereKaviva.pass ? "PASS" : "FAIL"} — ${JSON.stringify(verdict.critereKaviva.trouves)}`);
if (verdict.observation) console.log(`observation 2.3: ${JSON.stringify(verdict.observation)}`);
const PASS = verdict.ok && verdict.critereKaviva?.pass === true;
console.log(`\nVERDICT DRY-RUN = ${PASS ? "PASS" : "FAIL"} (critère EP-030-A ; portée EP-032 : kaviva, rien d'autre)`);
