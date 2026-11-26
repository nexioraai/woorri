import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LectureGuide from '@/lib/guides/LectureGuide'
import { guideExploitation } from '@/lib/guides/guideExploitation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adresseDuSite } from '@/lib/sites/adresse-site'

// LE GUIDE D'UN SITE (2026-11-26) : le gabarit générique, avec le nom et
// l'adresse publique DE CE SITE — plus jamais ceux de la CPA.

export const metadata: Metadata = {
  title: 'Guide d’exploitation — Deribfy',
  robots: { index: false, follow: false },
}

export default async function PageGuide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabaseAdmin.from('sites').select('name,slug,custom_domain').eq('slug', slug).maybeSingle()
  const s = data as { name: string; slug: string; custom_domain: string | null } | null
  if (!s) notFound()
  const adresse = s.custom_domain ? `https://${s.custom_domain}` : (await adresseDuSite(s.slug).catch(() => null)) ?? `https://${s.slug}.deribfy.app`
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px', color: '#ededed' }}>
      <p style={{ fontSize: 14, margin: '0 0 22px' }}>
        <Link href="/dashboard" style={{ color: '#FA5D1E' }}>← Tableau de bord</Link>
      </p>
      <LectureGuide md={guideExploitation({ nom: s.name, adresse })} />
    </main>
  )
}
