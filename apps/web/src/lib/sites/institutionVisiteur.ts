// CE QU'UN VISITEUR VOIT D'UN SITE (lot 4c, 2026-11-26) — TOUS LES THÈMES.
//
// Depuis le lot 4c, l'éditeur ajoute des lignes « À compléter » à n'importe quel
// bloc, sur n'importe quel site (la CPA comprise). Une telle ligne n'est JAMAIS
// montrée à un visiteur : `BlocsDePage` applique ce filtre par défaut, et ne
// l'enlève que pour le propriétaire vérifié. Mesuré le 2026-11-26 : sur les 84
// pages des sites hors institution, ce filtre ne change RIEN à ce qui est servi.
//
// RÈGLE ABSOLUE du propriétaire : aucune section visible des visiteurs sans
// données réelles. Le squelette sème des cases « À compléter » : elles disent
// au PROPRIÉTAIRE quoi ajouter et où ; un visiteur ne les voit jamais. Une
// page dont il ne reste rien pour lui sort du menu ; une ligne de tableau ou
// une case non remplie disparaît, le reste demeure.
//
// PUR : aucune lecture, aucun composant. Importable par le navigateur.

/** Le mot qui marque une case non remplie. Toujours écrit ainsi par le squelette. */
export const A_COMPLETER = 'À compléter'

/** Une valeur non remplie : vide, ou qui commence par « À compléter ». */
export function nonRempli(v: unknown): boolean {
  if (typeof v !== 'string') return true
  const t = v.trim()
  return t === '' || t.toLocaleLowerCase('fr').startsWith(A_COMPLETER.toLocaleLowerCase('fr'))
}

type B = Record<string, unknown> & { type?: unknown }

/** Un encadré destiné au seul propriétaire : titré « À compléter » ou « Visible par vous seul ». */
export function encadreDuProprietaire(b: B): boolean {
  if (b.type !== 'encadre') return false
  const t = typeof b.titre === 'string' ? b.titre.trim().toLocaleLowerCase('fr') : ''
  return t.startsWith(A_COMPLETER.toLocaleLowerCase('fr')) || t.startsWith('visible par vous seul')
}

const items = (b: B): unknown[] => (Array.isArray(b.items) ? b.items : [])

/** Une ligne porte-t-elle une case « À compléter » (n'importe lequel de ses textes) ? */
export function ligneACompleter(x: unknown): boolean {
  if (typeof x === 'string') return x.trim() !== '' && nonRempli(x)
  if (Array.isArray(x)) return x.some(ligneACompleter)
  if (x && typeof x === 'object') return Object.values(x as Record<string, unknown>).some(ligneACompleter)
  return false
}

/**
 * Les blocs d'une page, tels qu'un VISITEUR doit les voir : sans encadré du
 * propriétaire, sans case « À compléter » ; un bloc vidé disparaît entier.
 */
export function blocsPourVisiteur<T>(blocs: readonly T[]): T[] {
  const sortie: T[] = []
  for (const brut of blocs) {
    const b = brut as unknown as B
    if (!b || typeof b !== 'object') continue
    if (encadreDuProprietaire(b)) continue
    switch (b.type) {
      case 'liste': {
        const xs = items(b).filter((x) => !nonRempli(x))
        if (xs.length > 0) sortie.push({ ...b, items: xs } as unknown as T)
        continue
      }
      case 'chiffres': {
        const xs = items(b).filter((x) => !nonRempli((x as B)?.valeur) && !ligneACompleter(x))
        if (xs.length > 0) sortie.push({ ...b, items: xs } as unknown as T)
        continue
      }
      case 'tableau': {
        const lignes = (Array.isArray(b.lignes) ? b.lignes : []).filter((l) => Array.isArray(l) && !l.some((c) => typeof c === 'string' && nonRempli(c) && c.trim() !== ''))
        if (lignes.length > 0) sortie.push({ ...b, lignes } as unknown as T)
        continue
      }
      case 'organigramme': {
        const xs = items(b).filter((x) => !nonRempli((x as B)?.fonction) && !ligneACompleter(x))
        if (xs.length > 0) sortie.push({ ...b, items: xs } as unknown as T)
        continue
      }
      default: {
        // Toute autre liste de lignes (documents, étapes, frise, questions, liens,
        // galerie, partenaires…) : une ligne non remplie disparaît ; plus rien, plus de bloc.
        if (Array.isArray(b.items)) {
          const xs = items(b).filter((x) => !ligneACompleter(x))
          if (xs.length > 0) sortie.push({ ...b, items: xs } as unknown as T)
          continue
        }
        sortie.push(brut)
      }
    }
  }
  return sortie
}

/** Une page qui n'a RIEN à montrer à un visiteur (ni chapeau, ni texte, ni bloc réel). */
export function videPourVisiteur(p: { chapeau?: string | null; corps?: string | null; blocs: readonly unknown[] }): boolean {
  return nonRempli(p.chapeau ?? '') && nonRempli(p.corps ?? '') && blocsPourVisiteur(p.blocs).length === 0
}

/** La fiche d'un programme : les lignes « Statut / Date / Bailleur » de son tableau. */
export type FicheProgramme = { statut: string | null; date: string | null; bailleur: string | null }

export function ficheProgramme(blocs: readonly unknown[]): FicheProgramme {
  const fiche: FicheProgramme = { statut: null, date: null, bailleur: null }
  for (const brut of blocs) {
    const b = brut as B
    if (b?.type !== 'tableau' || !Array.isArray(b.lignes)) continue
    for (const l of b.lignes) {
      if (!Array.isArray(l) || l.length < 2) continue
      const [cle, valeur] = [String(l[0] ?? '').trim().toLocaleLowerCase('fr'), String(l[1] ?? '').trim()]
      if (nonRempli(valeur)) continue
      if (cle === 'statut') fiche.statut = valeur
      else if (cle === 'date') fiche.date = valeur
      else if (cle === 'bailleur') fiche.bailleur = valeur
    }
  }
  return fiche
}
