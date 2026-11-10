import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MonProfil from '../espace/MonProfil'
import { motsProfil } from '../espace/motsProfil'

// LOT 11 — le profil. Même gabarit que les autres pages d'espace : capacité
// vérifiée, `noindex`, blocs déclarés au-dessus.
const titre = (lang: string | null) => motsProfil(lang).titre
const phrase = (lang: string | null) => motsProfil(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mon-profil', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mon-profil', titre, phrase, ...p,
    rendu: ({ slug, base, accent, lang }) => (
      <MonProfil slug={slug} primary={accent} mots={motsProfil(lang)} accueil={base} />
    ),
  })
}
