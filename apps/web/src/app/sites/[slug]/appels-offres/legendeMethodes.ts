import type { Filtre } from './filtrerAvis'

// ============================================================
// LOT 5bis — LA LEGENDE DES TYPES DE MARCHE SE DEDUIT.
//
// EPSS affiche un encart « Types d'offres » : ICB, BCN. C'est leur typologie.
// Ecrire la notre en dur afficherait des sigles que la Centrale n'emploie
// PAS -- et un sigle inconnu sur un portail d'achats publics fait douter le
// fournisseur de tout le reste de la page.
//
// On lit donc les methodes REELLEMENT employees par les avis du site. Zero
// methode -> aucun encart : une legende vide est une promesse non tenue.
//
// LE TEXTE EXPLICATIF N'EST PAS ICI. Ce module rend les sigles PRESENTS ;
// ce qu'ils veulent dire vient des blocs editables de la page declaree
// `appels-offres`, parce que seule la Centrale sait ce que recouvre sa
// propre nomenclature.
// ============================================================

export type MethodeVue = { code: string; nombre: number }

/**
 * Les methodes presentes, de la plus employee a la moins employee, puis par
 * ordre alphabetique pour que deux chargements rendent le MEME ordre.
 *
 * Un ordre instable rend la page immemorisable : le lecteur qui revient ne
 * retrouve pas ce qu'il avait vu.
 */
export function methodesPresentes(avis: { methode?: string | null }[]): MethodeVue[] {
  const n = new Map<string, number>()
  for (const a of avis) {
    const m = (a.methode ?? '').trim()
    if (!m) continue
    n.set(m, (n.get(m) ?? 0) + 1)
  }
  return [...n.entries()]
    .map(([code, nombre]) => ({ code, nombre }))
    .sort((x, y) => (y.nombre - x.nombre) || x.code.localeCompare(y.code))
}

/** Le pictogramme d'un filtre. Un CARACTERE, jamais une image a charger. */
export const SIGNE_FILTRE: Record<Filtre, string> = {
  tous: '▦',
  ouvert: '◉',
  clos: '⊗',
  attribue: '✓',
  preparation: '◷',
}
