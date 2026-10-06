// src/app/sites/[slug]/themes/JsonLd.tsx
import type { Site } from './shared'
import { resolveSiteFreshness } from './siteFreshness'
import JsonLdScript from './JsonLdScript'

function resolveSchemaType(rawType?: string): {
  schemaType: string
  isPhysical: boolean
} {
  const t = (rawType ?? '').toLowerCase()

  // Activités en ligne (pas de lieu physique)
  if (
    t.includes('saas') ||
    t.includes('logiciel') ||
    t.includes('e-commerce') ||
    t.includes('ecommerce') ||
    t.includes('import') ||
    t.includes('export') ||
    t.includes('agence') ||
    t.includes('livraison') ||
    t.includes('logistique') ||
    t.includes('flotte') ||
    t.includes('distributeur') ||
    t.includes('agricole')
  ) {
    return { schemaType: 'Organization', isPhysical: false }
  }

  // Commerces physiques (sous-types précis)
  if (t.includes('café') || t.includes('cafe') || t.includes('coffee'))
    return { schemaType: 'CafeOrCoffeeShop', isPhysical: true }
  if (
    t.includes('restaurant') ||
    t.includes('food') ||
    t.includes('burger') ||
    t.includes('dining')
  )
    return { schemaType: 'Restaurant', isPhysical: true }
  if (t.includes('pharmaci'))
    return { schemaType: 'Pharmacy', isPhysical: true }
  if (t.includes('boulangerie') || t.includes('bakery'))
    return { schemaType: 'Bakery', isPhysical: true }
  if (t.includes('station'))
    return { schemaType: 'GasStation', isPhysical: true }
  if (
    t.includes('auto') ||
    t.includes('pièces') ||
    t.includes('pieces') ||
    t.includes('dealership')
  )
    return { schemaType: 'AutoPartsStore', isPhysical: true }
  if (
    t.includes('boutique') ||
    t.includes('magasin') ||
    t.includes('clothing') ||
    t.includes('store') ||
    t.includes('détail') ||
    t.includes('detail') ||
    t.includes('électronique') ||
    t.includes('electronique') ||
    t.includes('متجر')
  )
    return { schemaType: 'Store', isPhysical: true }

  // Repli sûr
  return { schemaType: 'LocalBusiness', isPhysical: true }
}

export default function JsonLd({ site, url }: { site: Site; url: string }) {
  const { schemaType, isPhysical } = resolveSchemaType(site.type)

  const sameAs = site.social_links
    ? Object.values(site.social_links).filter(
        (v): v is string => typeof v === 'string' && v.startsWith('http')
      )
    : []

  const address =
    site.contact?.address ??
    (typeof (site as any).address === 'string'
      ? (site as any).address
      : undefined)

  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: site.name,
    url,
  }

  const description = site.slogan ?? site.hero_subtitle ?? site.about
  if (description) data.description = description
  if (site.hero_image) data.image = site.hero_image

  // ── LE LOGO DE LA MARQUE. IL MANQUAIT, ET C'EST GRAVE.
  //
  // MESURÉ LE 2026-10-06 sur les CINQ boutiques en ligne : `image` était
  // présent sur les cinq, `logo` sur AUCUNE. Or ce sont deux choses que
  // Google ne confond pas — `image` illustre la page, `logo` identifie
  // l'entreprise. Sans `logo`, l'entité n'a pas de marque : elle n'a qu'une
  // photo d'illustration.
  //
  // Et cette photo-là était, pour trois des cinq, UNE IMAGE PEXELS. Donc la
  // seule chose que Google et les aperçus de partage associaient à la marque
  // était une banque d'images. C'est exactement l'impression que le
  // propriétaire décrivait : « hero et logo sont liés ». Ils l'étaient — par
  // l'absence du second.
  //
  // LE REPLI N'EST PAS UN PIS-ALLER. Quand le marchand n'a pas déposé de
  // logo — 24 sites sur 27 au moment où ceci est écrit, parce que le
  // générateur n'en fabrique aucun — on pointe le MONOGRAMME, que
  // `/api/internal/site-icon/` sait déjà rendre à partir du nom et de la
  // couleur de la marque. Vérifié : cette URL répond 200 en PNG sur un
  // domaine propre (chanorfie.com, biyaminchine.com). Mieux vaut un
  // monogramme cohérent que pas de marque du tout.
  data.logo =
    site.logo_url ?? `${url.replace(/\/+$/, '')}/api/internal/site-icon/${site.slug}?t=512&f=png`
  if (site.contact?.phone) data.telephone = site.contact.phone
  if (site.contact?.email) data.email = site.contact.email

  // ── WHATSAPP DÉCLARÉ, PARCE QUE C'EST LE CANAL RÉEL DU MARCHÉ VISÉ.
  //
  // `sameAs` ne pouvait pas le porter : il ne retient que les valeurs
  // commençant par `http`, et le WhatsApp est stocké comme un NUMÉRO
  // (`social_links.whatsapp`, M2-210/211). Il était donc invisible pour les
  // moteurs alors qu'il est, au Tchad, le premier moyen de joindre une
  // boutique — devant le courriel et souvent devant l'appel.
  //
  // `https://wa.me/<chiffres>` est la forme canonique du lien WhatsApp : une
  // URL réelle, que Google sait suivre et rattacher à l'entité.
  const chiffresWhatsapp = String(site.social_links?.whatsapp ?? '').replace(/\D/g, '')
  if (chiffresWhatsapp) {
    data.contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        url: `https://wa.me/${chiffresWhatsapp}`,
        // Déclaré comme téléphone parce que c'en est un : le numéro WhatsApp
        // et le numéro d'appel peuvent différer, et c'est fréquent.
        telephone: `+${chiffresWhatsapp}`,
      },
    ]
  }

  if (sameAs.length > 0) data.sameAs = sameAs

  if (isPhysical && address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: address,
    }
  }

  // Identite stable pour les IA
  data['@id'] = url

  // Coordonnees reelles (Nominatim)
  if (typeof site.geo_lat === 'number' && typeof site.geo_lng === 'number') {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: site.geo_lat,
      longitude: site.geo_lng,
    }
  }

  // Zone desservie
  if (site.area_served) data.areaServed = site.area_served

  // Niveau de prix
  if (site.price_range) data.priceRange = site.price_range

  // Fraicheur du contenu -- DEBT-034 : la derniere MODIFICATION, plus la
  // creation. Repli sur `created_at` tant que la migration n'est pas passee.
  const fraicheur = resolveSiteFreshness(site)
  if (fraicheur) data.dateModified = fraicheur

  const faqData =
    site.faq && site.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: site.faq.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null

  // M1-01 : la serialisation appartient a JsonLdScript, jamais a l'appelant.
  return (
    <>
      <JsonLdScript data={data} />
      {faqData && <JsonLdScript data={faqData} />}
    </>
  )
}
