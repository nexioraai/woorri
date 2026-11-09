// ============================================================================
// LOT 12.2 — LES PIÈCES QU'UN FOURNISSEUR DOIT FOURNIR.
//
// ── CE FICHIER NOMME LA FORME, ET LA FAIT RESPECTER.
//
// `jsonb` accepte n'importe quoi. Une pièce sans clé ne peut rattacher aucun
// document ; une pièce sans libellé est une case que personne ne sait
// remplir. On les écarte à la LECTURE plutôt que de rendre un dossier
// inutilisable à l'écran.
//
// ── LA CLÉ EST STABLE, LE LIBELLÉ NON.
//
// La Centrale peut corriger « Attestation fiscale » en « Attestation de
// régularité fiscale » sans détacher les documents déjà rattachés. Lier par
// le libellé aurait fait perdre le rattachement à la première faute de
// frappe corrigée.
//
// ── ET LES DOUBLONS DE CLÉ SONT ÉCARTÉS.
//
// Deux pièces de même clé rendraient « cette pièce est-elle fournie ? »
// ambigu, et c'est l'ambiguïté qui se résout toujours du mauvais côté.
// ============================================================================

export type PieceExigee = {
  /** Stable. C'est elle qui rattache un document à l'exigence. */
  cle: string
  libelle: string
  obligatoire: boolean
}

/** Une clé utilisable : courte, sans espace, reconnaissable dans une URL. */
const CLE_VALIDE = /^[a-z0-9][a-z0-9_-]{0,48}$/u

function bienFormee(x: unknown): x is PieceExigee {
  if (!x || typeof x !== 'object') return false
  const p = x as Record<string, unknown>
  if (typeof p.cle !== 'string' || !CLE_VALIDE.test(p.cle)) return false
  if (typeof p.libelle !== 'string' || p.libelle.trim().length === 0) return false
  if ('obligatoire' in p && typeof p.obligatoire !== 'boolean') return false
  return true
}

/**
 * Les pièces exigées d'un site, lues et nettoyées.
 *
 * `obligatoire` vaut `true` par défaut : une exigence qu'on a pris la peine
 * d'écrire est demandée, sauf mention contraire. L'inverse ferait d'un oubli
 * de case une pièce facultative — et personne ne s'en apercevrait.
 */
export function lirePieces(brut: unknown): PieceExigee[] {
  if (!Array.isArray(brut)) return []
  const vues = new Set<string>()
  const out: PieceExigee[] = []
  for (const x of brut) {
    if (!bienFormee(x)) continue
    if (vues.has(x.cle)) continue
    vues.add(x.cle)
    out.push({
      cle: x.cle,
      libelle: x.libelle.trim().slice(0, 200),
      obligatoire: x.obligatoire !== false,
    })
  }
  return out
}

export type EtatPiece = PieceExigee & { fournie: boolean }

/**
 * L'ÉTAT DU DOSSIER : chaque pièce exigée, fournie ou non.
 *
 * UN DOCUMENT RETIRÉ NE COMPTE PAS. C'est tout le sens du retrait : la
 * ligne reste lisible, l'exigence redevient ouverte. Compter les retirés
 * dirait « dossier complet » à quelqu'un dont la pièce n'est plus là.
 */
export function etatDuDossier(
  pieces: PieceExigee[],
  documents: readonly { piece?: string | null; retire_le?: string | null }[],
): { etats: EtatPiece[]; manquantes: PieceExigee[]; complet: boolean } {
  const fournies = new Set(
    documents.filter((d) => d.piece && !d.retire_le).map((d) => d.piece as string),
  )
  const etats = pieces.map((p) => ({ ...p, fournie: fournies.has(p.cle) }))
  const manquantes = etats.filter((p) => p.obligatoire && !p.fournie)
  return {
    etats,
    manquantes,
    // SANS EXIGENCE, LE DOSSIER N'EST PAS « COMPLET » : il n'y a pas de
    // dossier. Dire « complet » à un fournisseur d'un site qui n'exige rien
    // lui ferait croire qu'il a fait quelque chose.
    complet: pieces.length > 0 && manquantes.length === 0,
  }
}
