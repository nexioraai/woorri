import PageAcces, { metadonneesAcces, type PropsAcces } from '../acces/PageAcces'

// LOT 11 — une adresse, un ecran. Tout le reste est dans le gabarit : trois
// copies, c'est trois endroits où le `noindex` peut manquer à l'un d'eux.
export const generateMetadata = (p: PropsAcces) => metadonneesAcces('inscription', p)

export default function Page(p: PropsAcces) {
  return PageAcces({ ecran: 'inscription', ...p })
}
