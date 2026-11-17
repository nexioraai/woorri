// ============================================================================
// OÙ UN FICHIER DÉPOSÉ EST-IL ENCORE EMPLOYÉ ?
//
// ── LE DÉFAUT QU'IL FERME (mesuré le 2026-11-16 sur la CPA).
//
// Le téléverseur montre, dans CHAQUE panneau photo (hero, carte, partenaire),
// la liste entière du dossier avec un ✕ à côté de « employer ». Le ✕ efface
// le fichier DU STOCKAGE — pas du panneau. Le 16 novembre, 17 retraits ont
// été faits depuis le Tchad : 4 des 5 photos du hero de la CPA pointaient
// ensuite vers un objet absent (`NoSuchKey`), et l'accueil affichait des
// cases vides. Aucune erreur n'était montrée, ni à la suppression, ni après.
//
// ── LA RÈGLE. On ne retire pas un fichier qu'une page, le hero, la galerie,
// le logo ou une carte emploie encore. On dit OÙ il est employé : c'est là
// qu'il faut d'abord le remplacer.
//
// ── POURQUOI CHERCHER DANS LE TEXTE ENTIER DE LA LIGNE.
// Une liste de colonnes serait une seconde vérité : la prochaine colonne qui
// recevra une URL de fichier (il y en a déjà sept) l'oublierait. Le chemin
// `sites/<id>/<dossier>/<nom>` est unique par construction (la route le
// bâtit), donc le trouver n'importe où dans la ligne suffit — et ne peut pas
// confondre deux sites.
// ============================================================================

export type Emploi = { ou: string }

/** Le morceau d'URL qui désigne ce fichier, et lui seul. */
export function cleDuFichier(siteId: string, dossier: string, nom: string): string {
  return `sites/${siteId}/${dossier}/${nom}`
}

/** La clé, suivie d'autre chose qu'un caractère de nom : `a.png` ne doit pas
 *  trouver `a.png.old` ni `a.pngx` (les noms viennent de `nomPropre`). */
function contient(texte: string, cle: string): boolean {
  let i = texte.indexOf(cle)
  while (i !== -1) {
    if (!/[a-z0-9.\-]/.test(texte.charAt(i + cle.length))) return true
    i = texte.indexOf(cle, i + 1)
  }
  return false
}

/** Les champs du site (ligne `sites`) qui contiennent le fichier. */
export function emploisDansLeSite(site: Record<string, unknown> | null, cle: string): Emploi[] {
  if (!site) return []
  const out: Emploi[] = []
  for (const [col, v] of Object.entries(site)) {
    if (v == null) continue
    const texte = typeof v === 'string' ? v : JSON.stringify(v)
    if (contient(texte, cle)) out.push({ ou: LIBELLES_COLONNES[col] ?? col })
  }
  return out
}

/** Les pages (lignes `site_pages`) qui contiennent le fichier. */
export function emploisDansLesPages(
  pages: Array<{ chemin?: string | null; titre?: string | null } & Record<string, unknown>> | null,
  cle: string,
): Emploi[] {
  if (!pages) return []
  return pages
    .filter((p) => contient(JSON.stringify(p), cle))
    .map((p) => ({ ou: p.chemin === 'accueil-hero' ? 'Hero — photos de l’accueil' : `Page « ${p.titre || p.chemin || 'sans titre'} »` }))
}

const LIBELLES_COLONNES: Record<string, string> = {
  hero_image: 'Hero — photos de l’accueil',
  gallery: 'Galerie / hero de l’accueil',
  logo_url: 'Logo',
  partenaires: 'Partenaires',
  pieces_fournisseur: 'Pièces fournisseur',
}

/** Le message montré à celui qui voulait retirer le fichier. */
export function messageEmploye(emplois: Emploi[]): string {
  const lieux = [...new Set(emplois.map((e) => e.ou))]
  return `Ce fichier est encore employé : ${lieux.join(', ')}. Remplacez-le d’abord à cet endroit, puis retirez-le.`
}
