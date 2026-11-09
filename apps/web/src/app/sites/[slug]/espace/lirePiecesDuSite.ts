import { lirePieces, type PieceExigee } from './piecesFournisseur'

// ============================================================================
// LOT 12.2 — LES PIÈCES EXIGÉES, LUES CÔTÉ SERVEUR.
//
// MÊME RAISON QUE `lirePartenaires` : `sites_public` ne porte pas la
// colonne, et recréer la vue pour l'y ajouter demanderait de réécrire ses
// 48 colonnes ET sa clause `where` — ce qu'une définition périmée effacerait
// en silence pour les 42 sites à la fois.
//
// L'IMPORT DU CLIENT DE SERVICE EST TARDIF. `supabase-admin` LÈVE au
// chargement du module quand la clé manque : l'importer en tête suffirait à
// faire tomber tout ce qui importe cette page, y compris `generateMetadata`.
// Mesuré le 2026-11-09 sur `lirePartenaires` — six tests de langue tombés
// d'un coup.
// ============================================================================

export async function lirePiecesDuSite(siteId: string): Promise<PieceExigee[]> {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data } = await supabaseAdmin
    .from('sites').select('pieces_fournisseur').eq('id', siteId).maybeSingle()
  return lirePieces((data as { pieces_fournisseur?: unknown } | null)?.pieces_fournisseur)
}
