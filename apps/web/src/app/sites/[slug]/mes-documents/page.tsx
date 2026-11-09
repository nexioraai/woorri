import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import DocumentsDuCompte from '../espace/DocumentsDuCompte'
import { motsDocuments } from '../espace/motsDocuments'

// LOT 12.1 — le dossier du titulaire. Même gabarit que les autres pages
// d'espace : capacité vérifiée, `noindex`, blocs déclarés au-dessus.
//
// LE COMPTE N'EST PAS DÉSIGNÉ ICI : la route le déduit du jeton. Le passer
// en paramètre ferait de cette page une porte vers le dossier d'autrui.
const titre = (lang: string | null) => motsDocuments(lang).titre
const phrase = (lang: string | null) => motsDocuments(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-documents', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mes-documents', titre, phrase, ...p,
    rendu: ({ slug, accent, lang }) => (
      <DocumentsDuCompte slug={slug} primary={accent} mots={motsDocuments(lang)} />
    ),
  })
}
