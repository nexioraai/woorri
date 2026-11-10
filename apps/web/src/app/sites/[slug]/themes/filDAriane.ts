// LOT 18 — le fil d'Ariane DÉCLARÉ aux moteurs (BreadcrumbList), pour les
// écrans du moteur qui n'en avaient pas : catalogue, appels d'offres, plan
// du site. Les pages déclarées ont le leur depuis le lot 1 ; c'est le même
// schéma — accueil d'abord, la page courante en dernier.
export function filDAriane(nomDuSite: string, base: string, etapes: { nom: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: nomDuSite, item: base },
      ...etapes.map((e, i) => ({ '@type': 'ListItem', position: i + 2, name: e.nom, item: e.url })),
    ],
  }
}

/** Une page web du site, avec son fil d'Ariane. */
export function pageWeb(nomDuSite: string, base: string, lang: string | null | undefined, titre: string, url: string, etapes: { nom: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: titre,
    url,
    inLanguage: lang || undefined,
    isPartOf: { '@type': 'WebSite', name: nomDuSite, url: base },
    breadcrumb: filDAriane(nomDuSite, base, etapes),
  }
}
