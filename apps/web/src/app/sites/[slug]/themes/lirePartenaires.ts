import type { Partenaire } from '../pages/Partenaires'

// ============================================================================
// LOT 15.13 — LIRE LES PARTENAIRES D'UN SITE.
//
// ── POURQUOI LE RÔLE DE SERVICE, ET PAS LA VUE PUBLIQUE.
//
// `sites_public` ne porte pas `partenaires`. L'y ajouter demanderait de
// recréer la vue — donc de réécrire ses 48 colonnes ET sa clause `where`,
// qu'une définition périmée effacerait en silence pour les 42 sites à la
// fois. Le gain ne vaut pas ce risque : une lecture serveur suffit.
//
// ── CE N'EST PAS UNE FUITE.
//
// La liste des partenaires est destinée à PARAÎTRE sur l'accueil : elle est
// publique par nature. Ce qui compte, c'est qu'aucun privilège ne soit
// ouvert sur la table `sites` — et il ne l'est pas : seule cette lecture
// serveur la touche.
//
// ── ON VALIDE CE QU'ON LIT.
//
// `jsonb` accepte n'importe quelle forme. Un partenaire sans `nom` serait
// une tuile muette : illisible au lecteur d'écran, indéchiffrable pour qui
// ne connaît pas l'organisation. On l'écarte ici plutôt que de le rendre.
// ============================================================================

/** Le nom est OBLIGATOIRE ; le logo et l'adresse sont facultatifs. */
function bienForme(x: unknown): x is Partenaire {
  if (!x || typeof x !== 'object') return false
  const p = x as Record<string, unknown>
  if (typeof p.nom !== 'string' || p.nom.trim().length === 0) return false
  if ('logo' in p && p.logo != null && typeof p.logo !== 'string') return false
  if ('url' in p && p.url != null && typeof p.url !== 'string') return false
  return true
}

/** Les partenaires d'un site, ou une liste vide. Jamais `null`. */
export async function lirePartenaires(siteId: string): Promise<Partenaire[]> {
  // ── L'IMPORT EST TARDIF, ET CE N'EST PAS UNE COQUETTERIE.
  //
  // `supabase-admin` LÈVE une erreur au chargement du module quand la clé de
  // service manque. En l'important en tête, ce fichier rendait la seule
  // PRÉSENCE du lecteur suffisante pour faire tomber tout ce qui importe la
  // page — y compris `generateMetadata`, qui n'a aucun besoin des
  // partenaires. Mesuré le 2026-11-09 : six tests de langue, verts depuis
  // des mois, sont tombés d'un coup sur « SUPABASE_SERVICE_ROLE_KEY
  // manquante ».
  //
  // Ici le client ne se construit que lorsqu'on LIT vraiment.
  const { supabaseAdmin } = await import('@/lib/supabase-admin')

  const { data } = await supabaseAdmin
    .from('sites')
    .select('partenaires')
    .eq('id', siteId)
    .maybeSingle()

  const brut = (data as { partenaires?: unknown } | null)?.partenaires
  if (!Array.isArray(brut)) return []
  return brut.filter(bienForme).map((p) => ({
    nom: p.nom.trim(),
    ...(p.logo ? { logo: p.logo } : {}),
    ...(p.url ? { url: p.url } : {}),
  }))
}
