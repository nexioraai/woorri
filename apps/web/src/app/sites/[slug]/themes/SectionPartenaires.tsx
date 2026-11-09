import Partenaires, { type Partenaire } from '../pages/Partenaires'
import SectionKicker from './SectionKicker'

// ============================================================================
// LOT 15.13 — LES PARTENAIRES, SUR L'ACCUEIL, JUSTE AVANT CONTACT.
//
// ── CE QUI ÉTAIT MAL PLACÉ, ET MESURÉ À L'ÉCRAN.
//
// Le lot 15.5 avait fait du bandeau un BLOC de page, posé au bas de
// `/qui-sommes-nous`. Propriétaire, 2026-11-09, capture à l'appui : « pour
// cpa tu as mal placé, il faut que ça soit visible juste au-dessus de
// contact ». Personne ne descend une sous-page pour savoir avec qui
// travaille la Centrale. Sur EPSS la section est sur l'accueil, en bas —
// c'est là qu'on la rencontre sans la chercher.
//
// ── DEUX LIGNES, PAS UNE RÉPÉTÉE.
//
// Premier jet : le même mot en surtitre ET en titre. EPSS écrit
// « Collaboration » au-dessus de « Nos partenaires » : le surtitre dit la
// NATURE de la section, le titre dit son CONTENU. Répéter n'ajoute rien et
// se remarque.
//
// ── ELLE NE PARAÎT PAS SI ELLE EST VIDE.
//
// Les 41 autres sites n'ont pas de partenaires, et un titre au-dessus d'une
// bande blanche vaut moins que rien : il dit qu'il manque quelque chose.
//
// ── ELLE NE RÉÉCRIT PAS LE BANDEAU.
//
// Le défilement, le monogramme, le gris qui reprend ses couleurs au survol :
// tout cela vit dans `Partenaires`, et sert aussi le bloc de page. Deux
// rendus pour la même donnée divergeraient au premier réglage.
// ============================================================================

export default function SectionPartenaires({
  items, primary, surtitre, titre, phrase, sombre = false,
}: {
  items: Partenaire[]
  primary: string
  surtitre: string
  titre: string
  phrase?: string | null
  /** Le thème noir pose sa propre encre : le titre doit suivre son fond. */
  sombre?: boolean
}) {
  if (!items.length) return null

  return (
    <section id="partenaires" className="reveal py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="text-center mb-12">
          <SectionKicker color={primary}>{surtitre}</SectionKicker>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-4"
            style={{ color: sombre ? '#f5f3ee' : '#111111' }}>
            {titre}
          </h2>
          {phrase && (
            <p className="mt-4 max-w-2xl mx-auto leading-relaxed"
              style={{ color: sombre ? 'rgba(245,243,238,0.72)' : '#5b5b5b' }}>
              {phrase}
            </p>
          )}
        </div>
        <Partenaires items={items} primary={primary} />
      </div>
    </section>
  )
}
