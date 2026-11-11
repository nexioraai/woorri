// src/app/sites/[slug]/themes/EditorialTheme.tsx
import { lienTel } from '@/lib/telephone'
import { destinationDuBouton, lienContact, lienAccueil, lienSection } from './destinationBouton'
import Image from 'next/image'
import Link from 'next/link'
import {
  Phone,
  Mail,
  MapPin,
  Star,
  Quote,
  ArrowRight,
} from 'lucide-react'
import { Instagram, Facebook, TikTok, WhatsApp } from './BrandIcons'
import MobileNav from './MobileNav'
import SectionPartenaires from './SectionPartenaires'
import DessinDeMenu from './DessinDeMenu'
import ContactForm from '../ContactForm'
import {
  WOORRI_SITE_URL,
  normalizeProduct,
  mockupsToProducts,
} from './shared'
import {
  type Site,
  normalizeService,
  normalizeTestimonial,
  ContactMap,
} from './shared'
import { getDict } from './i18n'
import Reveal from './Reveal'
import TiltCard from './TiltCard'
import { getModeCapabilities } from './modeCapabilities'
import type { AvisDuSite } from './avisDuSite'
import SectionAppelsOffres from './SectionAppelsOffres'
import LienAppelsOffres from './LienAppelsOffres'
import MenuDeclare from './MenuDeclare'
import HeroDiapo, { photosDAccueil } from './HeroDiapo'
import TexteQuiSEcrit from './TexteQuiSEcrit'
import HeroVitrine from '../pages/HeroVitrine'
import ParcoursDefilement from '../pages/ParcoursDefilement'
import EditorialShopSection from './EditorialShopSection'
import { socialUrl } from '@/lib/social'
import ReseauxSociaux from './ReseauxSociaux'
import RevenirEnHaut from './RevenirEnHaut'
import ClickableProductCard from './ClickableProductCard'
import EnseigneDuSite from './EnseigneDuSite'
import PageProduits, { produitsDeLaPage } from './PageProduits'

// ---------- Premium Button ----------
function PremiumButton({
  children,
  href,
  variant = 'primary',
  brand,
}: {
  children: React.ReactNode
  href: string
  variant?: 'primary' | 'ghost'
  brand: string
}) {
  const base =
    'group relative inline-flex items-center gap-2 px-7 py-4 rounded-full font-medium overflow-hidden transition-all duration-300'

  if (variant === 'ghost') {
    return (
      <a
        href={href}
        className={`${base} bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20`}
      >
        {children}
      </a>
    )
  }
  return (
    <a
      href={href}
      className={`${base} text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5`}
      style={{ backgroundColor: brand }}
    >
      {/* Shine sweep */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </a>
  )
}

// ---------- Theme ----------
export default function EditorialTheme({ site, hasAvis = false, host = null, menu = [], partenaires = [], liensLegaux = [], heroVitrine = null, encreDeMarque = false }: { site: Site } & AvisDuSite) {
  // ── LES PRODUITS, POUR LES PAGES PERSONNALISÉES.
  //
  // Les sections boutique calculent déjà cette liste chacune de leur côté ;
  // ce thème n'en avait pas besoin jusqu'ici. Une page personnalisée peut
  // désormais montrer des produits — « une page par article », la demande
  // des marchands — il lui faut donc la même liste, calculée de la même
  // façon : le catalogue vendable, plus les maquettes POD.
  const products = [...(site.products || []).map(normalizeProduct), ...mockupsToProducts(site)]

  const hidden = (name: string) => (site.hidden_sections || []).includes(name)
  const ancresEnBarre = menu.length === 0
  const primary = site.primary_color || '#111111'
  // L'ENCRE DE MARQUE (CPA, 2026-11-11 — « la couleur bleu d'anie »). Quand le
  // site la déclare, la couleur du site remplace le NOIR du thème : menu,
  // enseigne, titres, carte mise en avant, pied de page. Le blanc ne bouge
  // pas. Sans déclaration (`undefined`), chaque ligne garde son rendu d'avant.
  const encre = encreDeMarque ? primary : undefined
  const enEncre = encre ? { color: encre } : undefined
  // LA BARRE DU HAUT EN BLEU, TEXTE BLANC (modèle anie.td, 2026-11-11).
  const survolMenu = encre ? 'hover:opacity-75 transition-opacity' : 'hover:text-black transition-colors'
  const dessinMenu = encre ? '#ffffff' : primary
  const t = getDict(site.lang)
  const sections = site.sections || []
  const testimonials = (site.testimonials || []).map(normalizeTestimonial)
  const gallery: string[] = (site.gallery || []).filter((u: any) => typeof u === 'string' && u.length > 0 && u.startsWith('http'))
  const contact = site.contact || {}
  const social = site.social_links || {}
  const whyWords: Record<string, string> = { fr: 'Pourquoi', en: 'Why', es: 'Por qué', ar: 'لماذا', pt: 'Porquê', de: 'Warum', it: 'Perché' }
  const missionWords: Record<string, string> = { fr: 'Notre mission', en: 'Our mission', es: 'Nuestra misión', ar: 'مهمتنا', pt: 'Nossa missão', de: 'Unsere Mission', it: 'La nostra missione' }
  const visionWords: Record<string, string> = { fr: 'Notre vision', en: 'Our vision', es: 'Nuestra visión', ar: 'رؤيتنا', pt: 'Nossa visão', de: 'Unsere Vision', it: 'La nostra visione' }
  const whyWord = whyWords[site.lang || 'fr'] || whyWords.en
  const missionWord = missionWords[site.lang || 'fr'] || missionWords.en
  const visionWord = visionWords[site.lang || 'fr'] || visionWords.en
  const cta = site.cta || t.labels.contactCta
  const { hasShop } = getModeCapabilities(site)
  // LOT 18 — la destination suit le libellé (voir destinationBouton.ts).
  const ctaHref = destinationDuBouton(site, host, cta, hasShop)

  return (
    <div
      className="min-h-screen bg-white text-neutral-900 antialiased"
      style={{ ['--brand' as any]: primary, ...(encre ? ({ '--encre': encre } as Record<string, string>) : {}) }}
    >
      {/* Scroll reveal keyframes (pure CSS, no JS) */}
      <style>{`
        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--brand, #888); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { opacity: 0.8; }
        html { scrollbar-width: thin; scrollbar-color: var(--brand, #888) transparent; }
        @keyframes ed-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ed-rise { animation: ed-rise 0.9s ease-out both; }
        /* LA BARRE TIENT SUR TOUT ÉCRAN (HP Elite x2, 2026-11-11). Entre 1280 et
           1535 px — tablettes Windows mises à l'échelle, petits portables — le
           menu déclaré débordait de 15 px et « Contact » sortait de l'écran
           (la barre de défilement Windows en retire encore 17). À ces largeurs
           seulement : pictogrammes masqués, espacement resserré. */
        @media (min-width: 1280px) and (max-width: 1535.98px) {
          header nav.barre-declaree { gap: 12px; }
          header:has(nav.barre-declaree) > div { padding-left: 24px; padding-right: 24px; column-gap: 24px; }
          header nav.barre-declaree [data-dessin-menu] { display: none !important; } /* le dessin porte un display en ligne */
        }
      `}</style>

      {/* =================== HEADER =================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${encre ? 'bg-[color:var(--encre)] border-b border-white/10 shadow-lg' : 'backdrop-blur-md bg-white/70 border-b border-black/5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between gap-6 lg:gap-10">
          <EnseigneDuSite href={lienAccueil(site, host)}
            nom={site.name}
            logo={site.logo_url}
          slug={site.slug}
            className={ancresEnBarre
              ? "font-serif text-2xl tracking-tight font-medium"
              : "font-serif text-xl leading-tight tracking-tight font-medium"}
            style={{ fontFamily: 'var(--font-fraunces), serif', ...(encre ? { color: '#ffffff' } : {}) }}
          />
          <nav style={encre ? { color: '#ffffff' } : undefined} className={ancresEnBarre
              ? "hidden md:flex items-center gap-10 text-sm font-medium text-neutral-700"
              : "hidden xl:flex items-center gap-4 text-[13px] font-medium text-neutral-700 barre-declaree"}>
            {!hidden('Home') && <a href={lienAccueil(site, host)} className={`${survolMenu} inline-flex items-center gap-[7px] whitespace-nowrap`}><DessinDeMenu chemin="accueil" couleur={dessinMenu} />{t.nav.home}</a>}
          {/* LOT 3 — 7 novembre 2026. Quand le site DÉCLARE ses pages, la barre
              du haut leur appartient. Les ancres (#about, #faq…) encombraient
              le menu et collaient l'enseigne. Elles ne DISPARAISSENT pas : les
              sections restent sur l'accueil et le menu mobile continue de les
              lister — seule la barre se vide. Un site sans page déclarée ne
              voit aucun changement. */}
          {ancresEnBarre && (<>
            {!hidden('About') && (site.about || site.mission || site.vision) && <a href={lienSection(site, host, 'a-propos')} className={survolMenu}>{t.nav.about}</a>}
            {!hidden('Services') && sections.length > 0 && <a href={lienSection(site, host, 'services')} className={survolMenu}>{sections[0]?.name || t.nav.services}</a>}
            {hasShop && !hidden('Shop') && (
              <a href="#shop" className={survolMenu}>{t.nav.shop}</a>
            )}
            {gallery.length > 0 && !hidden('Gallery') && <a href="#gallery" className={survolMenu}>{t.nav.gallery}</a>}
            {testimonials.length > 0 && !hidden('Reviews') && <a href="#testimonials" className={survolMenu}>{t.nav.reviews}</a>}
            {(site.pages || []).filter((p: any) => p && p.title).map((page: any, pi: number) => (
              <a key={`navpage-${pi}`} href={`#page-${pi}`} className={survolMenu}>{page.title}</a>
            ))}
            {site.faq && site.faq.length > 0 && !hidden('FAQ') && <a href="#faq" className={survolMenu}>{t.nav.faq}</a>}
          </>)}
            {/* LOT 2 — les pages DÉCLARÉES, avec leurs sous-menus. Elles
                précèdent Contact, qui reste la dernière entrée. */}
            <MenuDeclare site={site} host={host} entrees={menu} className={survolMenu} couleur={dessinMenu} encrePanneau={encre} />
            {!hidden('AppelsOffres') && <LienAppelsOffres site={site} host={host} className={survolMenu} couleur={dessinMenu} />}
            {!hidden('Contact') && <a href={lienContact(site, host)} className={`${survolMenu} inline-flex items-center gap-[7px] whitespace-nowrap`}><DessinDeMenu chemin="contact" couleur={dessinMenu} />{t.nav.contact}</a>}
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav site={site} seuil={ancresEnBarre ? "md" : "xl"} cta={cta} ctaHref={ctaHref} pagesDeclarees={menu} host={host} />

      {/* =================== HERO =================== */}
      <main>
      {/* LE HERO « VITRINE », s'il est déclaré (page `accueil-hero`). Sinon,
          le hero d'avant, inchangé. */}
      {!hidden('Home') && heroVitrine && (
        <div id="home">
          {heroVitrine.affichage === 'parcours' ? (
            <>
              {/* Le h1 de l'accueil reste le titre du site : stable, lu par les moteurs. */}
              <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{site.hero_title || site.name}</h1>
              <ParcoursDefilement etapes={heroVitrine.pieces} surtitre={heroVitrine.surtitre} accent={primary} lecture="auto" />
            </>
          ) : (
            <HeroVitrine pieces={heroVitrine.pieces} surtitre={heroVitrine.surtitre} accent={primary}
              bouton={heroVitrine.bouton} lienBouton={heroVitrine.lienBouton} badge={heroVitrine.badge}
              titrePage={site.hero_title || site.name} />
          )}
        </div>
      )}
      {!hidden('Home') && !heroVitrine && (
      <section id="home" className="relative min-h-[92vh] flex items-center pt-20 overflow-hidden">
        {site.hero_image ? (
          <>
            <HeroDiapo photos={photosDAccueil(site)} className="object-cover hero-float" />
            {/* LE VOILE NE COUVRE QUE LE TEXTE (modèle anie.td, 2026-11-11).
                Avant : un voile noir sur TOUTE la photo (40 → 80 %), qui la
                rendait terne. Maintenant : sombre à gauche, sous le texte,
                transparent à droite — la photo respire. Sur téléphone, où le
                texte prend toute la largeur, un second dégradé part du bas. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent md:from-black/45 md:via-transparent md:to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950" />
        )}

        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 w-full">
          <div className="max-w-3xl text-white ed-rise">
            {site.slogan && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium tracking-[0.15em] uppercase max-w-full sm:max-w-none flex-wrap">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: primary }}
                />
                {site.slogan}
              </div>
            )}
            <h1
              className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-8 [text-shadow:0_2px_28px_rgba(0,0,0,.45)]"
              style={{ fontFamily: 'var(--font-fraunces), serif' }}
            >
              <TexteQuiSEcrit texte={site.hero_title || site.name} msParLettre={38} />
            </h1>
            {site.hero_subtitle && (
              <p className="text-lg md:text-xl text-white/90 max-w-xl mb-10 leading-relaxed [text-shadow:0_1px_14px_rgba(0,0,0,.55)]">
                {/* Le sous-titre s'écrit APRÈS le titre, comme sur anie.td. */}
                <TexteQuiSEcrit texte={site.hero_subtitle} msParLettre={16} delaiMs={(site.hero_title || site.name).length * 38 + 250} />
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <PremiumButton href={ctaHref} brand={primary}>
                {cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </PremiumButton>
              <PremiumButton href="#services" variant="ghost" brand={primary}>
                {t.hero.viewServices}
              </PremiumButton>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-xs tracking-widest uppercase animate-pulse">
          {t.hero.scroll}
        </div>
      </section>
      )}

      {/* =================== ABOUT =================== */}
      {site.about && !hidden('About') && (
        <Reveal>
        <section id="about" className="py-28 md:py-36">
          <div className="max-w-5xl mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-[1fr_2fr] gap-16 items-start">
              <div>
                <div className="text-xs font-medium tracking-[0.2em] uppercase text-neutral-500 mb-4">
                  {t.sections.aboutKicker}
                </div>
                <div className="h-px w-12" style={{ backgroundColor: primary }} />

                {Array.isArray(site.whyus) && site.whyus.length > 0 && (
                  <div className="mt-12">
                    <h3 className="text-2xl font-serif mb-8 text-neutral-900" style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}>
                      {whyWord} {site.name} ?
                    </h3>
                    <div className="space-y-8">
                    {site.whyus.map((item, i) => (
                      <div key={i}>
                        <div
                          className="text-xs font-medium tracking-[0.2em] mb-2"
                          style={{ color: primary }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <h3 className="font-medium text-neutral-900 mb-1" style={enEncre}>
                          {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-neutral-600">
                          {item.text}
                        </p>
                      </div>
                    ))}
                    </div>
                  </div>
                )}

                {(site.mission || site.vision) && (
                  <div className="mt-12 space-y-8">
                    {site.mission && (
                      <div>
                        <div className="text-xs font-medium tracking-[0.2em] mb-2" style={{ color: primary }}>
                          {missionWord}
                        </div>
                        <p className="text-sm leading-relaxed text-neutral-600">
                          {site.mission}
                        </p>
                      </div>
                    )}
                    {site.vision && (
                      <div>
                        <div className="text-xs font-medium tracking-[0.2em] mb-2" style={{ color: primary }}>
                          {visionWord}
                        </div>
                        <p className="text-sm leading-relaxed text-neutral-600">
                          {site.vision}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <h2
                  className="font-serif text-4xl md:text-5xl leading-tight mb-8"
                  style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}
                >
                  {t.sections.aboutTitle}
                </h2>
                <p className="text-lg md:text-xl leading-relaxed text-neutral-700">
                  {site.about}
                </p>
              </div>
            </div>
          </div>
        </section>
        </Reveal>
      )}

      {/* =================== SERVICES =================== */}
      {sections.length > 0 && !hidden('Services') && sections.map((sec: any, si: number) => (
        <section key={si} id={si === 0 ? "services" : `section-${si}`} className={`reveal py-28 md:py-36 ${si % 2 === 0 ? "bg-neutral-50" : "bg-white"}`}>
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div
                className="text-xs font-medium tracking-[0.2em] uppercase mb-4"
                style={{ color: primary }}
              >
                {t.sections.servicesKicker}
              </div>
              <h2
                className="font-serif text-4xl md:text-5xl leading-tight"
                style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}
              >
                {sec.name}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(sec.items || []).map((s: any, i: number) => {
                const featured = i === 0 && sec.items.length >= 3
                // UNE CARTE QUI PORTE UN LIEN MÈNE À SA PAGE (CPA, 2026-11-11 :
                // « ils sont cliquables mais mènent nulle part »). `lien` = chemin
                // d'une page du site (« qui-sommes-nous/missions ») ou ancre de
                // l'accueil (« #partenaires »). Sans lien : la fiche d'avant.
                const lien = typeof s.lien === 'string' && /^#?[a-z0-9][a-z0-9\-/]*$/i.test(s.lien)
                  ? `${lienAccueil(site, host)}/${s.lien}`
                  : null
                // M2-207 — LA CARTE DE COLLECTION EST CLIQUABLE (Youssouf :
                // « nos collections doivent être cliquables, la fiche
                // s'affiche, avec les boutons WhatsApp et appel »). Elle
                // ouvre la MÊME modale que la boutique — sans bouton panier
                // (pas de priceNumber) : la fiche informe, et sur un marché
                // sans carte elle fait parler au vendeur. Le numéro suit le
                // même repli que partout : social_links.whatsapp, sinon
                // contact.phone.
                const carte = (
                  <TiltCard
                    className={`group relative p-8 md:p-10 rounded-3xl transition-all duration-500 ${
                      featured
                        ? `${encre ? 'bg-[color:var(--encre)]' : 'bg-neutral-900'} text-white shadow-2xl lg:row-span-2`
                        : 'bg-white border border-neutral-200/70 hover:border-transparent hover:shadow-xl'
                    }`}
                  >
                    {s.image && (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-6">
                        <img src={s.image} alt={s.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <h3
                        className="font-serif text-2xl md:text-3xl leading-tight min-w-0"
                        style={{ fontFamily: 'var(--font-fraunces), serif', ...(featured ? undefined : enEncre) }}
                      >
                        {s.title}
                      </h3>
                      {s.price && (
                        <span
                          className={`shrink-0 text-sm font-semibold px-3 py-1 rounded-full ${featured ? 'bg-white/10' : ''}`}
                          style={featured ? { color: '#fff' } : { color: primary, backgroundColor: `color-mix(in srgb, ${primary} 10%, white)` }}
                        >
                          {s.price}
                        </span>
                      )}
                    </div>
                    <p
                      className={`leading-relaxed ${
                        featured ? 'text-white/70' : 'text-neutral-600'
                      }`}
                    >
                      {s.description}
                    </p>
                    {(featured || lien) && (
                      <span style={featured ? undefined : { color: primary }}
                        className="inline-flex items-center gap-2 mt-8 text-sm font-medium group/link"
                      >
                        {t.labels.learnMore}
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </TiltCard>
                )
                if (lien) return (
                  <a key={i} href={lien} className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {carte}
                  </a>
                )
                return (
                  <ClickableProductCard
                    key={i}
                    slug={site.slug}
                    lang={site.lang}
                    primary={primary}
                    product={{
                      name: s.title,
                      description: s.description || '',
                      price: s.price || '',
                      image: s.image,
                      whatsapp: social.whatsapp || contact.phone || null,
                      mobileMoney: Array.isArray((contact as any).mobile_money) ? (contact as any).mobile_money : [],
                      hasProductPage: false,
                    }}
                  >
                  {carte}
                  </ClickableProductCard>
                )
              })}
            </div>
          </div>
        </section>
      ))}

      {/* =================== SHOP =================== */}
      {hasShop && !hidden('Shop') && <EditorialShopSection site={site} primary={primary} />}

      {/* A2 d1 — LA SECTION NE S'AFFICHE JAMAIS VIDE. La garde est ICI, chez
          l'appelant : `hasAvis` vient de la seule route posée en d0/e0, et le
          composant n'a pas d'état vide — en lui en donnant un, on finirait
          par l'afficher. « Une section d'accueil VIDE est pire qu'une section
          absente » (arbitrage du propriétaire, 2026-11-06). */}
      {hasAvis && !hidden('AppelsOffres') && (
        <SectionAppelsOffres site={site} primary={primary} host={host} />
      )}


      {/* =================== GALLERY =================== */}
      {gallery.length > 0 && !hidden('Gallery') && (
        <section id="gallery" className="reveal py-28 md:py-36">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
              <div>
                <div
                  className="text-xs font-medium tracking-[0.2em] uppercase mb-4"
                  style={{ color: primary }}
                >
                  {t.sections.galleryKicker}
                </div>
                <h2
                  className="font-serif text-4xl md:text-5xl leading-tight"
                  style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}
                >
                  {t.sections.galleryTitle}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {gallery.slice(0, 9).map((url, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl bg-neutral-100 group ${
                    i === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                  style={{ aspectRatio: i === 0 ? '1 / 1' : '4 / 5' }}
                >
                  <Image src={url} alt="" fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =================== TESTIMONIALS =================== */}
      {testimonials.length > 0 && !hidden('Reviews') && (
        <section id="testimonials" className="reveal py-28 md:py-36 bg-neutral-950 text-white relative overflow-hidden" style={encre ? { backgroundColor: encre } : undefined}>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: primary }}
          />
          <div className="relative max-w-7xl mx-auto px-6 md:px-10">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <div
                className="text-xs font-medium tracking-[0.2em] uppercase mb-4"
                style={{ color: primary }}
              >
                {t.sections.testimonialsKicker}
              </div>
              <h2
                className="font-serif text-4xl md:text-5xl leading-tight"
                style={{ fontFamily: 'var(--font-fraunces), serif' }}
              >
                {t.sections.testimonialsTitle}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((t, i) => (
                <div
                  key={i}
                  className="relative p-8 md:p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Quote className="w-10 h-10 mb-6 opacity-30" style={{ color: primary }} />
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className="w-4 h-4"
                        fill={k < t.rating ? primary : 'transparent'}
                        style={{ color: primary }}
                      />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed mb-8 text-white/90">&quot;{t.content}&quot;</p>
                  <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-medium text-sm"
                      style={{ backgroundColor: `color-mix(in srgb, ${primary} 30%, transparent)` }}
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{t.name}</div>
                      {t.role && <div className="text-sm text-white/50">{t.role}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CHANTIER 2 -- `!hidden('FAQ')` AJOUTE ICI, et c'est une necessite
          mesuree, pas une occasion. `Navbar:221` propose deja « FAQ » parmi
          les sections masquables ; ce theme ignorait le reglage, si bien que
          le marchand pouvait masquer sa FAQ sans effet. Rendre la FAQ dans
          les trois autres themes AVEC la garde et la laisser sans garde ici
          aurait fige l'incoherence a l'echelle du produit. */}
      {site.faq && site.faq.length > 0 && !hidden('FAQ') && (
        <section id="faq" className="reveal py-28 md:py-36 bg-neutral-50">
          <div className="max-w-3xl mx-auto px-6 md:px-10">
            <div className="text-center mb-16">
              <div className="text-xs font-medium tracking-[0.2em] uppercase mb-4" style={{ color: primary }}>
                {({ fr: 'Questions fréquentes', en: 'FAQ', es: 'Preguntas frecuentes', ar: 'الأسئلة الشائعة' } as Record<string, string>)[site.lang || 'en'] || 'FAQ'}
              </div>
              <h2 className="font-serif text-4xl md:text-5xl leading-tight" style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}>
                {({ fr: 'Vos questions, nos réponses', en: 'Your questions, answered', es: 'Tus preguntas, respondidas', ar: 'أسئلتك، إجاباتنا' } as Record<string, string>)[site.lang || 'en'] || 'Your questions, answered'}
              </h2>
            </div>
            <div className="space-y-4">
              {site.faq.map((item, i) => (
                <details key={i} className="group rounded-2xl bg-white border border-neutral-200 p-6 md:p-8">
                  <summary className="cursor-pointer list-none font-medium text-lg flex justify-between items-center">
                    {item.question}
                    <span className="ml-4 transition-transform group-open:rotate-45" style={{ color: primary }}>+</span>
                  </summary>
                  <p className="mt-4 text-neutral-600 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =================== CUSTOM PAGES =================== */}
      {(site.pages || []).filter((p: any) => p && (p.title || p.content || p.image || (p.productIds?.length ?? 0) > 0)).map((page: any, pi: number) => (
        <section key={`page-${pi}`} id={`page-${pi}`} className={`reveal py-28 md:py-36 ${pi % 2 === 0 ? "bg-neutral-50" : "bg-white"}`}>
          <div className="max-w-4xl mx-auto px-6 md:px-10">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-neutral-900 mb-10" style={enEncre}>{page.title}</h2>
            {page.image && (
              <div className="relative w-full rounded-3xl overflow-hidden mb-10 aspect-[16/9]">
                <Image src={page.image} alt={page.title || ''} fill sizes="(max-width:768px) 100vw, 900px" className="object-cover" />
              </div>
            )}
            {page.content && (
              <div className="text-lg leading-relaxed text-neutral-700 whitespace-pre-line">{page.content}</div>
            )}
            {/* LES PRODUITS DE LA PAGE. « Une page par article » : c'est la
                demande des marchands, et c'est ce qui manquait — une page ne
                pouvait porter qu'un titre et un texte. */}
            <PageProduits slug={site.slug} produits={produitsDeLaPage(products, page.productIds)} primary={site.primary_color || '#FA5D1E'} />
          </div>
        </section>
      ))}

      {/* =================== CONTACT =================== */}
      {/* LOT 15.13 - LES PARTENAIRES, JUSTE AVANT CONTACT.
          Mesure a l'ecran par le proprietaire, capture a l'appui : au bas
          d'une SOUS-PAGE, personne ne les voyait. Sur EPSS la section est
          sur l'accueil, en bas - on la rencontre sans la chercher.
          ELLE NE PARAIT PAS SI ELLE EST VIDE : un titre au-dessus d'une
          bande blanche dit qu'il manque quelque chose. */}
      <SectionPartenaires
        items={partenaires}
        primary={primary}
        encre={encre}
        surtitre={t.labels.partenairesSurtitre}
        titre={t.labels.partenairesTitre}
        phrase={t.labels.partenairesPhrase}
      />

      {!hidden('Contact') && (
      <section id="contact" className="reveal py-28 md:py-36">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div
              className="text-xs font-medium tracking-[0.2em] uppercase mb-4"
              style={{ color: primary }}
            >
              {t.sections.contactKicker}
            </div>
            <h2
              className="font-serif text-4xl md:text-5xl leading-tight mb-4"
              style={{ fontFamily: 'var(--font-fraunces), serif', ...enEncre }}
            >
              {t.sections.contactTitle}
            </h2>
            <p className="text-lg text-neutral-600">
              {t.sections.contactSubtitle}
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-start">
            <div className="bg-white border border-neutral-200/70 rounded-3xl p-8 md:p-10 shadow-sm">
              <ContactForm slug={site.slug} brand={primary} lang={site.lang} />
            </div>

            <div className="space-y-4">
              {contact.phone && (
                <a href={lienTel(contact.phone) ?? undefined} className="flex items-center gap-5 p-6 rounded-2xl bg-neutral-50 hover:bg-white hover:shadow-md border border-transparent hover:border-neutral-200 transition-all">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${primary} 12%, white)` }}
                  >
                    <Phone className="w-5 h-5" style={{ color: primary }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">{t.labels.phone}</div>
                    <div className="font-medium truncate">{contact.phone}</div>
                  </div>
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-5 p-6 rounded-2xl bg-neutral-50 hover:bg-white hover:shadow-md border border-transparent hover:border-neutral-200 transition-all">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${primary} 12%, white)` }}
                  >
                    <Mail className="w-5 h-5" style={{ color: primary }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">{t.labels.email}</div>
                    <div className="font-medium truncate">{contact.email}</div>
                  </div>
                </a>
              )}
              {contact.address && (
                <div className="flex items-start gap-5 p-6 rounded-2xl bg-neutral-50 border border-transparent">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                    style={{ backgroundColor: `color-mix(in srgb, ${primary} 12%, white)` }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: primary }} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">{t.labels.address}</div>
                    <div className="font-medium leading-snug">{contact.address}</div>
                  </div>
                </div>
              )}

              <ContactMap lat={site.geo_lat} lng={site.geo_lng} accent={primary} dark={false} />

              {/* LOT 15.4 — huit réseaux, une seule liste (ReseauxSociaux).
                  Ce bloc recopiait quatre réseaux écrits à la main ; trois
                  autres thèmes faisaient de même. Ajouter X, YouTube,
                  LinkedIn ou Telegram demandait de toucher quatre fichiers,
                  donc d'en oublier un. */}
              <ReseauxSociaux social={social} libelle={t.labels.followUs} className="pt-4" />
            </div>
          </div>
        </div>
      </section>
      )}

      </main>
      {/* =================== FOOTER =================== */}
      <footer className="bg-neutral-950 text-white py-16" style={encre ? { backgroundColor: encre } : undefined} {...(liensLegaux.length > 0 ? { 'data-pied-legal': '' } : {})}>
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-12">
            <div>
              <div className="font-serif text-3xl mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                {site.name}
              </div>
              {site.slogan && <div className="text-white/60 text-sm">{site.slogan}</div>}
            </div>
            <nav className="flex gap-8 text-sm text-white/70">
              {/* LOT 21 — de vraies pages, plus des ancres de l'accueil. */}
              {!hidden('About') && (site.about || site.mission || site.vision) && <a href={lienSection(site, host, 'a-propos')} className="hover:text-white transition-colors">{t.nav.about}</a>}
              {!hidden('Services') && sections.length > 0 && <a href={lienSection(site, host, 'services')} className="hover:text-white transition-colors">{sections[0]?.name || t.nav.services}</a>}
              <a href={lienContact(site, host)} className="hover:text-white transition-colors">{t.nav.contact}</a>
            </nav>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-white/40">
            <div className="flex flex-col gap-3">
              <div>© {new Date().getFullYear()} {site.name}. {t.labels.rightsReserved}</div>
              {/* LOT 17 — les pages légales, à côté du « © ». */}
              {liensLegaux.length > 0 && (
                <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
                  {liensLegaux.map((l) => (
                    <a key={l.href} href={l.href} className="text-white/60 hover:text-white transition-colors">{l.titre}</a>
                  ))}
                </nav>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>{t.labels.poweredBy}</span>
              <a href={WOORRI_SITE_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-white/70 hover:text-white transition-colors">
                Deribfy
              </a>
            </div>
          </div>
        </div>
      </footer>
      {/* LOT 15.6 — un lien, pas un bouton : le navigateur sait
          remonter depuis toujours, et sans script. */}
      <RevenirEnHaut libelle={t.labels.revenirHaut} couleur={primary} />

      {/* Floating WhatsApp */}
      {social.whatsapp && (
        <a
          href={socialUrl('whatsapp', social.whatsapp)!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact us on WhatsApp"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 transition-transform"
        >
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          <WhatsApp className="w-7 h-7 relative" />
        </a>
      )}
    </div>
  )
}
