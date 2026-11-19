import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import ComptesClients from '../espace/ComptesClients'

// LES COMPTES CLIENTS, gérés par la division DDM (CPA, 2026-11-19).
const titre = () => 'Comptes clients'
const phrase = () => 'Division DDM — les structures sanitaires inscrites. Suspendre un compte lui ferme l’espace client ; réactiver le lui rouvre.'

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('comptes-clients', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'comptes-clients', titre, phrase, ...p,
    rendu: ({ slug, accent }) => <ComptesClients slug={slug} accent={accent} />,
  })
}
