/**
 * L'ADRESSE PUBLIQUE D'UN SITE — <nom>.deribfy.app, donnée À LA PUBLICATION (2026-11-19).
 *
 * MESURÉ : six sites « En ligne » n'avaient aucune adresse deribfy.app. La
 * fonction existait (`creerSousDomaine`, celle des applis) ; pour les sites,
 * elle attendait un clic sur « Adresse » que personne ne faisait — un seul
 * site sur dix publiés l'avait reçue (cpa-tchad, le 2026-11-06). Les applis,
 * elles, la reçoivent à chaque publication. Réparation demandée par le
 * propriétaire : « un produit que je vends doit livrer une adresse montrable ».
 *
 * Deux portes, une seule règle :
 *   · `attribuerNomSite`  — le nom CHOISI (le bouton « Adresse » du tableau
 *     de bord, le rattrapage des six) : refusé s'il est pris ;
 *   · `assurerAdresseSite` — à la publication : si le site n'a pas encore de
 *     nom, il reçoit un nom LISIBLE tiré de son titre (`goura-doula`, jamais
 *     `goura-doula-1794663944227`) ; pris → `goura-doula-2`, `-3`…
 *
 * Les collisions sont celles de la route d'origine, à l'identique : un autre
 * site, le nom public d'une APPLICATION (pierres tombales comprises — EP-308),
 * le slug brut d'un autre site, les noms réservés.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TABLE_GENERATIONS } from '@/lib/apps/journal'
import { creerSousDomaine, nomSuggere, nomValide, DOMAINE_PUBLIC } from '@/lib/apps/sous-domaine'

export type Attribution =
  | { readonly ok: true; readonly nom: string; readonly lien: string }
  | { readonly ok: false; readonly status: number; readonly erreur: string }

const clefs = () => ({
  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN ?? '',
  vercelToken: process.env.VERCEL_API_TOKEN ?? '',
  vercelProjectId: process.env.VERCEL_PROJECT_ID ?? '',
})

/** Le nom est-il pris, et par quoi ? `null` = libre pour CE site. */
export async function nomPris(nom: string, slug: string): Promise<string | null> {
  const [parNom, parApp, parSlug] = await Promise.all([
    supabaseAdmin.from('sites_sous_domaines').select('site_slug').eq('nom', nom).maybeSingle(),
    // JAMAIS filtré par statut : une appli supprimée garde son nom (EP-308).
    supabaseAdmin.from(TABLE_GENERATIONS).select('id').eq('publication_slug', nom).maybeSingle(),
    supabaseAdmin.from('sites').select('slug').eq('slug', nom).neq('slug', slug).maybeSingle(),
  ])
  if (parNom.data !== null && (parNom.data as { site_slug: string }).site_slug !== slug) return 'un autre site'
  if (parApp.data !== null) return 'une application'
  if (parSlug.data !== null) return 'un autre site'
  return null
}

/** Attribue CE nom au site : DNS + Vercel (certificat), puis le mapping. */
export async function attribuerNomSite(slug: string, nom: string): Promise<Attribution> {
  if (!nomValide(nom)) {
    return { ok: false, status: 400, erreur: 'Nom invalide : minuscules, chiffres et tirets, 3 à 40 signes, sans nom réservé.' }
  }
  const pris = await nomPris(nom, slug)
  if (pris !== null) return { ok: false, status: 409, erreur: `« ${nom} » est déjà pris par ${pris}.` }
  const c = clefs()
  if (Object.values(c).some((v) => v === '')) return { ok: false, status: 500, erreur: 'clés de sous-domaine absentes du serveur' }
  const sd = await creerSousDomaine(nom, c)
  if (!sd.ok) return { ok: false, status: 502, erreur: sd.erreur }
  const ecrit = await supabaseAdmin.from('sites_sous_domaines').upsert({ nom, site_slug: slug }, { onConflict: 'nom' })
  if (ecrit.error !== null) return { ok: false, status: 500, erreur: 'adresse créée mais non enregistrée — réessayez' }
  return { ok: true, nom, lien: `https://${nom}.${DOMAINE_PUBLIC}` }
}

/** L'adresse en service d'un site : la plus récente de ses noms, ou null. */
export async function adresseDuSite(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('sites_sous_domaines').select('nom').eq('site_slug', slug)
    .order('cree_le', { ascending: false }).limit(1).maybeSingle()
  const nom = (data as { nom?: string } | null)?.nom
  return nom ? `https://${nom}.${DOMAINE_PUBLIC}` : null
}

/**
 * À LA PUBLICATION : le site a-t-il une adresse ? Sinon, il en reçoit une,
 * lisible, tirée de son titre. Ne lève jamais : une publication ne doit pas
 * échouer parce que l'adresse n'a pas pu être posée — l'échec est RENDU.
 */
export async function assurerAdresseSite(slug: string, titre: string | null): Promise<Attribution> {
  try {
    const existante = await adresseDuSite(slug)
    if (existante !== null) return { ok: true, nom: new URL(existante).hostname.split('.')[0] ?? '', lien: existante }
    const base = nomSuggere(titre && titre.trim() !== '' ? titre : slug)
    if (!nomValide(base)) return { ok: false, status: 400, erreur: `aucun nom lisible tiré de « ${titre ?? slug} »` }
    for (let i = 1; i <= 9; i++) {
      const nom = i === 1 ? base : `${base}-${String(i)}`
      if (!nomValide(nom)) continue
      if ((await nomPris(nom, slug)) !== null) continue
      return await attribuerNomSite(slug, nom)
    }
    return { ok: false, status: 409, erreur: `« ${base} » et ses variantes -2 à -9 sont tous pris` }
  } catch (e) {
    return { ok: false, status: 500, erreur: e instanceof Error ? e.message : String(e) }
  }
}
