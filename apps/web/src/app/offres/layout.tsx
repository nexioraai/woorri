import type { Metadata } from 'next'
import { metadataPrivee } from '@/lib/seo/metadata'

// ============================================================================
// LOT 13.2 — SEGMENT PRIVÉ, comme `/edit`, `/domaine` et `/comptes`.
//
// Le cliquet SEO l'a exigé la dernière fois : sans ce fichier, la page
// servirait la metadata de l'ACCUEIL de Deribfy. Une page qui ouvre les plis
// d'un marché public n'a rien à faire dans un moteur de recherche.
// ============================================================================
export const metadata: Metadata = metadataPrivee('Offres reçues — Deribfy', '/offres')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
