/**
 * CE QUE LA DÉCLARATION DIT DU VISITEUR, en une chaîne comparable (2026-11-23).
 *
 * Deux déclarations de même signature ouvrent la même porte publique : mêmes
 * tables publiques, mêmes colonnes, mêmes conditions de ligne. Sert à savoir
 * si une modification RÉÉCRIT la porte — et doit alors la réécrire sans fuite.
 */
import { lecturePubliqueDe, lecturePubliqueLue, nomTable, type EntiteDeclaree } from './entites-declarees'

export function signaturePublique(entites: readonly EntiteDeclaree[]): string {
  const lectures = signatureLectures(entites)
  // ── LA LECTURE PAR CLÉ FAIT PARTIE DE LA PORTE (É1). Sans table qui la
  //    déclare, la signature est celle d'avant, au caractère près.
  const parCle = entites
    .filter((e) => e.lectureParCle !== undefined)
    .map((e) => [nomTable(e), e.lectureParCle?.cle ?? null, [...(e.lectureParCle?.champs ?? [])].sort()])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
  return parCle.length === 0 ? lectures : JSON.stringify([lectures, parCle])
}

function signatureLectures(entites: readonly EntiteDeclaree[]): string {
  return JSON.stringify(
    entites
      .filter(lecturePubliqueDe)
      .map((e) => {
        const l = lecturePubliqueLue(e)
        return [nomTable(e), l.ok ? [...l.colonnes].sort() : null, l.ok ? l.conditions.map((c) => `${c.champ}=${String(c.vaut)}`).sort() : l.motif]
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  )
}
