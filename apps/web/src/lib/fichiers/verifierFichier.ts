// ============================================================================
// AVANT D'ENVOYER UN FICHIER : DIRE TOUT DE SUITE S'IL SERA REFUSÉ.
//
// Mesuré le 2026-11-17 en production : un envoi de 4 Mo passe, un envoi de
// 4,4 Mo est coupé par l'hébergeur (413) avant même la route — et l'écran
// annonçait « 25 Mo maximum ». Le format, lui, n'était refusé qu'après
// l'envoi, par le stockage. On prévient AVANT, en une phrase simple.
//
// La liste suit celle du compartiment `site-fichiers` (storage.buckets).
// On juge sur l'EXTENSION : une photo HEIC d'iPhone arrive parfois sans type.
// ============================================================================

export const TAILLE_MAX_OCTETS = 4 * 1024 * 1024
export const FORMATS_ACCEPTES = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'] as const
export const TEXTE_FORMATS = 'Photos : JPEG, PNG, WebP · Documents : PDF, Word, Excel — 4 Mo maximum'

/** Rend le message à montrer, ou `null` si le fichier peut partir. */
export function verifierFichier(f: { name: string; size: number }): string | null {
  const ext = (f.name.split('.').pop() ?? '').toLowerCase()
  if (!(FORMATS_ACCEPTES as readonly string[]).includes(ext)) {
    const iphone = ext === 'heic' || ext === 'heif'
    return iphone
      ? 'Format HEIC (photo d’iPhone) non accepté. Envoyez la photo en JPEG : sur iPhone, Réglages › Appareil photo › Formats › « Le plus compatible ».'
      : `Format « .${ext || '?'} » non accepté. ${TEXTE_FORMATS}.`
  }
  if (f.size > TAILLE_MAX_OCTETS) {
    return `Fichier trop lourd (${(f.size / 1048576).toFixed(1)} Mo). La limite est de 4 Mo : réduisez la photo avant de l’envoyer.`
  }
  return null
}
