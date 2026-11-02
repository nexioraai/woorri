import type { Metadata } from 'next'
import { metadataPrivee } from '@/lib/seo/metadata'

// ── SEGMENT PRIVÉ : HORS INDEX, ET LE CLIQUET SEO L'A EXIGÉ AVANT MOI.
//
// L'atelier est un composant client : il ne PEUT pas exporter de `metadata`.
// Sans ce layout, il servait donc celle de l'ACCUEIL — le défaut d'origine
// que ce cliquet garde, et il l'a attrapé à la première gate.
//
// Et hors index n'est pas un détail : cette page vit derrière une connexion
// et porte l'œuvre d'UNE personne. Elle n'apporte rien à un visiteur venu
// d'un moteur, et son indexation diluerait le site.
export const metadata: Metadata = metadataPrivee('Atelier — Deribfy', '/atelier')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
