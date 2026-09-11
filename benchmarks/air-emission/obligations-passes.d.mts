// Types du module d'obligations (étape ⑤) — consommés par le cliquet de test
// du compilateur. La vérité reste le .mjs ; ce fichier n'en est que l'ombre.
export interface PromesseDirecte {
  actionId: string;
  screenId: string;
  blockId: string;
  blockType: string;
}
export interface PromesseSecondaire {
  screenId: string;
  blockId: string;
}
export function actionsPromises(
  screens: readonly unknown[] | undefined,
): { directes: PromesseDirecte[]; secondaires: PromesseSecondaire[] };
export function ciblesVivantes(assembled: Record<string, unknown>): string[];
export function obligationsPourPasse(
  nomPasse: string,
  assembled: Record<string, unknown>,
): string;
