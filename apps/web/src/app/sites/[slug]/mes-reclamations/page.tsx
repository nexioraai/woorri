import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesEchanges from '../espace/MesEchanges'
import { motsEchanges } from '../espace/motsEchanges'

// LOT 11 — une adresse, un type. Tout le reste est dans le gabarit : deux
// copies, c'est deux endroits où le `noindex` peut manquer à l'une d'elles.
const titre = (lang: string | null) => motsEchanges(lang).titreReclamations
const phrase = (lang: string | null) => motsEchanges(lang).phraseReclamations

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-reclamations', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mes-reclamations', titre, phrase, ...p,
    rendu: ({ slug, accent, lang }) => (
      <MesEchanges slug={slug} type="reclamation" primary={accent} mots={motsEchanges(lang).reclamations} />
    ),
  })
}
