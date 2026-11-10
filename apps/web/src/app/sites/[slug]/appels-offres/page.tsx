import type { Metadata } from 'next'
import { filDAriane } from '../themes/filDAriane'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { fetchAvisIndex } from './fetchAvis'
import { getAvisLabels, echeanceAffichee, libelleEtat, tronquer } from './labels'
import { partager, etatVisible } from './cycleDeVie'
import { lireFiltre, compter, filtrer, FILTRES } from './filtrerAvis'
import { partagerArchive } from './archiver'
import { compterAvis } from './comptesAvis'
import EnTeteAvis from './EnTeteAvis'
import CarteAvis from './CarteAvis'
import { methodesPresentes, SIGNE_FILTRE } from './legendeMethodes'
import { fetchTextesAvis } from './fetchAvis'
import BlocsDePage from '../pages/BlocsDePage'
import { lirePosition } from '../pages/blocs'
import { resolveSiteBaseUrl } from '../themes/shared'
import { ogLocaleFor } from '@/lib/i18n/supportedLanguages'
import HtmlLang from '../themes/HtmlLang'
import JsonLdScript from '../themes/JsonLdScript'

// ============================================================
// A2 (c) -- LISTE PUBLIQUE DES AVIS DE MARCHE.
//
// AUCUN `export const revalidate`, ET C'EST LA MEME DECISION QUE LE BLOG.
// Cette page appelle `headers()` pour resoudre le domaine reellement servi :
// la declarer revalidable ouvrirait un cache PARTAGE entre locataires. Sur un
// portail de marches, un cache inter-locataire servirait l'avis d'un acheteur
// sur le domaine d'un autre.
//
// SEGMENT STATIQUE, DONC PRIORITAIRE SUR LE CATCH-ALL `[...rest]` dans
// l'ordre de routage de Next.js. Rien a ajouter au proxy :
// `cpa-tchad.deribfy.app/appels-offres` est deja reecrit en
// `/sites/{slug}/appels-offres`.
//
// LIENS ABSOLUS, RESOLUS PAR `resolveSiteBaseUrl`. Un chemin plateforme en
// dur serait re-prefixe par le proxy sur un sous-domaine et tomberait en 404.
// ============================================================

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) return { title: 'Appels d’offres introuvables' }

  const { site } = donnees
  const t = getAvisLabels(site.lang)
  const title = `${t.titre} — ${site.name}`
  const description = tronquer(site.slogan ?? site.about)
  const url = `${resolveSiteBaseUrl(site, (await headers()).get('host'))}/appels-offres`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, url, siteName: site.name,
      type: 'website', locale: ogLocaleFor(site.lang),
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function AppelsOffresPage({ params, searchParams }: Props) {
  const { slug } = await params
  const donnees = await fetchAvisIndex(slug)
  if (!donnees) notFound()

  const { site, avis: tousLesAvis } = donnees

  // LOT 5 — LE FILTRE. Il se decide sur l'etat VISIBLE : un avis « ouvert »
  // dont l'echeance est passee se range dans « clos », sinon un fournisseur
  // croit pouvoir encore repondre. Le moment est pris UNE fois et passe,
  // pour que toutes les lignes soient jugees au meme instant.
  // L'HEURE EST LUE UNE SEULE FOIS ET PASSEE PARTOUT -- filtre compris.
  // Deux appels a `new Date()` dans le meme rendu peuvent tomber de part et
  // d'autre d'une echeance : la barre compterait un avis dans « En cours »
  // pendant que le tableau le classerait clos. Le cliquet de ce depot compte
  // les lectures d'horloge ; il m'a repris sur ce fichier meme.
  const maintenant = new Date()
  const filtreActif = lireFiltre((await searchParams)?.etat)
  const textes = await fetchTextesAvis(site.id)
  const methodes = methodesPresentes(tousLesAvis)

  // LOT 5bis — LA COLONNE LATÉRALE.
  //
  // Elle ne porte AUCUN type de bloc neuf : un « Besoin d'aide ? » est un
  // encadré, des liens rapides sont un bloc `liens`. Ce qui manquait n'était
  // pas un vocabulaire, c'était une POSITION.
  //
  // PAS DE COLONNE VIDE : si aucun bloc ne demande `cote`, la page reste sur
  // une seule colonne pleine largeur. Une colonne droite vide mangerait un
  // tiers de l'écran pour ne rien dire.
  const blocsCote = textes.filter((b) => lirePosition(b.position) === 'cote')
  const blocsHaut = textes.filter((b) => lirePosition(b.position) !== 'cote')
  const comptes = compter(tousLesAvis, maintenant)
  const avis = filtrer(tousLesAvis, filtreActif, maintenant)
  const base = resolveSiteBaseUrl(site, (await headers()).get('host'))
  const t = getAvisLabels(site.lang)
  const accent = site.primary_color || '#111111'
  const lang = (site.lang || 'fr').slice(0, 2)
  const rtl = lang === 'ar'

  // JSON-LD. `CollectionPage` + `ItemList`, ET NON un type invente.
  // schema.org ne modelise PAS l'avis de marche : lui attribuer `Product` ou
  // `Offer` dirait aux moteurs qu'un marche public est un article en vente.
  // Un portail d'Etat ne se declare pas en boutique faute de vocabulaire.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${t.titre} — ${site.name}`,
    url: `${base}/appels-offres`,
    inLanguage: site.lang || undefined,
    isPartOf: { '@type': 'WebSite', name: site.name, url: base },
    // LOT 18 — le fil d'Ariane déclaré aux moteurs.
    breadcrumb: filDAriane(site.name, base, [{ nom: t.titre, url: `${base}/appels-offres` }]),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: avis.length,
      itemListElement: avis.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: a.objet,
        url: `${base}/appels-offres/${encodeURIComponent(a.reference_slug)}`,
      })),
    },
  }

  const contact = site.contact ?? {}

  const { enCours, clotures: tousClos } = partager(avis, maintenant)

  // LOT 5d — L'ARCHIVE. Les avis clos de l'ANNEE COURANTE restent ici ; les
  // plus anciens passent sur /appels-offres/archive. Au bout de deux ans,
  // tout garder noierait ce qu'un fournisseur vient chercher -- ce a quoi il
  // peut encore repondre -- sous ce qui est fini. Rien n'est supprime : une
  // autre adresse, pas une disparition.
  const { recents: clotures, archives } = partagerArchive(tousClos, maintenant)


  // Le tableau défile DANS SON PROPRE CONTENEUR : le corps de la page ne part
  // jamais en défilement horizontal (WCAG 2.2 AA, 1.4.10).
  // LOT 5bis — DES CARTES, PLUS UN TABLEAU.
  //
  // Un tableau met la reference, l'objet, la date et l'etat sur le meme
  // plan. Un fournisseur cherche d'abord DEUX choses : est-ce encore
  // ouvert, et combien de temps lui reste-t-il. Une carte hierarchise ;
  // une ligne ne le peut pas.
  //
  // La grille se replie seule sur telephone -- aucune mise en page
  // horizontale a faire defiler du doigt.
  const section = (lignes: typeof avis, titre: string, id: string, note?: string) => (
    <section key={id} aria-labelledby={id} style={{ marginBottom: 44 }}>
      <h2 id={id} style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
        {titre}
      </h2>
      {note && <p style={{ fontSize: 14, opacity: 0.6, margin: '0 0 16px', lineHeight: 1.5 }}>{note}</p>}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 14,
      }}>
        {lignes.map((a) => {
          const ev = etatVisible(a, maintenant)
          const ech = echeanceAffichee(a.remise_le, ev, site.lang)
          return (
            <CarteAvis
              key={a.reference_slug}
              reference={a.reference}
              objet={a.objet}
              methode={a.methode ?? null}
              echeance={ech?.texte ?? null}
              etatVisible={ev}
              libelleEtat={libelleEtat(ev, site.lang)}
              href={`${base}/appels-offres/${a.reference_slug}`}
              remiseLe={a.remise_le}
              maintenant={maintenant}
              libelles={{ remise: t.colRemise, joursRestants: t.joursRestants, nonRenseigne: t.nonRenseigne }}
              primary={accent}
            />
          )
        })}
      </div>
    </section>
  )

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <HtmlLang lang={site.lang} />
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ maxWidth: 1040, margin: '0 auto', padding: '64px 24px' }}
      >
        {/* LOT 5bis — LE BANDEAU, LES COMPTEURS, PUIS LES TEXTES DU CLIENT.
            Les quatre nombres sont DÉDUITS des avis réels ; les textes
            viennent d'une page déclarée au chemin `appels-offres`, éditée
            avec l'éditeur qui existe déjà. Aucun écran neuf. */}
        <EnTeteAvis
          titre={t.titre}
          phrase={`${t.sousTitre} — ${site.name}`}
          filDAriane={
            <Link href={base} style={{ color: 'inherit', textDecoration: 'underline' }}>
              {t.accueil}
            </Link>
          }
          comptes={compterAvis(tousLesAvis, maintenant)}
          libelles={t.comptes}
          primary={accent}
          rtl={rtl}
        />

        {blocsHaut.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <BlocsDePage blocs={blocsHaut} base={base} primary={accent} lang={site.lang} />
          </div>
        )}

        {/* LOT 5 — LA BARRE DE FILTRE.
            Des LIENS, pas des boutons : l'adresse porte le filtre, donc elle
            se partage, se met en favori, et fonctionne sans JavaScript. Les
            comptes ne mentent pas a zero — une case vide affiche 0 au lieu
            de disparaitre, sinon l'absence et l'inexistence se confondent. */}
        {tousLesAvis.length > 0 && (
          <nav aria-label={t.titre} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 28px' }}>
            {FILTRES.map((f) => {
              const actif = f === filtreActif
              return (
                <a key={f} href={f === 'tous' ? '?' : `?etat=${f}`}
                  aria-current={actif ? 'page' : undefined}
                  style={{
                    padding: '7px 14px', borderRadius: 999, fontSize: 14,
                    border: `1px solid ${actif ? accent : 'rgba(127,127,127,0.35)'}`,
                    background: actif ? accent : 'transparent',
                    color: actif ? '#fff' : 'inherit',
                    textDecoration: 'none', fontWeight: actif ? 600 : 400,
                  }}>
                  <span aria-hidden style={{ marginInlineEnd: 6, opacity: 0.8 }}>{SIGNE_FILTRE[f]}</span>
                  {t.filtres[f]} <span style={{ opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>{comptes[f]}</span>
                </a>
              )
            })}
          </nav>
        )}

        {/* LA COLONNE LATÉRALE VIT AUTOUR DE LA LISTE, PAS DEDANS.
            Mesuré le 2026-11-08 : elle était enfermée dans la branche
            « il y a des avis », donc invisible sur un site qui n'en publie
            aucun — alors que c'est PRÉCISÉMENT là qu'un fournisseur a
            besoin des liens rapides et du « Besoin d'aide ? ».

            Sur téléphone elle passe DESSOUS : on cherche les marchés
            d'abord, les liens ensuite. */}
        {blocsCote.length > 0 && (
          <style>{`
            @media (min-width: 900px) {
              .avecCote { grid-template-columns: minmax(0, 1fr) 300px }
            }
          `}</style>
        )}
        <div className={blocsCote.length > 0 ? 'avecCote' : undefined}
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 28, alignItems: 'start' }}>
          <div>
        {avis.length === 0 ? (
          // ============================================================
          // LA SECTION VIDE INFORME, ELLE NE DÉCORE PAS. Loi du lot A2 ③ :
          // les comptes ne mentent pas quand ils sont à zéro.
          //
          // ET ELLE N'INVENTE AUCUN CANAL. Un avis porte sa propre
          // `canal_officiel_url` ; à zéro avis il n'y a aucune URL à
          // afficher, et le site ne déclare nulle part de canal officiel --
          // mesure du 2026-11-06 sur les 40 champs non vides de la CPA. La
          // règle du propriétaire tranche : « on ne met rien sur ce site que
          // la CPA n'ait pas dit ». On renvoie au contact que l'acheteur a
          // RÉELLEMENT donné, et à rien d'autre.
          // ============================================================
          <section
            aria-labelledby="avis-vide"
            style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 14, padding: '32px 28px' }}
          >
            <h2 id="avis-vide" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>
              {t.vide}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
              {t.videSuite}
            </p>
            {(contact.email || contact.phone) && (
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: '16px 0 0' }}>
                {contact.email && (
                  <a href={`mailto:${contact.email}`} style={{ color: accent }}>{contact.email}</a>
                )}
                {contact.email && contact.phone && <span style={{ opacity: 0.4 }}> · </span>}
                {contact.phone && (
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} style={{ color: accent }}>
                    {contact.phone}
                  </a>
                )}
              </p>
            )}
          </section>
        ) : (
          // UNE SECTION VIDE NE S'AFFICHE PAS. Un titre « Avis clôturés »
          // au-dessus d'un tableau sans ligne annoncerait une rubrique que
          // l'acheteur ne tient pas -- la famille même qu'on corrige ici.
          <>
            {enCours.length > 0 && section(enCours, t.sectionEnCours, 'avis-en-cours')}
            {clotures.length > 0 && section(clotures, t.sectionClotures, 'avis-clotures', t.noteClotures)}

            {/* LE LIEN PORTE SON COMPTE. « Archive » sans chiffre ne dit pas
                s'il y a quelque chose derriere, et a zero archive il n'y a
                AUCUN lien : proposer une archive vide, c'est promettre un
                contenu qu'on ne livre pas. */}
            {/* LOT 5bis — LA LÉGENDE DES TYPES DE MARCHÉ, DÉDUITE.
                Elle ne montre que les méthodes RÉELLEMENT employées par les
                avis du site. Zéro méthode → aucun encart : une légende vide
                est une promesse non tenue. Ce que chaque sigle VEUT DIRE
                vient des blocs éditables, parce que seule la Centrale sait
                ce que recouvre sa propre nomenclature. */}
            {methodes.length > 0 && (
              <aside aria-label={t.legendeMethodes} style={{
                border: '1px solid #e3e3e3', borderRadius: 14, padding: '16px 18px',
                background: '#f7f7f8', marginTop: 28,
              }}>
                <h2 style={{
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
                  textTransform: 'uppercase', color: '#5b5b5b', margin: '0 0 12px',
                }}>{t.legendeMethodes}</h2>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {methodes.map((m) => (
                    <li key={m.code} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
                        background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent,
                      }}>{m.code}</span>
                      <span style={{ fontSize: 13, color: '#5b5b5b', fontVariantNumeric: 'tabular-nums' }}>
                        {m.nombre}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            {archives.length > 0 && (
              <p style={{ margin: '28px 0 0', fontSize: 15 }}>
                <a href="/appels-offres/archive" style={{ color: accent, fontWeight: 600 }}>
                  {t.lienArchive} <span style={{ fontVariantNumeric: 'tabular-nums' }}>({archives.length})</span>
                </a>
              </p>
            )}
          </>
        )}
          </div>

          {/* ELLE EST SERVIE DANS LES DEUX CAS, avec ou sans avis. */}
          {blocsCote.length > 0 && (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <BlocsDePage blocs={blocsCote} base={base} primary={accent} lang={site.lang} />
            </aside>
          )}
        </div>
      </main>
    </>
  )
}
