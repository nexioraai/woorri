import type { Metadata } from 'next'
import { metadataPublique } from '@/lib/seo/metadata'

// Page CLIENT : sa metadata vient du registre des pages publiques (même raison
// que /cookies — sans ce layout, Next servirait le titre de l'accueil).
export const metadata: Metadata = metadataPublique('/remboursement')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
