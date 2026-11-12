'use client'

import { useParams } from 'next/navigation'
import EditeurVisuel from '@/components/editeur/EditeurVisuel'

// L'ÉDITEUR VISUEL (maquette validée par le propriétaire, 2026-11-12) :
// structure du site à gauche, aperçu réel au centre, réglages à droite.
// L'ancienne page `/edit/<slug>` reste la page des RÉGLAGES DU SITE (logo,
// couleurs, coordonnées, zone sensible) : on y accède depuis la colonne de
// gauche, rien n'est perdu.
export default function PageModifier() {
  const { slug } = useParams<{ slug: string }>()
  return <EditeurVisuel slug={slug} />
}
