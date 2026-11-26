import type { Institution } from '@/lib/sites/institution'
import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesEchanges from '../espace/MesEchanges'
import { motsEchanges } from '../espace/motsEchanges'

// LOT 11 — une adresse, un type. Tout le reste est dans le gabarit : deux
// copies, c'est deux endroits où le `noindex` peut manquer à l'une d'elles.
const titre = (lang: string | null, inst: Institution) => motsEchanges(lang, inst).titreDemandes
const phrase = (lang: string | null, inst: Institution) => motsEchanges(lang, inst).phraseDemandes

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-demandes', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mes-demandes', titre, phrase, ...p,
    rendu: ({ slug, accent, lang, inst }) => (
      <MesEchanges slug={slug} type="demande" primary={accent} mots={motsEchanges(lang, inst).demandes} />
    ),
  })
}
