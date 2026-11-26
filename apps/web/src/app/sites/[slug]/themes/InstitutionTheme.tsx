// LE THÈME DES SITES INSTITUTIONNELS (lot 4b, 2026-11-26).
//
// Seulement pour les institutions GÉNÉRÉES (`theme = 'institution'`) : la CPA
// (editorial) et tous les autres sites gardent leur thème, inchangé.
// Un vrai site institutionnel : grand menu à panneaux, une couleur par
// rubrique tirée de la couleur du site, titres très gras, bandeau défilant
// (phrases de la mission), chiffres clés JAMAIS faux (masqués aux visiteurs
// tant qu'ils ne sont pas remplis), parfait sur téléphone.
import type { Site } from './shared'
import { resolveSiteBaseUrl } from './shared'
import type { AvisDuSite } from './avisDuSite'
import { lienContact } from './destinationBouton'
import CadreInstitution from './institution/CadreInstitution'
import type { DonneesInstitution } from './institution/types'
import SectionActualites from './SectionActualites'
import Partenaires from '../pages/Partenaires'
import { chiffreRempli } from '@/lib/sites/institutionVisuel'

/** Les chiffres clés se montrent aux visiteurs seulement s'ils sont TOUS remplis ; au propriétaire, toujours. */
export function chiffresVisibles(d: Pick<DonneesInstitution, 'chiffres' | 'proprietaire'>): boolean {
  if (d.chiffres.length === 0) return false
  return d.proprietaire || d.chiffres.every((c) => chiffreRempli(c.valeur))
}

export default function InstitutionTheme({ site, host = null, actualites = [], partenaires = [], liensLegaux = [], institution }: { site: Site } & AvisDuSite & { institution?: DonneesInstitution }) {
  const d: DonneesInstitution = institution ?? { rubriques: [], bandeau: [], chiffres: [], proprietaire: false }
  const base = resolveSiteBaseUrl(site, host)
  const couleur = site.primary_color || '#1e4d8c'
  const contact = lienContact(site, host)
  const c = site.contact ?? {}
  const aContact = Boolean(c.phone || c.email || c.address)
  return (
    <CadreInstitution nom={site.name} logo={site.logo_url} slug={site.slug} base={base} couleur={couleur} rubriques={d.rubriques} contact={contact} liensLegaux={liensLegaux}>
      <main id="home">
        {/* ── HÉROS : la photo du site, un titre très gras. */}
        <section className="relative min-h-[78vh] flex items-end overflow-hidden" data-heros="">
          {site.hero_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.hero_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.72) 100%), linear-gradient(90deg, ${couleur}cc 0%, transparent 70%)` }} />
          <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 pb-16 pt-32 text-white">
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-8xl max-w-5xl">{site.hero_title || site.name}</h1>
            {site.hero_subtitle && <p className="mt-6 text-lg sm:text-2xl max-w-3xl opacity-95 leading-snug">{site.hero_subtitle}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              {d.rubriques[0] && <a href={`${base}/${d.rubriques[0].chemin}`} className="rounded-full bg-white px-7 py-4 text-base font-black" style={{ color: couleur }}>{d.rubriques[0].titre}</a>}
              <a href={contact} className="rounded-full border-2 border-white px-7 py-4 text-base font-black text-white">Contact</a>
            </div>
          </div>
        </section>

        {/* ── LE BANDEAU DÉFILANT : les phrases de la mission (modifiables dans l'éditeur). */}
        {d.bandeau.length > 0 && (
          <div className="overflow-hidden py-5 text-white" style={{ backgroundColor: couleur }} data-bandeau="" aria-label="Notre mission">
            <style>{`@keyframes defile{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
            <div className="flex w-max gap-12 whitespace-nowrap motion-safe:animate-[defile_40s_linear_infinite]">
              {[...d.bandeau, ...d.bandeau].map((p, i) => (
                <span key={i} className="text-xl sm:text-2xl font-black tracking-tight" aria-hidden={i >= d.bandeau.length}>{p}<span className="mx-6 opacity-60">●</span></span>
              ))}
            </div>
          </div>
        )}

        {/* ── CHIFFRES CLÉS : jamais de faux chiffres en ligne. */}
        {chiffresVisibles(d) && (
          <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-20" data-chiffres="">
            {d.proprietaire && !d.chiffres.every((x) => chiffreRempli(x.valeur)) && (
              <p className="mb-5 rounded-xl border-l-4 bg-neutral-100 px-4 py-3 text-sm" style={{ borderColor: couleur }}>
                Visible par vous seul : remplacez « À compléter » par vos chiffres réels (page « Accueil — chiffres clés » de l’éditeur). Ce bloc n’apparaîtra aux visiteurs qu’une fois toutes les cases remplies.
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {d.chiffres.map((x, i) => (
                <div key={x.libelle} className="rounded-3xl p-6 sm:p-8 text-white" style={{ backgroundColor: d.rubriques[i % Math.max(1, d.rubriques.length)]?.couleur ?? couleur }}>
                  <p className={chiffreRempli(x.valeur) ? 'text-4xl sm:text-6xl font-black tracking-tight' : 'text-lg font-bold italic opacity-80'}>{x.valeur}</p>
                  <p className="mt-2 text-sm sm:text-base font-semibold opacity-90">{x.libelle}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── LES RUBRIQUES : une couleur chacune, leur photo, leurs sous-pages. */}
        {d.rubriques.length > 0 && (
          <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-20" data-rubriques="">
            <h2 className="text-4xl sm:text-6xl">{site.name}</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {d.rubriques.map((r) => (
                <article key={r.chemin} className="group overflow-hidden rounded-3xl text-white" style={{ backgroundColor: r.couleur }}>
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="w-full aspect-[16/9] object-cover" loading="lazy" />
                  )}
                  <div className="p-7 sm:p-9">
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tight"><a href={`${base}/${r.chemin}`}>{r.titre} →</a></h3>
                    {r.chapeau && <p className="mt-3 text-base sm:text-lg opacity-90 leading-relaxed">{r.chapeau}</p>}
                    {r.enfants.length > 0 && (
                      <ul className="mt-5 flex flex-wrap gap-2" style={{ listStyle: 'none', padding: 0 }}>
                        {r.enfants.map((e) => <li key={e.chemin}><a href={`${base}/${e.chemin}`} className="inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25">{e.titre}</a></li>)}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── QUI NOUS SOMMES : la présentation et la mission de la génération. */}
        {(site.about || site.mission) && (
          <section id="a-propos" className="max-w-7xl mx-auto px-5 sm:px-8 pt-24 grid gap-10 lg:grid-cols-2">
            <h2 className="text-4xl sm:text-6xl">{site.mission ? site.mission : 'Qui sommes-nous'}</h2>
            {site.about && <p className="text-lg sm:text-xl leading-relaxed text-neutral-700">{site.about}</p>}
          </section>
        )}

        {actualites.length > 0 && <SectionActualites site={site} primary={couleur} host={host} posts={actualites} />}
        {partenaires.length > 0 && <div className="max-w-7xl mx-auto px-5 sm:px-8"><Partenaires items={partenaires} primary={couleur} /></div>}

        {/* ── CONTACT : seulement ce qui est réellement renseigné ; rien n'est inventé. */}
        <section id="contact" className="max-w-7xl mx-auto px-5 sm:px-8 pt-24">
          <h2 className="text-4xl sm:text-6xl">Contact</h2>
          {aContact ? (
            <ul className="mt-8 grid gap-4 sm:grid-cols-3" style={{ listStyle: 'none', padding: 0 }}>
              {c.address && <li className="rounded-3xl bg-neutral-100 p-6 text-lg font-semibold">{c.address}</li>}
              {c.phone && <li className="rounded-3xl bg-neutral-100 p-6 text-lg font-semibold"><a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></li>}
              {c.email && <li className="rounded-3xl bg-neutral-100 p-6 text-lg font-semibold"><a href={`mailto:${c.email}`}>{c.email}</a></li>}
            </ul>
          ) : d.proprietaire ? (
            <p className="mt-6 rounded-xl border-l-4 bg-neutral-100 px-4 py-3" style={{ borderColor: couleur }}>À compléter : l’adresse, le téléphone et le courriel officiels, depuis « Éditer » (visible par vous seul).</p>
          ) : null}
        </section>
      </main>
    </CadreInstitution>
  )
}
