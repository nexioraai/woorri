/**
 * L'ATELIER S'OUVRE TOUT SEUL APRÈS UNE GÉNÉRATION (2026-11-17).
 *
 * ── LE DÉFAUT, MESURÉ DANS LE CODE.
 *
 * Le propriétaire devait repasser par « Mes projets » puis « Ouvrir dans
 * l'atelier ». L'écran de création portait pourtant un lien vers l'atelier
 * sous l'aperçu — mais il ne s'affichait que si `generationId` était posé,
 * et le chemin du moteur `direct` ne le posait JAMAIS : la route rend
 * `id` dans sa réponse (`direct/route.ts`, `id: ecrit.data?.id ?? null`),
 * l'écran ne le lisait pas. Le lien était donc mort pour toutes les
 * générations depuis le passage au moteur direct.
 *
 * ── POURQUOI UNE FONCTION ET PAS `useRouter`.
 *
 * L'écran de création se monte aussi hors du routeur de Next (tests de
 * comportement). Une navigation complète vers une page qui charge tout par
 * ses propres routes ne perd rien, et ne dépend d'aucun contexte.
 */
export function cheminAtelier(id: string): string {
  return `/atelier/${encodeURIComponent(id)}`
}

export function ouvrirAtelier(id: string): void {
  window.location.assign(cheminAtelier(id))
}
