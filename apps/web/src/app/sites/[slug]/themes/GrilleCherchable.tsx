'use client'
import { Children, useMemo, useState, type ReactNode } from 'react'
import RechercheBoutique, { chercherDansLaBoutique } from './RechercheBoutique'

// ============================================================
// UNE GRILLE QU'ON PEUT FOUILLER, SANS RÉÉCRIRE LES CARTES.
//
// ── LE PROBLÈME DE FRONTIÈRE, ET POURQUOI CETTE FORME.
//
// Les sections boutique sont rendues par le SERVEUR : c'est ce qui permet à
// Google de lire le catalogue et à la page de s'afficher avant tout script.
// Une recherche vivante, elle, a besoin d'état côté client.
//
// La solution paresseuse aurait été de refaire les cartes en composant
// client. Elles existent en quatre variantes (Editorial, Noir, Vif, dense) —
// les recopier, c'est répéter exactement l'erreur de la galerie photo, où une
// cinquième vitrine était restée en arrière pendant des semaines sans que
// personne le voie.
//
// Ici, les cartes restent rendues PAR LE SERVEUR et arrivent en `children`.
// Ce composant ne fait que les montrer ou les cacher, en s'appuyant sur un
// tableau de textes parallèle. Aucun balisage n'est dupliqué, et le catalogue
// complet reste dans le HTML initial — donc indexable.
//
// ── ET QUAND LA RECHERCHE EST VIDE, RIEN NE CHANGE.
//
// C'est la propriété qui compte : une boutique dont personne ne se sert de la
// recherche s'affiche exactement comme avant.
// ============================================================

export type GrilleCherchableProps = {
  /** Un texte cherchable par carte, dans le MÊME ordre que `children`. */
  textes: readonly { name: string; description?: string }[]
  /** Classes de la grille — chaque vitrine a la sienne. */
  className: string
  primary: string
  sombre?: boolean
  labels: { placeholder: string; resultats: string; aucun: string; effacer: string }
  children: ReactNode
}

export default function GrilleCherchable({
  textes,
  className,
  primary,
  sombre = false,
  labels,
  children,
}: GrilleCherchableProps) {
  const [requete, setRequete] = useState('')
  const cartes = Children.toArray(children)

  // On cherche sur les INDEX, puis on garde les cartes correspondantes : le
  // texte et la carte ne peuvent pas se désaligner tant qu'ils viennent du
  // même `map`.
  const gardes = useMemo(() => {
    if (requete.trim() === '') return null
    const avecIndex = textes.map((t, i) => ({ ...t, i }))
    return new Set(chercherDansLaBoutique(avecIndex, requete).map((x) => x.i))
  }, [textes, requete])

  const visibles = gardes === null ? cartes : cartes.filter((_, i) => gardes.has(i))

  return (
    <>
      <RechercheBoutique
        total={cartes.length}
        valeur={requete}
        onChange={setRequete}
        resultats={visibles.length}
        primary={primary}
        sombre={sombre}
        labels={labels}
      />
      <div className={className}>{visibles}</div>
    </>
  )
}
