import PageEspace, { metadonneesEspace, type PropsEspace } from '../espace/PageEspace'
import GestionCommandes from '@/app/comptes/[slug]/GestionCommandes'

// L'ESPACE CLIENT EST CONFIÉ À LA DIVISION DDM (CPA, 2026-11-19) : ses agents
// traitent ici toutes les commandes. La route refuse quiconque n'est ni
// propriétaire ni agent DDM ; la page ne fait qu'afficher sa réponse.
const titre = () => 'Gestion des commandes'
const phrase = () => 'Les bons de commande des structures clientes. Changez l’état et répondez : le client le voit dans son espace.'

export const generateMetadata = (p: PropsEspace) => metadonneesEspace('gestion-commandes', titre, p)

export default function Page(p: PropsEspace) {
  return PageEspace({
    chemin: 'gestion-commandes', titre, phrase, ...p,
    rendu: ({ slug, accent }) => <GestionCommandes slug={slug} clair accent={accent} sansTitre />,
  })
}
