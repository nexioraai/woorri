'use client'
import { useMemo, useState } from 'react'

// ============================================================
// CHERCHER DANS LA BOUTIQUE DU MARCHAND.
//
// ── LE BESOIN, ET CE QUI EXISTAIT DÉJÀ (QUI N'EST PAS ÇA).
//
// `CatalogSearch` cherche dans le catalogue du FOURNISSEUR — des dizaines de
// milliers d'articles qu'un marchand en dropshipping peut revendre. Elle
// n'est montée qu'en mode 3, elle interroge une API, et elle ne connaît
// AUCUN produit ajouté à la main par le marchand.
//
// Les boutiques de mode 2 — celles des marchands qui vendent leur propre
// stock — n'avaient donc aucune recherche. Avec quarante articles en vitrine,
// un visiteur qui cherche « chaussures » fait défiler la page entière ou
// s'en va.
//
// ── POURQUOI ELLE NE FAIT AUCUN APPEL RÉSEAU.
//
// Les produits sont DÉJÀ rendus dans la page : la boutique les a chargés
// côté serveur. Interroger une API pour filtrer une liste qu'on tient en
// main ajouterait une latence, un état de chargement, un cas d'erreur — et
// sur une connexion lente au Tchad, la recherche paraîtrait cassée. Le filtre
// est donc immédiat, et il fonctionne même hors ligne une fois la page
// ouverte.
//
// ── CE QU'ELLE CHERCHE : DE VRAIS PRODUITS, JAMAIS DES SUGGESTIONS.
//
// Le nom d'abord, puis la description. Les accents sont dépliés — un
// visiteur tape « colliers », pas « Colliers » ; « chaussure » doit trouver
// « Chaussures ». Aucun résultat inventé, aucune correspondance approximative
// qui ferait remonter un article sans rapport.
// ============================================================

export type ProduitCherchable = {
  id?: string
  name: string
  description?: string
}

/** Minuscules, sans accents : ce que le visiteur tape n'est pas ce qui est écrit. */
export function normaliserPourRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Les produits qui correspondent vraiment.
 *
 * Tous les mots de la requête doivent être présents — « chaussure homme »
 * ne doit pas remonter toutes les chaussures. C'est plus strict qu'une
 * recherche par mot unique, et c'est ce qu'attend quelqu'un qui précise.
 */
export function chercherDansLaBoutique<T extends ProduitCherchable>(
  produits: readonly T[],
  requete: string,
): T[] {
  const mots = normaliserPourRecherche(requete).split(/\s+/u).filter(Boolean)
  if (mots.length === 0) return [...produits]
  return produits.filter((p) => {
    const foin = normaliserPourRecherche(`${p.name} ${p.description ?? ''}`)
    return mots.every((m) => foin.includes(m))
  })
}

export type RechercheBoutiqueProps = {
  /** Nombre de produits en vitrine — la barre ne sert à rien s'il y en a trois. */
  total: number
  valeur: string
  onChange: (v: string) => void
  /** Nombre de résultats, pour le dire au visiteur. */
  resultats: number
  primary: string
  sombre?: boolean
  labels: { placeholder: string; resultats: string; aucun: string; effacer: string }
  /** En deçà, la barre ne s'affiche pas. */
  seuil?: number
}

export default function RechercheBoutique({
  total,
  valeur,
  onChange,
  resultats,
  primary,
  sombre = false,
  labels,
  seuil = 6,
}: RechercheBoutiqueProps) {
  const [focus, setFocus] = useState(false)

  // UNE BARRE DE RECHERCHE SUR SIX ARTICLES EST DU BRUIT : le visiteur voit
  // déjà tout. Elle apparaît quand la liste devient assez longue pour qu'on
  // s'y perde.
  const utile = useMemo(() => total >= seuil, [total, seuil])
  if (!utile) return null

  const encre = sombre ? '#F5F3EE' : '#171717'
  const bordure = focus ? primary : sombre ? 'rgba(245,243,238,0.14)' : 'rgba(0,0,0,0.12)'
  const fond = sombre ? 'rgba(245,243,238,0.04)' : '#fff'

  return (
    <div className="max-w-xl mx-auto mb-10">
      <div className="relative">
        <input
          type="search"
          value={valeur}
          onChange={(e) => { onChange(e.target.value) }}
          onFocus={() => { setFocus(true) }}
          onBlur={() => { setFocus(false) }}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="w-full rounded-full py-3 pl-5 pr-11 text-base outline-none transition-colors"
          style={{ background: fond, color: encre, border: `1px solid ${bordure}` }}
        />
        {valeur !== '' && (
          <button
            type="button"
            onClick={() => { onChange('') }}
            aria-label={labels.effacer}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: encre, opacity: 0.45 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* LE COMPTE EST DIT. Sans lui, un visiteur dont la recherche ne donne
          rien croit la page cassée plutôt que vide. */}
      {valeur.trim() !== '' && (
        <p className="mt-2.5 text-sm text-center" style={{ color: sombre ? 'rgba(245,243,238,0.5)' : 'rgba(23,23,23,0.5)' }}>
          {resultats === 0
            ? labels.aucun.replace('{q}', valeur.trim())
            : labels.resultats.replace('{n}', String(resultats))}
        </p>
      )}
    </div>
  )
}
