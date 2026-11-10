import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import MesConsultations, { type AvisOuvert } from '../espace/MesConsultations'
import { motsConsultations } from '../espace/motsConsultations'
import { fetchAvisIndex } from '../appels-offres/fetchAvis'

// LOT 12.4 — les avis viennent de la VUE PUBLIQUE, par le lecteur existant :
// cet écran ne rouvre pas une seconde porte vers `appels_offres`.
const titre = (lang: string | null) => motsConsultations(lang).titre
const phrase = (lang: string | null) => motsConsultations(lang).phrase

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('mes-consultations', titre, p)

export default async function Page(p: PropsEspace) {
  const { slug } = await p.params
  const index = await fetchAvisIndex(slug)
  const avis = (index?.avis ?? []) as unknown as AvisOuvert[]
  return PageEspace({
    chemin: 'mes-consultations', titre, phrase, ...p,
    rendu: ({ slug: sl, base, accent, lang }) => (
      <MesConsultations slug={sl} base={base} avis={avis} primary={accent} mots={motsConsultations(lang)} />
    ),
  })
}
