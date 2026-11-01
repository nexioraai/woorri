/**
 * LA PORTEE DE L'EPREUVE, EN UNE PHRASE — et CE MODULE RESTE PUR.
 *
 * ── POURQUOI IL EXISTE SEPAREMENT DU JUGE.
 *
 * Cette fonction vivait dans `juge-execution.ts`, qui possede les nombres.
 * C'etait le bon endroit pour la LOGIQUE et le mauvais pour le PAQUET : le
 * juge importe `node:child_process`, `node:fs/promises`, `node:os` et
 * `node:path` — il lance un processus enfant bac a sable. L'ecran de
 * generation, lui, porte « use client ».
 *
 * MESURE DU 2026-11-01 : l'import a tire le juge dans le paquet navigateur,
 * et le build est mort sur six lignes d'erreur interne de Turbopack :
 *   Execution of make_chunks failed
 *   Execution of *EcmascriptChunkItemContent::new failed
 * Aucune ne nomme la cause. La gate l'a attrape — c'est elle le cliquet de
 * cette classe — mais seulement a l'etape `build`, apres huit minutes.
 *
 * ── LA REGLE, ECRITE ICI PARCE QUE C'EST ICI QU'ON LA CASSERAIT.
 *
 * CE FICHIER N'IMPORTE RIEN. Pas de `node:`, pas de client Supabase, rien
 * qui ne tourne pas dans un navigateur. Toute phrase partagee entre l'ecran
 * et le moteur se range ici ; le juge la RE-EXPORTE pour que ses appelants
 * d'hier ne changent pas.
 */

/**
 * CE QUE VAUT L'EPREUVE, EN PROPORTION — pas seulement en paire brute.
 *
 * ── POURQUOI LA PROPORTION, ET PAS « 24 sur 113 ».
 *
 * Mesure sortie de la sonde de production le 2026-11-01 (oeuvre f21071cf) :
 * 24 controles ouverts sur 113 decouverts. Le proprietaire a tranche : un
 * lecteur presse lit « 24 » et croit que c'est beaucoup. C'est 21 %.
 *
 * La paire reste affichee — elle dit ce qui a ete compte — mais la
 * proportion vient avec, parce que c'est elle qui dit ce que vaut un
 * « livree ». Et quand elle est accompagnee de
 * `verifieDansNavigateur: false`, les deux ensemble disent exactement ce
 * qu'une application livree a reellement traverse.
 */
export function proportionEprouvee(
  visites: number,
  decouverts: number,
  ecransAtteints?: number,
): string {
  if (decouverts <= 0) return `${String(visites)} controle(s)`
  const pour = Math.round((visites / decouverts) * 100)
  const base = `${String(visites)} sur ${String(decouverts)} (${String(pour)} %)`
  // ── LE PERIMETRE VOYAGE AVEC LE CHIFFRE, SINON LE CHIFFRE MENT PAR CADRAGE.
  //
  // MESURE DU 2026-11-01 (oeuvre f21071cf) : 24 sur 113, et 113 n'est PAS le
  // nombre de controles de l'oeuvre. Le juge accumule ce que
  // `querySelectorAll` trouve APRES CHAQUE CLIC : seuls les controles des
  // ecrans REELLEMENT ATTEINTS y entrent. L'oeuvre declarait 11 ecrans, le
  // juge en a ouvert 10 — les controles du onzieme ne comptent nulle part.
  //
  // Un pourcentage trop optimiste est PIRE qu'un pourcentage absent : il a
  // l'air d'une mesure. On dit donc sur quoi il porte.
  return ecransAtteints === undefined || ecransAtteints <= 0
    ? base
    : `${base} des controles des ${String(ecransAtteints)} ecran(s) atteint(s)`
}
