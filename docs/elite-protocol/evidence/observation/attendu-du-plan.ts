// ════════════════════════════════════════════════════════════════════
//  CE QUE LE PLAN ATTEND D'UNE IDENTITÉ PRESSÉE — lu, jamais supposé.
// ════════════════════════════════════════════════════════════════════
//
// ── POURQUOI CE MODULE EXISTE.
//
// `couverture.obs.tsx` portait déjà cette lecture, et son en-tête en donne la
// doctrine : « Ce que le plan attend est lu dans les données d'écran ÉMISES,
// jamais supposé. » `navigation-primaire` en avait besoin le 2026-10-17 — il
// codait `"scr_plat_detail"` EN DUR et tombait sur `resto-quartier`, dont
// l'accueil déclare DEUX navigations légitimes : les catégories vers le menu,
// les suggestions vers le détail. Le test prenait la première et exigeait la
// seconde.
//
// Plutôt que d'écrire cette lecture une seconde fois — ce dépôt a vu quatre
// fois « une liste écrite deux fois diverge » —, elle vit ici et les deux
// fichiers la prennent.
//
// Ce module ne monte rien et ne presse rien : il LIT les données émises.

/** Les données d'écran telles que le compilateur les émet. */
export interface DonneesEcran {
  screenId: string;
  blocks: { id: string; blockType: string; props: Record<string, unknown> }[];
  actions: Record<string, { kind: string; screenId?: string }>;
  uiActionsByBlock: Record<string, string>;
}

/**
 * L'écran vers lequel le PLAN dit qu'une identité doit mener — ou `null`
 * quand le plan ne promet aucune navigation pour elle.
 *
 * L'identité d'une ligne de liste porte le suffixe `-row-<id>` : on remonte
 * au bloc qui la contient. Un `button` et un `empty_state` déclarent leur
 * action dans leurs PROPS ; les autres blocs passent par la table
 * `uiActionsByBlock` que le compilateur construit.
 */
export function cibleAttendue(d: DonneesEcran, testID: string): string | null {
  const row = /^(.*)-row-.+$/u.exec(testID);
  const blockId = row ? (row[1] ?? testID) : testID;
  const bloc = d.blocks.find((b) => b.id === blockId);
  if (!bloc) return null;
  const parProp = typeof bloc.props.actionId === "string" ? bloc.props.actionId : undefined;
  const parDeclencheur = d.uiActionsByBlock[blockId];
  const actionId = ["button", "empty_state"].includes(bloc.blockType) ? parProp : parDeclencheur;
  if (actionId === undefined) return null;
  const eff = d.actions[actionId];
  return eff?.kind === "navigate" && eff.screenId !== undefined ? eff.screenId : null;
}
