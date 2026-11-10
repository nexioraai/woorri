import type { Metadata } from 'next'
import Link from 'next/link'
import LectureGuide from '@/lib/guides/LectureGuide'
import { GUIDE_EXPLOITATION } from '@/lib/guides/guideExploitation'

// LE GUIDE D'EXPLOITATION, AU TABLEAU DE BORD (demande du propriétaire,
// 2026-11-10). Le texte est celui de `docs/cpa/GUIDE-EXPLOITATION.md`, recopié
// par `scripts/guide-vers-ts.mjs` et tenu identique par un test. Page
// d'administration : jamais indexée.

export const metadata: Metadata = {
  title: 'Guide d’exploitation — Deribfy',
  robots: { index: false, follow: false },
}

export default function PageGuide() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 20px 80px', color: '#ededed' }}>
      <p style={{ fontSize: 14, margin: '0 0 22px' }}>
        <Link href="/dashboard" style={{ color: '#FA5D1E' }}>← Tableau de bord</Link>
      </p>
      <LectureGuide md={GUIDE_EXPLOITATION} />
    </main>
  )
}
