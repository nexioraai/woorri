import type { Metadata } from 'next'
import { metadataPrivee } from '@/lib/seo/metadata'

// Segment PRIVÉ : hors index. Ces pages vivent derrière une connexion, elles
// n'apportent rien à un visiteur venu d'un moteur, et leur indexation dilue le
// site. Le titre reste propre : c'est celui de l'onglet du marchand.
export const metadata: Metadata = metadataPrivee('Nom de domaine — Deribfy', '/domaine')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
