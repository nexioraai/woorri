import PageEspace, { metadonneesEspace, siteDeLEspace, type PropsEspace } from '../espace/PageEspace'
import MonDossier from '../espace/MonDossier'
import { motsDossier } from '../espace/motsDossier'
import { lirePiecesDuSite } from '../espace/lirePiecesDuSite'

// ============================================================================
// LOT 12.2 — LE DOSSIER DU FOURNISSEUR.
//
// LES PIÈCES SONT LUES ICI, pas dans le gabarit. Un thème — et un gabarit —
// rend ; il ne connaît pas les exigences d'un métier. Les y mettre aurait
// obligé `PageEspace` à savoir ce qu'est une pièce d'agrément, et la
// prochaine page d'espace à le savoir aussi.
//
// LE COMPTE N'EST PAS DÉSIGNÉ : la route le déduit du jeton. Le passer en
// paramètre ferait de cette page une porte vers le dossier d'autrui.
// ============================================================================

const titre = (lang: string | null) => motsDossier(lang).titre
const phrase = (lang: string | null) => motsDossier(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mon-dossier', titre, p)

export default async function Page(p: PropsEspace) {
  const { slug } = await p.params
  const s = await siteDeLEspace(slug)
  // Site inconnu : le gabarit rendra 404. On ne devance pas sa décision, on
  // évite seulement de lire des pièces qui n'existent pas.
  const pieces = s ? await lirePiecesDuSite(s.id) : []

  return PageEspace({
    chemin: 'mon-dossier', titre, phrase, ...p,
    rendu: ({ slug: sl, accent, lang }) => (
      <MonDossier slug={sl} pieces={pieces} primary={accent} mots={motsDossier(lang)} />
    ),
  })
}
