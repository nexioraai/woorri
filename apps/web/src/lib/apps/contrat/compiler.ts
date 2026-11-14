/**
 * V3 — LA COMPILATION D'UNE SPEC POUR LE MOTEUR DE RENDU (côté Deribfy).
 *
 * Chaque texte écrit en clair par le modèle devient `{ $k, $t }` : sa clé
 * FABRIQUÉE (textes.ts, la même que celle des traductions) et son texte dans
 * la langue principale. Les traductions deviennent des dictionnaires par
 * langue. Aucune autre transformation : le moteur lit le contrat tel quel.
 */
import type { Spec } from './catalogue'
import type { AppCompilee, EcranCompile, LangueApp } from './rendu/moteur'
import { textesDe } from './textes'

type O = Record<string, unknown>

/** Pose `v` au chemin `corps[2].enfants[0].libelle` d'un objet. */
function poser(racine: O, chemin: string, v: unknown): void {
  const pas = chemin.replace(/\[(\d+)\]/gu, '.$1').split('.')
  let o: unknown = racine
  for (const p of pas.slice(0, -1)) o = (o as O)[p]
  ;(o as O)[pas[pas.length - 1]!] = v
}

export function compilerEcran(ecran: unknown): EcranCompile {
  const e = structuredClone(ecran) as O
  for (const t of textesDe(ecran)) poser(e, t.chemin, { $k: t.cle, $t: t.texte })
  return e as unknown as EcranCompile
}

export function compilerApp(spec: Spec, o: { readonly nom: string; readonly langues: readonly LangueApp[]; readonly devise: string | null }): AppCompilee {
  const dictionnaires: Record<string, Record<string, string>> = {}
  for (const t of spec.traductions ?? []) dictionnaires[t.langue] = Object.fromEntries(t.textes.map((x) => [x.cle, x.texte]))
  return {
    nom: o.nom,
    langues: o.langues,
    devise: o.devise,
    ecrans: spec.ecrans.map(compilerEcran),
    barre: spec.barre,
    dictionnaires,
  }
}
