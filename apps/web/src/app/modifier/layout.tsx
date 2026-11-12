import type { Metadata } from 'next'
import { metadataPrivee } from '@/lib/seo/metadata'

// Segment PRIVÉ (derrière une connexion) : hors index, comme `/edit`.
export const metadata: Metadata = metadataPrivee('Modifier mon site — Deribfy', '/modifier')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
