'use client'
/**
 * LE BANDEAU D'UN SITE ÉCHU, DANS LES ÉDITEURS (2026-11-26).
 *
 * Un site payé en mobile money dont l'échéance est passée reste en ligne ;
 * ses modifications sont arrêtées (base et routes de contenu). Le bandeau le
 * dit AVANT que le propriétaire ne tente une modification, avec le bouton
 * « Renouveler ». Une lecture ratée n'affiche rien : le refus réel, lui,
 * vient toujours du serveur.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { lireEtatSite } from '@/components/apps/publierSite'
import { PHRASE_SITE_ECHU } from '@/lib/sites/site-echu'
import { lienRenouveler } from '@/components/dashboard/renouvelerSite'

/** Le bandeau ne s'affiche que pour un site ÉCHU — pas pour « bientôt » (le tableau de bord le dit). */
export function bandeauVisible(e: { readonly rappel: 'bientot' | 'echu' | null } | null): boolean {
  return e !== null && e.rappel === 'echu'
}

export function VueBandeauSiteEchu({ slug }: { readonly slug: string }) {
  return (
    <div role="status" data-site-echu="" className="flex flex-wrap items-center gap-3 border-b border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100">
      <span className="min-w-0 flex-1">{PHRASE_SITE_ECHU}</span>
      <Link href={lienRenouveler(slug)} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-accent/90">Renouveler</Link>
    </div>
  )
}

export default function BandeauSiteEchu({ slug }: { readonly slug: string }) {
  const [echu, setEchu] = useState(false)
  useEffect(() => {
    let vivant = true
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const e = await lireEtatSite(slug, `Bearer ${session.access_token}`)
      if (vivant && bandeauVisible(e)) setEchu(true)
    })()
    return () => { vivant = false }
  }, [slug])
  return echu ? <VueBandeauSiteEchu slug={slug} /> : null
}
