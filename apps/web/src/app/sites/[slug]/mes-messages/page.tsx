import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesMessages from '../espace/MesMessages'
import { motsMessages } from '../espace/motsMessages'

// LES MESSAGES DU CLIENT avec la Division DDM (CPA, 2026-11-19).
const titre = (lang: string | null) => motsMessages(lang).titre
const phrase = (lang: string | null) => motsMessages(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-messages', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'mes-messages', titre, phrase, ...p,
    rendu: ({ slug, accent, lang }) => <MesMessages slug={slug} accent={accent} mots={motsMessages(lang).fil} />,
  })
}
