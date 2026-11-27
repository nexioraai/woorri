// L'EN-TÊTE D'UNE PAGE INTÉRIEURE D'INSTITUTION (lot 4c, 2026-11-26).
// Au lieu d'une page blanche : un bandeau à la COULEUR DE LA RUBRIQUE, sa
// photo (africaine, vérifiée à la génération), le fil d'Ariane et un grand
// titre. Pas de hauteur d'écran imposée : un contenu court ne laisse pas un
// grand vide sous lui.
import Link from 'next/link'

export default function EnTetePage({ titre, chapeau, couleur, image, base, accueil, fil }: {
  titre: string
  chapeau: string | null
  couleur: string
  image: string | null
  base: string
  accueil: string
  fil: { chemin: string; titre: string }[]
}) {
  return (
    <section className="relative overflow-hidden text-white" style={{ backgroundColor: couleur }} data-entete-page="">
      {image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-full md:w-3/5 object-cover" />
          <div className="absolute inset-0" data-voile="" style={{ background: `linear-gradient(90deg, ${couleur} 0%, ${couleur} 38%, ${couleur}cc 62%, ${couleur}33 100%)` }} />
        </>
      )}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
        <nav aria-label="Fil d'Ariane" className="text-sm font-semibold opacity-90" data-fil-ariane="">
          <Link href={base || '/'} className="hover:underline">{accueil}</Link>
          {fil.map((p) => (
            <span key={p.chemin}>
              <span aria-hidden="true" className="mx-2 opacity-60">›</span>
              <Link href={`${base}/${p.chemin}`} className="hover:underline">{p.titre}</Link>
            </span>
          ))}
          <span aria-hidden="true" className="mx-2 opacity-60">›</span>
          <span aria-current="page">{titre}</span>
        </nav>
        <h1 className="mt-6 text-[2.4rem] leading-[1.04] sm:text-6xl lg:text-7xl max-w-4xl">{titre}</h1>
        {chapeau && <p className="mt-5 text-lg sm:text-2xl max-w-3xl leading-snug opacity-95">{chapeau}</p>}
      </div>
    </section>
  )
}
