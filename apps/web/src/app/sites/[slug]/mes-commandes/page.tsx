import type { Institution } from '@/lib/sites/institution'
import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesCommandes from '../espace/MesCommandes'
import { motsCommandes } from '../espace/motsCommandes'
import { lireLignesAdresse } from '../catalogue/bon'

// LES COMMANDES DU CLIENT (CPA, 2026-11-19) — même gabarit que les autres
// pages d'espace : `noindex`, capacité vérifiée, blocs déclarés au-dessus.
// `?produit=` pré-remplit la première ligne depuis une fiche du catalogue ;
// `?l=désignation|qté|unité` (répété) arrive du BON EN PRÉPARATION du catalogue.
const titre = (lang: string | null, inst: Institution) => motsCommandes(lang, inst).titre
const phrase = (lang: string | null, inst: Institution) => motsCommandes(lang, inst).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-commandes', titre, p)

export default async function Page(p: PropsEspace & { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const q = p.searchParams ? await p.searchParams : {}
  const brut = typeof q.produit === 'string' ? q.produit.trim().slice(0, 300) : ''
  const quantite = typeof q.quantite === 'string' && /^\d{1,7}$/.test(q.quantite) ? q.quantite : ''
  const unite = typeof q.unite === 'string' ? q.unite.trim().slice(0, 40) : ''
  const lignes = lireLignesAdresse(q.l)
  const depuisBon = q.depuis === 'bon'
  return PageEspace({
    chemin: 'mes-commandes', titre, phrase, params: p.params,
    rendu: ({ slug, accent, lang, inst }) => (
      <MesCommandes slug={slug} primary={accent} mots={motsCommandes(lang, inst)} produitInitial={brut || null} quantiteInitiale={quantite} uniteInitiale={unite} lignesInitiales={lignes} viderBonApresEnvoi={depuisBon} />
    ),
  })
}
