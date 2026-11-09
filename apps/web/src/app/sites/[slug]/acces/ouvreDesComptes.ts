import { supabaseAdmin } from '@/lib/supabase-admin'

// ============================================================================
// LOT 11 — CE SITE OUVRE-T-IL DES COMPTES ?
//
// ── UNE SEULE LECTURE, POUR LES ÉCRANS ET POUR LES ROUTES.
//
// Les quatre écrans d'accès sont des routes MOTEUR : elles existent sur les
// 42 sites. Sans cette capacité, un visiteur d'une boutique de fleurs
// pourrait demander son « rattachement » à un fleuriste.
//
// ── LA ROUTE LA LIT AUSSI, ET C'EST LÀ QUE ÇA COMPTE.
//
// Cacher l'écran sans fermer l'API ne protège rien : il suffirait d'appeler
// `/api/sites/<boutique>/mon-compte` à la main pour poser une ligne dans
// `site_comptes`. L'écran est une commodité ; la route est la garde.
//
// ── `=== true`, JAMAIS `!!`.
//
// La colonne est `not null default false`, mais une projection oubliée rend
// `undefined` — et `!!undefined` vaut faux par chance, pas par décision.
// L'égalité stricte dit que seule une déclaration EXPLICITE ouvre.
// ============================================================================

export async function ouvreDesComptes(siteId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('sites')
    .select('ouvre_des_comptes')
    .eq('id', siteId)
    .maybeSingle()
  return (data as { ouvre_des_comptes?: boolean } | null)?.ouvre_des_comptes === true
}
