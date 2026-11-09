import type { Metadata } from 'next'
import { metadataPrivee } from '@/lib/seo/metadata'

// ============================================================================
// LOT 11 — SEGMENT PRIVÉ, COMME `/edit` ET `/domaine`.
//
// CE FICHIER EXISTE PARCE QUE LE CLIQUET SEO L'A EXIGÉ, et il avait raison :
// sans lui, `/comptes/[slug]` servait la metadata de l'ACCUEIL de Deribfy.
// Une page d'administration qui se présente aux moteurs comme la page
// d'accueil, c'est le défaut d'origine que ce cliquet existe pour empêcher.
//
// Hors index : ces pages vivent derrière une connexion, elles n'apportent
// rien à un visiteur venu d'un moteur, et leur indexation dilue le site.
// ============================================================================
export const metadata: Metadata = metadataPrivee('Comptes du site — Deribfy', '/comptes')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
