// ============================================================================
// L'ENCRE DE MARQUE — DÉCLARÉE PAR LES DONNÉES (CPA, 2026-11-11).
//
// LA DEMANDE : « c la couleur bleu d'anie qu'on veut mettre sur cpa. la couleur
// blanc de cpa on ne touche pas ». Changer `primary_color` ne suffisait pas,
// mesuré à l'écran : le thème éditorial peint son menu, ses titres, sa carte
// mise en avant et son pied de page en NOIR codé en dur. Le bleu ne touchait
// que de petits accents.
//
// POURQUOI UNE DÉCLARATION, ET PAS UN CHANGEMENT DU THÈME POUR TOUS. 34 autres
// sites utilisent ce thème ; leur noir est leur identité. L'encre de marque est
// donc OPT-IN : une page NON PUBLIÉE `couleur-de-marque` existe pour le site,
// et c'est tout. La supprimer rend le rendu d'avant. Même patron que la page
// de l'assistant : non publiée, lue avec le rôle de service, jamais servie.
//
// FAIL-CLOSED : toute erreur de lecture rend `false` — le rendu d'avant.
// ============================================================================

export const CHEMIN_ENCRE_DE_MARQUE = 'couleur-de-marque'

export async function lireEncreDeMarque(siteId: string): Promise<boolean> {
  try {
    // Import tardif : voir `lirePartenaires.ts` (la clé absente ne doit pas
    // faire tomber ce qui importe la page).
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data } = await supabaseAdmin
      .from('site_pages').select('chemin')
      .eq('site_id', siteId).eq('chemin', CHEMIN_ENCRE_DE_MARQUE).maybeSingle()
    return !!data
  } catch {
    return false
  }
}
