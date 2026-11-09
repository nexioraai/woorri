import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesEchanges from '../espace/MesEchanges'
import { motsEchanges } from '../espace/motsEchanges'

// LOT 11 — une adresse, un type. Tout le reste est dans le gabarit : deux
// copies, c'est deux endroits où le `noindex` peut manquer à l'une d'elles.
const titre = (lang: string | null) => motsEchanges(lang).titreDemandes
const phrase = (lang: string | null) => motsEchanges(lang).phraseDemandes

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-demandes', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mes-demandes', titre, phrase, ...p,
    rendu: ({ slug, accent, lang }) => (
      <MesEchanges slug={slug} type="demande" primary={accent} mots={motsEchanges(lang).demandes} />
    ),
  })
}
