// LES PAGES D'UNE INSTITUTION, DÈS LA GÉNÉRATION (lot 4, 2026-11-26).
//
// La CPA a reçu ses pages À LA MAIN (31 scripts). Une institution générée
// reçoit maintenant, d'elle-même, des pages ET sous-pages avec menu
// déroulant, écrites dans `site_pages` :
//   Qui sommes-nous › Mot de la direction · Organigramme · Missions
//   <page propre à la famille> (Nos services, Démarches, Programmes…)
//   Actualités › Communiqués · Agenda   (allume le module Actualités)
//   Documents
// Contact reste le lien du thème, toujours le dernier.
//
// RIEN D'INVENTÉ. Les textes viennent de la génération (« à propos »,
// missions, services — sous la consigne « ne rien inventer » du lot 3).
// Ce qui ne peut pas être su — le mot et le nom du responsable,
// l'organigramme, les documents officiels, les horaires — est un encadré
// « À compléter » qui dit QUOI ajouter et OÙ. Jamais une adresse, un
// téléphone, un nom ni un chiffre.
//
// PUR : aucune lecture, aucune écriture. Le semeur (semerInstitution.ts) écrit.
import type { FamilleInstitution } from './familleInstitution'
import type { Institution } from './institution'

export type BlocGenere = Record<string, unknown> & { type: string }
export type PageGeneree = {
  chemin: string
  parent: string | null
  titre: string
  chapeau: string | null
  ordre: number
  menu: boolean
  publie: boolean
  blocs: BlocGenere[]
}

/** La page propre à chaque famille, et le titre du responsable. */
const PROPRE: Readonly<Record<FamilleInstitution, { chemin: string; titre: string; chapeau: string; responsable: string; aCompleter: string }>> = {
  ministere: { chemin: 'nos-services', titre: 'Nos services', chapeau: 'Les services rendus aux usagers et aux partenaires.', responsable: 'du ministre', aCompleter: 'les démarches, les guichets et leurs horaires' },
  agence_publique: { chemin: 'nos-services', titre: 'Nos services', chapeau: 'Les services rendus aux usagers et aux partenaires.', responsable: 'de la direction générale', aCompleter: 'les démarches, les guichets et leurs horaires' },
  mairie: { chemin: 'demarches', titre: 'Démarches', chapeau: 'Les démarches administratives auprès de la commune.', responsable: 'du maire', aCompleter: 'les pièces à fournir, les guichets et leurs horaires' },
  ong: { chemin: 'nos-programmes', titre: 'Nos programmes', chapeau: 'Les programmes menés sur le terrain.', responsable: 'de la présidence', aCompleter: 'les zones d’intervention, les partenaires et les résultats publiés' },
  ecole: { chemin: 'formations', titre: 'Formations', chapeau: 'Les formations proposées et les conditions d’admission.', responsable: 'de la direction', aCompleter: 'le calendrier, les conditions d’admission et les frais officiels' },
  hopital: { chemin: 'soins-et-services', titre: 'Soins et services', chapeau: 'Les services de soins et l’accueil des patients.', responsable: 'de la direction', aCompleter: 'les services ouverts, les horaires de consultation et de visite' },
}

/**
 * Les recherches de photos libres de droits, par page (lot 4b) : des lieux et
 * des gens d'AFRIQUE (Sahel, Tchad, pays voisins), jamais un décor occidental ni
 * un bureau générique. Plusieurs recherches par place : la première qui donne
 * une photo au contexte africain vérifié (`photoAfricaine`) l'emporte.
 */
export const RECHERCHE_PHOTOS: Readonly<Record<FamilleInstitution, { presentation: readonly string[]; activite: readonly string[] }>> = {
  ministere: { presentation: ['african government officials meeting', 'nigeria government building', 'africa parliament building'], activite: ['african community health workers', 'african public service workers', 'africa village community meeting'] },
  agence_publique: { presentation: ['african workers warehouse logistics', 'africa public service workers', 'nigeria workers team'], activite: ['african community health workers', 'africa village community meeting', 'african workers market'] },
  mairie: { presentation: ['african city street market', 'africa town square people', 'lagos street people'], activite: ['africa village community meeting', 'african women market', 'african community volunteers'] },
  ong: { presentation: ['african village women community', 'africa women group village', 'sahel village people'], activite: ['african women training workshop', 'african community volunteers', 'africa village water well'] },
  ecole: { presentation: ['african school children classroom', 'african students classroom', 'africa school pupils uniform'], activite: ['african students studying', 'africa children learning outdoor school', 'african teacher classroom'] },
  hopital: { presentation: ['african nurse caring patient clinic', 'nigeria clinic nurse patient', 'africa hospital nurse'], activite: ['african doctor patient consultation', 'africa health worker clinic', 'african community health workers'] },
}

/** Un encadré « À compléter » : quoi ajouter, et où. */
export function aCompleter(quoi: string): BlocGenere {
  return { type: 'encadre', ton: 'info', titre: 'À compléter', texte: `${quoi} À ajouter depuis l’éditeur du site : rien n’est écrit ici à votre place.` }
}

export type MissionGeneree = { titre: string; description: string }

const nettoyer = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().replace(/\s+/gu, ' ').slice(0, max) : '')

/**
 * Les éléments de la génération, nettoyés : jamais un prix, jamais une entrée
 * vide. `rang` (lot 4b) : une SECTION précise — la 1re porte les missions, les
 * suivantes les services ; deux pages ne répètent jamais les mêmes lignes.
 */
export function missionsDe(sections: unknown, rang: 'missions' | 'services' | 'tout' = 'tout'): MissionGeneree[] {
  if (!Array.isArray(sections)) return []
  const choisies = rang === 'missions' ? sections.slice(0, 1) : rang === 'services' ? sections.slice(1) : sections
  return choisies
    .flatMap((s) => (Array.isArray((s as { items?: unknown })?.items) ? (s as { items: unknown[] }).items : []))
    .map((it) => ({ titre: nettoyer((it as { title?: unknown }).title, 120), description: nettoyer((it as { description?: unknown }).description, 400) }))
    .filter((m) => m.titre !== '')
    .slice(0, 8)
}

export function squeletteInstitution(o: {
  famille: FamilleInstitution
  inst: Institution
  about: string | null | undefined
  mission: string | null | undefined
  missions: MissionGeneree[]
  /** Lot 4b : les services (sections suivantes) — JAMAIS les mêmes lignes que les missions. */
  services?: MissionGeneree[]
  photos: { presentation: string | null; activite: string | null }
  /** Lot 4b : les phrases du bandeau défilant et les libellés des chiffres clés (cases vides). */
  bandeau?: string[]
  chiffres?: readonly string[]
}): PageGeneree[] {
  const p = PROPRE[o.famille]
  const image = (url: string | null, alt: string): BlocGenere[] => (url ? [{ type: 'image', url, alt }] : [])
  const about = nettoyer(o.about, 1200)
  const mission = nettoyer(o.mission, 600)
  const enListe = (xs: MissionGeneree[]): BlocGenere => ({ type: 'liste', items: xs.map((m) => (m.description ? `${m.titre} — ${m.description}` : m.titre)) })
  const liste: BlocGenere[] = o.missions.length > 0 ? [enListe(o.missions)] : [aCompleter('La liste des missions.')]
  const services = (o.services ?? []).filter((x) => !o.missions.some((m) => m.titre === x.titre))
  return [
    { chemin: 'qui-sommes-nous', parent: null, titre: 'Qui sommes-nous', chapeau: about || null, ordre: 10, menu: true, publie: true,
      blocs: [...image(o.photos.presentation, o.inst.nu), aCompleter('L’histoire, le statut et les textes fondateurs.')] },
    { chemin: 'qui-sommes-nous/mot-du-responsable', parent: 'qui-sommes-nous', titre: `Le mot ${p.responsable}`, chapeau: null, ordre: 1, menu: true, publie: true,
      blocs: [aCompleter(`Le texte, le nom et la photo ${p.responsable}.`)] },
    { chemin: 'qui-sommes-nous/organigramme', parent: 'qui-sommes-nous', titre: 'Organigramme', chapeau: null, ordre: 2, menu: true, publie: true,
      blocs: [aCompleter('L’organigramme : les directions, les services et leurs responsables.')] },
    { chemin: 'qui-sommes-nous/missions', parent: 'qui-sommes-nous', titre: 'Missions', chapeau: mission || null, ordre: 3, menu: true, publie: true,
      blocs: [...liste] },
    { chemin: p.chemin, parent: null, titre: p.titre, chapeau: p.chapeau, ordre: 20, menu: true, publie: true,
      blocs: [...image(o.photos.activite, p.titre), ...(services.length > 0 ? [enListe(services)] : []), aCompleter(`Le détail : ${p.aCompleter}.`)] },
    { chemin: 'actualites', parent: null, titre: 'Actualités', chapeau: `Les communiqués, l’agenda et les articles ${o.inst.de}.`, ordre: 30, menu: true, publie: true, blocs: [] },
    { chemin: 'actualites/communiques', parent: 'actualites', titre: 'Communiqués', chapeau: null, ordre: 1, menu: true, publie: true, blocs: [] },
    { chemin: 'actualites/evenements', parent: 'actualites', titre: 'Agenda', chapeau: null, ordre: 2, menu: true, publie: true, blocs: [] },
    { chemin: 'documents', parent: null, titre: 'Documents', chapeau: `Les textes et documents publiés par ${o.inst.la}.`, ordre: 40, menu: true, publie: true,
      blocs: [aCompleter('Les textes officiels, rapports et formulaires à télécharger (bloc « Documents »).')] },
    // LOT 4b — DEUX RÉGLAGES DE L'ACCUEIL, en pages NON publiées (modifiables dans l'éditeur) :
    // le bandeau défilant (phrases de la mission) et les chiffres clés (cases « À compléter »,
    // jamais montrées aux visiteurs tant qu'elles ne portent pas un vrai chiffre).
    ...((o.bandeau ?? []).length > 0 ? [{ chemin: 'accueil-bandeau', parent: null, titre: 'Accueil — bandeau défilant', chapeau: 'Les phrases qui défilent sous l’en-tête de l’accueil.', ordre: 0, menu: false, publie: false,
      blocs: [{ type: 'liste', items: o.bandeau ?? [] }] }] : []),
    ...((o.chiffres ?? []).length > 0 ? [{ chemin: 'accueil-chiffres', parent: null, titre: 'Accueil — chiffres clés', chapeau: 'Remplacez « À compléter » par vos chiffres réels : le bloc n’apparaît aux visiteurs qu’une fois tous remplis.', ordre: 0, menu: false, publie: false,
      blocs: [{ type: 'chiffres', items: (o.chiffres ?? []).map((libelle) => ({ valeur: 'À compléter', libelle })) }] }] : []),
  ]
}

/** Le logo provisoire : le sigle, en blanc, sur un carré arrondi à la couleur du site. */
export function svgLogoProvisoire(sigle: string, couleur: string | null | undefined): string {
  const fond = /^#[0-9a-f]{6}$/iu.test(couleur ?? '') ? (couleur as string) : '#1e4d8c'
  const s = sigle.replace(/[^A-Z0-9À-Ý]/gu, '').slice(0, 5) || 'REF'
  const taille = s.length <= 2 ? 150 : s.length === 3 ? 120 : s.length === 4 ? 92 : 74
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" rx="64" fill="${fond}"/><text x="160" y="160" dominant-baseline="central" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${taille}" letter-spacing="2" fill="#ffffff">${s}</text></svg>`
}
