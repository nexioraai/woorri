import type { Metadata } from 'next'
import { metadataPublique } from '@/lib/seo/metadata'

// `/cookies` est une page CLIENT : `metadata` ne s'exporte pas depuis un
// composant `'use client'`. Sans ce layout de segment, Next se rabat sur la
// metadata de la racine — c'est ainsi que cette page servait à Google le titre
// et la description de l'ACCUEIL.
export const metadata: Metadata = metadataPublique('/cookies')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
