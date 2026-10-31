'use client'

/**
 * CE QUE LE NAVIGATEUR A REELLEMENT RECU — rendu lisible dans la page.
 *
 * ── POURQUOI CE COMPOSANT EXISTE (arbitrage du proprietaire, 2026-10-31).
 *
 * `NEXT_PUBLIC_GENERATEUR_MOTEUR` est FIGE dans le paquet client au moment
 * de la construction. Deux tentatives precedentes de verifier la coherence
 * etaient fausses :
 *
 *   1. lire les deux variables COTE SERVEUR — mentait, parce que changer le
 *      reglage chez l'hebergeur sans redeployer laisse l'ecran sur
 *      l'ancienne valeur et le serveur sur la nouvelle ;
 *   2. GRAVER la valeur dans un fichier au build — deplacait le faux vert
 *      d'un cran : rien ne prouvait que l'hebergeur avait regenere, et on
 *      comparait encore deux lectures de la MEME variable en esperant
 *      qu'elles correspondent au paquet client.
 *
 * Ce composant est marque `'use client'` : sa valeur est donc SUBSTITUEE A
 * LA COMPILATION dans le paquet que le navigateur telecharge. En la rendant
 * dans la page, le controle d'apres-deploiement peut la LIRE par une simple
 * requete HTTP — l'inference devient une mesure, et le fichier genere
 * disparait avec ses deux risques.
 *
 * ── CETTE VALEUR DEVIENT PUBLIQUE, ET C'EST ASSUME.
 *
 * Elle vaut « air » ou « direct ». Ce n'est ni un secret, ni une cle, ni une
 * adresse : c'est le nom du moteur qui sert. Toute personne qui genere une
 * application l'apprend de toute facon — l'ecran le lui dit deja en toutes
 * lettres (« Ecriture directe — version a l'essai »).
 */
import { moteurChoisi } from '@/lib/apps/interrupteur-moteur'

/** Le nom de la balise, partage avec le controle qui la lit. */
export const MARQUEUR_MOTEUR = 'deribfy-moteur-client'

export function MarqueurMoteur() {
  const brut = process.env.NEXT_PUBLIC_GENERATEUR_MOTEUR
  return (
    <meta
      name={MARQUEUR_MOTEUR}
      content={moteurChoisi(brut)}
      data-posee={brut === undefined ? 'non' : 'oui'}
    />
  )
}
