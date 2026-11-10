// src/app/sites/[slug]/themes/JsonLd.tsx
import type { Site } from './shared'
import { resolveSiteFreshness } from './siteFreshness'
import JsonLdScript from './JsonLdScript'

function resolveSchemaType(rawType?: string): {
  schemaType: string
  isPhysical: boolean
} {
  const t = (rawType ?? '').toLowerCase()

  // ── UN ÉTABLISSEMENT PUBLIC N'EST PAS UN COMMERCE, ET PASSE EN PREMIER.
  //
  // MESURÉ LE 2026-11-06 sur le site de la Centrale Pharmaceutique d'Achats
  // du Tchad : son type est « Institution publique de santé », aucun mot de
  // commerce ne l'attrape, et elle tombait dans le repli `LocalBusiness` —
  // un commerce de proximité, avec `isPhysical: true` et une adresse
  // affirmée. Déclaré à GOOGLE, pas à nous.
  //
  // `GovernmentOrganization` est un sous-type direct d'`Organization`, et
  // schema.org n'en porte aucun de plus précis pour un organisme d'achat
  // public — vérifié, pas supposé.
  //
  // ── POURQUOI CETTE BRANCHE EST SÛRE, et c'est mesuré.
  //
  // Elle ne touche AUCUN des 42 autres sites : un relevé sur les 43 types en
  // base rend UN seul site attrapé — celui de la CPA. La porter ne change
  // donc le verdict de personne d'autre.
  //
  // ── ET ELLE NE CORRIGE PAS LE DÉFAUT DE FOND, qui est noté ailleurs.
  //
  // Cette dérivation entière LIT DES MOTS dans un champ de texte libre, et
  // le premier mot trouvé gagne sans regarder le reste de la phrase : cinq
  // sites portent « en ligne » et sont déclarés commerces physiques. Voir
  // GEN-D023 et GEN-D024 au registre. Le propriétaire a tranché le
  // 2026-11-06 : le seul objectif est de finir le site CPA, le reste est
  // noté et attend.
  if (
    t.includes('institution publique') ||
    t.includes('établissement public') ||
    t.includes('etablissement public') ||
    t.includes('organisme public') ||
    t.includes('service public')
  ) {
    return { schemaType: 'GovernmentOrganization', isPhysical: false }
  }

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

  // ── UNE POSITION SUR LA CARTE EST UNE AFFIRMATION DE LIEU PHYSIQUE.
  //
  // DÉFAUT MESURÉ LE 2026-11-06, APRÈS DÉPLOIEMENT : `isPhysical: false`
  // retirait bien l'adresse, et laissait passer `geo` ET `priceRange`. Le
  // site de la CPA, déclaré `GovernmentOrganization`, annonçait donc encore
  // une position sur la carte et une fourchette de prix.
  //
  // Trouvé en REMESURANT l'écran après le déploiement, pas en relisant le
  // code : la correction précédente paraissait complète, et elle ne l'était
  // qu'au tiers.
  //
  // Rayon mesuré : 3 sites sur 43 sont en `isPhysical: false` — un
  // établissement public, un restaurant de livraison, une plateforme SaaS.
  // Le retrait est juste pour les trois.
  if (isPhysical && typeof site.geo_lat === 'number' && typeof site.geo_lng === 'number') {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: site.geo_lat,
      longitude: site.geo_lng,
    }
  }

  // ── LA ZONE DESSERVIE RESTE, ET CE N'EST PAS UN OUBLI.
  //
  // `areaServed` est valide sur une `Organization` : un organisme peut
  // desservir un territoire sans avoir de local ouvert au public. C'est
  // précisément le cas de la CPA, qui approvisionne tout le Tchad.
  if (site.area_served) data.areaServed = site.area_served

  // ── LE NIVEAU DE PRIX : RETIRÉ POUR UN ORGANISME PUBLIC, ET SEULEMENT LÀ.
  //
  // `priceRange` est une propriété de `LocalBusiness` ; un organisme public
  // n'a pas de fourchette de prix, et l'annoncer est faux.
  //
  // ── MAIS MA PREMIÈRE GARDE SORTAIT DU CHEMIN CPA, et un cliquet l'a dit.
  //
  // J'avais écrit `isPhysical && site.price_range`. Quatre cas de
  // `priceRange JsonLd` ont rougi : leur fixture est le site YIA,
  // `type: 'import export'`, donc `isPhysical: false` — et le CHANTIER 5
  // avait décidé exprès que ce négoce émette sa fourchette. Ma garde
  // changeait le JSON-LD d'un AUTRE site pour réparer celui de la CPA.
  //
  // La règle du propriétaire du 2026-11-06 : le seul objectif est de finir
  // le site CPA ; ce qui n'est pas sur ce chemin se note et attend. La
  // question de fond — `priceRange` sur une `Organization` non physique
  // est-il valide ? — part donc au registre, et la garde se limite au cas
  // qui nous occupe.
  if (schemaType !== 'GovernmentOrganization' && site.price_range) {
    data.priceRange = site.price_range
  }

  // Fraicheur du contenu -- DEBT-034 : la derniere MODIFICATION, plus la
  // creation. Repli sur `created_at` tant que la migration n'est pas passee.
  //
  // LOT 21 — mesuré le 2026-11-10 par le validateur de schémas de Google :
  // « dateModified n'est pas reconnu pour un objet de type
  // GovernmentOrganization » (ni pour une Organization ou un LocalBusiness :
  // c'est une propriété de PAGE). La date part donc sur un nœud `WebPage`,
  // relié à l'organisation dans le même `@graph`.
  const fraicheur = resolveSiteFreshness(site)
  const organisation: Record<string, unknown> = { ...data }
  delete organisation['@context']
  const pageAccueil = {
    '@type': 'WebPage',
    '@id': `${url}#accueil`,
    url,
    name: site.name,
    about: { '@id': organisation['@id'] ?? url },
    ...(fraicheur ? { dateModified: fraicheur } : {}),
  }
  const graphe = { '@context': 'https://schema.org', '@graph': [organisation, pageAccueil] }

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
      <JsonLdScript data={graphe} />
      {faqData && <JsonLdScript data={faqData} />}
    </>
  )
}
