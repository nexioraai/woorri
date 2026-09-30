import { PAGES } from '../../../documentation/manifeste'

// ============================================================
// LES ADRESSES DE LA DOCUMENTATION — SANS LIRE LE DISQUE.
//
// ── POURQUOI CE MODULE EST SÉPARÉ DE `corpus.ts`.
//
// Le plan de site a besoin des ADRESSES ; il n'a aucun besoin du TEXTE. Les
// mêlerait-on que `sitemap.ts` importerait `node:fs` pour n'en rien faire, et
// dépendrait à l'exécution de fichiers qu'il ne lit jamais. Ici : un import
// TypeScript, rien d'autre.
//
// ── LES ADRESSES NE SONT PAS CHOISIES : ELLES SONT DÉJÀ PUBLIÉES.
//
// `/llms.txt` annonce depuis sa mise en service douze liens de la forme
// `/documentation/comment-ca-marche` — et les douze répondaient 404. Des IA
// lisent ce fichier, en recopient les adresses et les citent longtemps après
// leur lecture.
//
// On reprend donc EXACTEMENT ces adresses au lieu d'en inventer de plus
// jolies : publier la documentation ailleurs aurait laissé les douze liens
// morts et créé une treizième vérité. L'adresse d'un chapitre est le nom de
// son fichier, sans le numéro d'ordre ni l'extension — ce qui donne des
// adresses françaises en français, anglaises en anglais.
// ============================================================

export type Langue = 'fr' | 'en'

export const slugDeFichier = (fichier: string) =>
  fichier.replace(/^\d+-/, '').replace(/\.md$/, '')

/** L'adresse d'un chapitre dans une langue, ou `null` si l'identifiant est inconnu. */
export function slug(id: string, langue: Langue): string | null {
  const page = PAGES.find((p) => p.id === id)
  return page ? slugDeFichier(page[langue]) : null
}

/** Les douze adresses d'une langue, dans l'ordre du manifeste. */
export function adresses(langue: Langue): string[] {
  return PAGES.map((p) => slugDeFichier(p[langue]))
}

/** L'identifiant portant cette adresse dans cette langue. */
export function identifiantDeAdresse(langue: Langue, adresse: string): string | null {
  const page = PAGES.find((p) => slugDeFichier(p[langue]) === adresse)
  return page ? page.id : null
}
