import PageEspace, { metadonneesEspace, siteDeLEspace, type PropsEspace } from '../espace/PageEspace'
import MaPrequalification from '../espace/MaPrequalification'
import { motsPrequalification } from '../espace/motsPrequalification'
import { lirePiecesDuSite } from '../espace/lirePiecesDuSite'

// LOT 12.3 — l'examen du dossier. Même gabarit que les autres pages
// d'espace : capacité vérifiée, `noindex`, blocs déclarés au-dessus.
//
// LE COMPTE N'EST PAS DÉSIGNÉ : la route le déduit du jeton. C'est ce qui
// garantit qu'un fournisseur ne voit pas la qualification d'un autre.
const titre = (lang: string | null) => motsPrequalification(lang).titre
const phrase = (lang: string | null) => motsPrequalification(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('ma-prequalification', titre, p)

export default async function Page(p: PropsEspace) {
  const { slug } = await p.params
  const s = await siteDeLEspace(slug)
  const pieces = s ? await lirePiecesDuSite(s.id) : []

  return PageEspace({
    chemin: 'ma-prequalification', titre, phrase, ...p,
    rendu: ({ slug: sl, base, accent, lang }) => (
      <MaPrequalification slug={sl} base={base} pieces={pieces}
        primary={accent} mots={motsPrequalification(lang)} />
    ),
  })
}
