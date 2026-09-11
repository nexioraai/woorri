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
const REGLAGES = {
  model: "claude-opus-5",
  // §2 (décision arbitre, post-EP-048) — borne JUSTIFIÉE, plus estimée :
  // max(sorties P0 observées) = 6000 (tronquée) × 1,5 de marge = 9000.
  // Calcul consigné au registre (EP-050) ; règle des 90 % active.
  max_tokens: 9000,
  // température : ABSENTE (défaut du service, comme la campagne emit-v3 —
  // aucun réglage improvisé ; consigné tel quel).
  prixParMtok: { in: 5, out: 25 },
  plafondUsd: 0.3, // pire cas recalculé : 9000×25/1e6 + 4493×5/1e6 ≈ 0,2475 $
};
// v2 post-D6 (glossaire temporel) — v1 98014b65… = estampille de la série close.
const HASH_PROMPT_SCELLE = "7ece34cbabc048c6bf38b3d4632cb8c87d0757edcc58c56a0111a2336868643d";

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
const coutMax =
  ((requete.system.length + requete.user.length) / 4 / 1e6) * REGLAGES.prixParMtok.in +
  (REGLAGES.max_tokens / 1e6) * REGLAGES.prixParMtok.out;
if (coutMax > REGLAGES.plafondUsd) {
  console.error(`⛔ REFUS — coût max estimé ${coutMax.toFixed(4)} $ > plafond ${REGLAGES.plafondUsd} $`);
  process.exit(1);
}
console.log(`réglages: ${JSON.stringify({ ...REGLAGES, hashPrompt: hash.slice(0, 16) })}`);
console.log(`coût max estimé: ${coutMax.toFixed(4)} $ — UN SEUL APPEL.`);

// ── L'APPEL (unique) — même source de clé que la campagne, jamais affichée ──
const envLocal = readFileSync(join(HERE, "..", "..", "apps", "web", ".env.local"), "utf8");
const m = envLocal.match(/^ANTHROPIC_API_KEY=("?)([^"\n]+)\1$/m);
if (!m) {
  console.error("⛔ clé introuvable dans apps/web/.env.local");
  process.exit(1);
}
const { default: Anthropic } = await import("@anthropic-ai/sdk");
const client = new Anthropic({ apiKey: m[2] });
const t0 = Date.now();
const reponse = await client.messages.create({
  model: REGLAGES.model,
  max_tokens: REGLAGES.max_tokens,
  system: requete.system,
  messages: [{ role: "user", content: requete.user }],
  output_config: { format: { type: "json_schema", schema: requete.grammaire } },
});
const texte = reponse.content.map((b) => (b.type === "text" ? b.text : "")).join("");
const usage = reponse.usage ?? {};
const cout =
  ((usage.input_tokens ?? 0) * REGLAGES.prixParMtok.in +
    (usage.output_tokens ?? 0) * REGLAGES.prixParMtok.out) / 1e6;

// ── ARCHIVE BRUTE + VERDICT, rien de retouché ──
// ADAPTATEUR (de fait) : le dialecte fournisseur se mappe ICI en signal
// neutre — le juge ne connaît aucun stop_reason (§1).
const verdict = jugerSortieP0(texte, intention.text, {
  tronquee: reponse.stop_reason === "max_tokens",
});
// Règle des 90 % (EP-050) : une marge frôlée est une borne falsifiée.
const taux = (usage.output_tokens ?? 0) / REGLAGES.max_tokens;
if (taux >= 0.9) console.log(`⚠ RÈGLE 90 % : sortie à ${(taux * 100).toFixed(0)} % de la borne — réviser AVANT la mesure suivante.`);
const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
const artefact = join(HERE, "results", `dry-run-p0.${horodatage}.json`);
writeFileSync(
  artefact,
  JSON.stringify(
    {
      reglages: REGLAGES,
      hashPromptUtilise: hash,
      dureeMs: Date.now() - t0,
      coutUsd: cout,
      usage,
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
console.log(`coût réel: ${cout.toFixed(4)} $ · stop_reason: ${reponse.stop_reason}`);
console.log(`P1: ${verdict.ok ? "VERT" : "ROUGE"} (${verdict.diagnostics.length} diagnostic(s))`);
if (verdict.critereKaviva) console.log(`critère 2.1 (structurel): ${verdict.critereKaviva.pass ? "PASS" : "FAIL"} — ${JSON.stringify(verdict.critereKaviva.trouves)}`);
if (verdict.observation) console.log(`observation 2.3: ${JSON.stringify(verdict.observation)}`);
const PASS = verdict.ok && verdict.critereKaviva?.pass === true;
console.log(`\nVERDICT DRY-RUN = ${PASS ? "PASS" : "FAIL"} (critère EP-030-A ; portée EP-032 : kaviva, rien d'autre)`);
