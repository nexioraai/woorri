// ============================================================================
// LOT 4 — LE VOCABULAIRE FERMÉ DU CORPS D'UNE PAGE.
//
// Ces types sont le MIROIR EXACT de `site_pages_blocs_valides` en base
// (apps/web/supabase/sql/site_pages_blocs.sql). La base refuse un type
// inconnu ; ici le rendu refuse de le dessiner. Les deux doivent dire la
// même chose — le cliquet `vocabulaireBlocs.test.ts` le vérifie en LISANT
// le fichier SQL, pour qu'un ajout d'un seul côté rougisse.
//
// Rien ici n'accepte de HTML. Chaque champ est du texte, rendu comme du
// texte. C'est ce qui garde `dangerouslySetInnerHTML` HORS du moteur : ce
// n'est pas une consigne qu'on peut oublier, c'est une forme qui ne le
// permet pas.
// ============================================================================

export const TYPES_DE_BLOC = [
  'titre', 'texte', 'liste', 'etapes', 'frise', 'chiffres',
  'tableau', 'documents', 'questions', 'encadre', 'liens', 'appel',
  'image', 'galerie', 'citation',
] as const

export type TypeDeBloc = (typeof TYPES_DE_BLOC)[number]

export type Bloc =
  | { type: 'titre'; texte: string; niveau?: 2 | 3 }
  | { type: 'texte'; texte: string }
  | { type: 'liste'; items: string[]; titre?: string }
  | { type: 'etapes'; items: { titre: string; texte?: string }[]; titre?: string }
  | { type: 'frise'; items: { date: string; titre: string; texte?: string }[]; titre?: string }
  | { type: 'chiffres'; items: { valeur: string; libelle: string }[]; titre?: string }
  | { type: 'tableau'; entetes: string[]; lignes: string[][]; titre?: string; note?: string }
  | { type: 'documents'; items: { nom: string; url: string; format?: string; poids?: string }[]; titre?: string }
  | { type: 'questions'; items: { question: string; reponse: string }[]; titre?: string }
  | { type: 'encadre'; texte: string; ton?: 'info' | 'attention'; titre?: string }
  | { type: 'liens'; items: { libelle: string; chemin: string }[]; titre?: string }
  | { type: 'appel'; libelle: string; chemin: string; texte?: string }
  | { type: 'image'; url: string; alt: string; legende?: string }
  | { type: 'galerie'; items: { url: string; alt: string; legende?: string }[]; titre?: string }
  | { type: 'citation'; texte: string; auteur?: string; fonction?: string }

/**
 * Lit ce qui vient de la base. La base a DÉJÀ refusé les types inconnus, mais
 * une vue peut être relue par un code plus récent que la contrainte : on ne
 * fait donc jamais confiance à la forme, on la vérifie.
 *
 * Un bloc mal formé est ÉCARTÉ, jamais rendu à moitié — une page qui affiche
 * un tableau sans ses lignes ment plus qu'une page qui ne l'affiche pas.
 */
export function lireBlocs(brut: unknown): Bloc[] {
  if (!Array.isArray(brut)) return []
  const out: Bloc[] = []
  for (const e of brut) {
    if (!e || typeof e !== 'object') continue
    const b = e as Record<string, unknown>
    const t = b.type
    if (typeof t !== 'string' || !(TYPES_DE_BLOC as readonly string[]).includes(t)) continue
    if (estBienForme(t as TypeDeBloc, b)) out.push(b as unknown as Bloc)
  }
  return out
}

const txt = (v: unknown) => typeof v === 'string' && v.trim().length > 0
const tableauDe = (v: unknown, ok: (o: Record<string, unknown>) => boolean) =>
  Array.isArray(v) && v.length > 0 &&
  v.every((o) => !!o && typeof o === 'object' && ok(o as Record<string, unknown>))

function estBienForme(t: TypeDeBloc, b: Record<string, unknown>): boolean {
  switch (t) {
    case 'titre':
    case 'texte':
      return txt(b.texte)
    case 'encadre':
      return txt(b.texte)
    case 'liste':
      return Array.isArray(b.items) && b.items.length > 0 && b.items.every(txt)
    case 'etapes':
      return tableauDe(b.items, (o) => txt(o.titre))
    case 'frise':
      return tableauDe(b.items, (o) => txt(o.date) && txt(o.titre))
    case 'chiffres':
      return tableauDe(b.items, (o) => txt(o.valeur) && txt(o.libelle))
    case 'tableau':
      return (
        Array.isArray(b.entetes) && b.entetes.length > 0 && b.entetes.every(txt) &&
        Array.isArray(b.lignes) && b.lignes.length > 0 &&
        b.lignes.every((l) => Array.isArray(l) && l.length === (b.entetes as unknown[]).length)
      )
    case 'documents':
      return tableauDe(b.items, (o) => txt(o.nom) && txt(o.url))
    case 'questions':
      return tableauDe(b.items, (o) => txt(o.question) && txt(o.reponse))
    case 'liens':
      return tableauDe(b.items, (o) => txt(o.libelle) && txt(o.chemin))
    case 'appel':
      return txt(b.libelle) && txt(b.chemin)
    case 'image':
      return txt(b.url) && txt(b.alt)       // `alt` EXIGE : une image sans texte de remplacement est invisible aux lecteurs d'ecran
    case 'galerie':
      return tableauDe(b.items, (o) => txt(o.url) && txt(o.alt))
    case 'citation':
      return txt(b.texte)
  }
}
