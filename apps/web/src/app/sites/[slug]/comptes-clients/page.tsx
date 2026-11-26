import type { Institution } from '@/lib/sites/institution'
import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import ComptesClients from '../espace/ComptesClients'
import { motsMessages } from '../espace/motsMessages'
import { motsCommandes } from '../espace/motsCommandes'

// « CLIENTS » — la Division DDM voit tous les clients, leur écrit, suit leurs
// commandes et gère leur compte (CPA, 2026-11-19). La route refuse quiconque
// n'est ni propriétaire ni agent DDM.
const titre = (lang: string | null, inst: Institution) => motsMessages(lang, inst).clients.titre
const phrase = (lang: string | null, inst: Institution) => motsMessages(lang, inst).clients.phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('comptes-clients', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'comptes-clients', titre, phrase, ...p,
    rendu: ({ slug, accent, lang, inst }) => <ComptesClients slug={slug} accent={accent} mots={motsMessages(lang, inst)} motsCmd={motsCommandes(lang, inst)} />,
  })
}
