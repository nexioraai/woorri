import Link from 'next/link'
import type { Site } from './shared'
import { resolveSiteBaseUrl } from './shared'
import { getAvisLabels } from '../appels-offres/labels'

// ============================================================
// A2 d1 -- LA SECTION D'ACCUEIL DES AVIS DE MARCHE.
//
// ── UN SEUL COMPOSANT, QUATRE POINTS D'INSERTION.
//
// Les quatre themes le rendent ; aucun ne le reecrit. L'ecrire quatre fois
// aurait recree exactement la forme qu'on repare ailleurs dans ce lot --
// `ctaHref` dupliquE dans quatre themes, avec une divergence deja survenue
// entre deux d'entre eux.
//
// ── ELLE NE S'AFFICHE JAMAIS VIDE, ET CE N'EST PAS UN DETAIL.
//
// Loi A2 ③, precisee par le proprietaire pour l'accueil : « une section
// d'accueil VIDE est pire qu'une section absente. Un bloc *Appels d'offres*
// sans aucun avis donne l'impression d'un site en panne, pas d'une centrale
// qui n'a rien publie cette semaine. »
//
// La garde est donc chez l'APPELANT (`hasAvis && …`), et ce composant ne
// recoit jamais une liste vide. Il n'a pas d'etat vide -- en lui en donnant
// un, on finirait par l'afficher.
//
// ── IL NE LIT RIEN.
//
// Aucune requete ici. Les avis arrivent par la seule route posee en d0/e0
// (`avisDuSite.ts`) : un theme est SYNCHRONE, il ne peut pas `await`, donc il
// ne peut que RECEVOIR. Ce composant ne doit pas devenir la faille par
// laquelle une seconde route s'ouvrirait.
// ============================================================

export default function SectionAppelsOffres({
  site,
  primary,
  host,
}: {
  site: Site
  primary: string
  /** L'hote REELLEMENT servi -- jamais `NEXT_PUBLIC_SITE_URL`. */
  host: string | null
}) {
  const t = getAvisLabels(site.lang)
  const base = resolveSiteBaseUrl(site, host)
  const rtl = (site.lang || 'fr').slice(0, 2) === 'ar'

  return (
    <section
      id="appels-offres"
      aria-labelledby="appels-offres-titre"
      className="py-24 md:py-32"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-5xl mx-auto px-6">
        <h2
          id="appels-offres-titre"
          className="font-serif text-4xl md:text-5xl leading-tight tracking-tight mb-4"
        >
          {t.titre}
        </h2>
        <p className="text-lg opacity-70 mb-10 max-w-2xl leading-relaxed">{t.sousTitre}</p>

        {/* LE LIEN MENE A LA PAGE, PAS A UNE ANCRE. Une ancre renverrait vers
            cette section meme -- un bouton qui ne mene nulle part. Et
            `resolveSiteBaseUrl` est obligatoire : un chemin plateforme en dur
            serait re-prefixe par le proxy sur un sous-domaine et tomberait
            en 404. */}
        <Link
          href={`${base}/appels-offres`}
          className="inline-flex items-center gap-2 px-7 py-4 rounded-full font-medium text-white transition hover:-translate-y-0.5"
          style={{ backgroundColor: primary }}
        >
          {t.titre}
          <span aria-hidden="true">{rtl ? '←' : '→'}</span>
        </Link>
      </div>
    </section>
  )
}
