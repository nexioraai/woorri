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
  'articles',
  'organigramme',
  'partenaires',
] as const

export type TypeDeBloc = (typeof TYPES_DE_BLOC)[number]

/**
 * OU un bloc se place. Absent = au-dessus, pleine largeur : c'est le defaut,
 * et c'est ce que voient les 42 sites qui n'ont rien demande.
 *
 * UNE VALEUR INCONNUE NE FAIT PAS DISPARAITRE LE BLOC. `position: 'bas-
 * gauche'` le rend au-dessus, comme s'il n'avait rien demande. Un bloc qui
 * s'evapore parce qu'on a mal tape un mot est pire qu'un bloc mal place :
 * personne ne comprend pourquoi son texte a disparu.
 */
export type PositionBloc = 'cote'

/** Rend la position SURE. Tout ce qui n'est pas connu vaut « au-dessus ». */
export function lirePosition(brut: unknown): PositionBloc | null {
  return brut === 'cote' ? 'cote' : null
}

export type Bloc = { position?: string } & (
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
  /** LOT 7 — la LISTE d'une catégorie d'articles. Ne porte aucun contenu :
   *  le fonds reste dans `site_blog_posts`, un seul endroit où écrire. */
  | { type: 'articles'; categorie: 'article' | 'communique' | 'evenement'; titre?: string; limite?: number }
  /**
   * LOT 4 — UN ARBRE DE FONCTIONS, JAMAIS DE PERSONNES PAR DÉFAUT.
   *
   * Le JSON reste PLAT : chaque entrée porte son `parent`, exactement comme
   * `site_pages`. Un arbre imbriqué ne se valide pas en SQL sans récursion,
   * et une contrainte qu'on ne peut pas écrire simplement s'écrit mal.
   *
   * `cle` identifie une entrée ; `parent` désigne la clé du supérieur, ou
   * est absent pour la racine.
   */
  /**
   * LOT 15.5 — LES PARTENAIRES.
   *
   * `logo` est FACULTATIF : sans fichier, le NOM s'affiche dans une tuile.
   * Exiger un logo rendrait le bloc inutilisable jusqu'à ce que quelqu'un
   * trouve les fichiers — c'est-à-dire jamais.
   */
  | { type: 'partenaires'; titre?: string; items: { nom: string; logo?: string; url?: string }[] }
  | { type: 'organigramme'; titre?: string; affichage?: string; items: { cle: string; parent?: string | null; fonction: string; nom?: string; detail?: string; lien?: string; couleur?: string; cote?: string }[] }
)

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
    case 'articles':
      // La catégorie doit être CONNUE : un bloc qui vise une catégorie
      // inventée n'afficherait jamais rien, et personne ne saurait pourquoi.
      return ['article', 'communique', 'evenement'].includes(String(b.categorie))
    case 'partenaires':
      // Le NOM est obligatoire : un logo sans nom est illisible au lecteur
      // d'ecran et indechiffrable pour qui ne connait pas l'organisation.
      return tableauDe(b.items, (o) => txt(o.nom))
    case 'organigramme':
      // Chaque entrée a une CLÉ et une FONCTION. Le nom est facultatif :
      // un organigramme nominatif faux sur un site d'État est pire qu'un
      // organigramme sans noms.
      return tableauDe(b.items, (o) => txt(o.cle) && txt(o.fonction))
  }
}
