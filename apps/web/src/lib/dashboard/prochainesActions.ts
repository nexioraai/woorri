// ============================================================================
// LES « PROCHAINES ACTIONS » D'UN PROJET (tableau de bord, 2026-11-12).
//
// Maquette validée par le propriétaire : l'accueil du projet répond d'abord à
// « quoi faire maintenant ? ». Chaque action est CALCULÉE à partir des données
// réelles du site — jamais cochée à la main, jamais inventée : une action
// n'apparaît que si elle a un sens pour CE site (un appel d'offres seulement
// pour un site qui passe des marchés, des photos de fiche seulement s'il y a
// des fiches).
//
// Fonction PURE : aucune lecture ici. Ce qu'elle ne sait pas (une lecture
// ratée) arrive en `null` et l'action correspondante est OMISE — une action
// « faite » ou « à faire » sur une donnée non lue serait une affirmation non
// mesurée.
// ============================================================================

export type CleAction = 'enLigne' | 'contacts' | 'logo' | 'photos' | 'avis' | 'domaine' | 'visibilite'

export type ActionProjet = {
  cle: CleAction
  faite: boolean
  /** Paramètre affiché dans le libellé (nombre de fiches, première lacune IA…). */
  n?: number
  detail?: string
  /** Destination du bouton ; `publier` = le geste de mise en ligne existant. */
  vers: string | 'publier'
}

export type DonneesProjet = {
  slug: string
  published: boolean
  logo_url?: string | null
  custom_domain?: string | null
  contact?: { email?: string | null; phone?: string | null } | null
  publishes_tenders?: boolean | null
  /** Lacunes de visibilité IA (computeAiScore().missing). */
  lacunesIA: string[]
  /** Nombre de fiches (citation à champ photo) SANS photo ; null = non lu. */
  fichesSansPhoto: number | null
  /** Nombre total de fiches ; null = non lu. */
  fiches: number | null
  /** Au moins un avis d'appel d'offres publié ; null = non lu. */
  avisPublie: boolean | null
}

const PHOTO = /^https?:\/\/[^/\s]+\.[^/\s]+|^\/(?!\/)\S/

/** Compte les fiches (1er bloc = citation avec un champ `photo`) et celles sans photo. */
export function compterFiches(pages: { blocs?: unknown }[]): { fiches: number; sansPhoto: number } {
  let fiches = 0, sansPhoto = 0
  for (const p of pages) {
    const b = Array.isArray(p.blocs) ? (p.blocs[0] as { type?: string; photo?: unknown } | undefined) : undefined
    if (!b || b.type !== 'citation' || typeof b.photo !== 'string') continue
    fiches++
    if (!PHOTO.test(b.photo)) sansPhoto++
  }
  return { fiches, sansPhoto }
}

export function prochainesActions(d: DonneesProjet): ActionProjet[] {
  // Logo et coordonnées : la page des réglages ; les photos : l'éditeur visuel.
  const edit = `/edit/${d.slug}`
  const visuel = `/modifier/${d.slug}`
  const a: ActionProjet[] = []
  a.push({ cle: 'enLigne', faite: d.published, vers: 'publier' })
  a.push({ cle: 'contacts', faite: !!(d.contact?.email && d.contact?.phone), vers: edit })
  a.push({ cle: 'logo', faite: !!d.logo_url, vers: edit })
  if (d.fiches !== null && d.fichesSansPhoto !== null && d.fiches > 0) {
    a.push({ cle: 'photos', faite: d.fichesSansPhoto === 0, n: d.fichesSansPhoto, vers: visuel })
  }
  if (d.publishes_tenders === true && d.avisPublie !== null) {
    a.push({ cle: 'avis', faite: d.avisPublie, vers: `/offres/${d.slug}` })
  }
  a.push({ cle: 'domaine', faite: !!d.custom_domain, vers: `/domaine/${d.slug}` })
  a.push({ cle: 'visibilite', faite: d.lacunesIA.length === 0, n: d.lacunesIA.length, detail: d.lacunesIA[0], vers: '/visibilite-ia' })
  // Les actions À FAIRE d'abord, dans l'ordre ci-dessus ; les faites ensuite.
  return [...a.filter((x) => !x.faite), ...a.filter((x) => x.faite)]
}
