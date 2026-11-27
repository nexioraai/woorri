// LES PAGES D'UNE INSTITUTION, DÈS LA GÉNÉRATION (lot 4, 2026-11-26 ; lot 4c).
//
// La CPA a reçu ses pages À LA MAIN (31 scripts). Une institution générée
// reçoit maintenant, d'elle-même, des pages ET sous-pages avec menu
// déroulant, écrites dans `site_pages`. Menu (lot 4c) :
//   Accueil · <L'institution> · Projets · Actualités · Documents · Contact
//   <L'institution> › Le mot · Biographie · Missions · Organigramme
//                     · <page propre à la famille> · Organismes sous tutelle
//   Projets        › une sous-page par programme (un MODÈLE non publié)
//   Actualités     › Communiqués · Agenda   (allume le module Actualités)
//   + Mentions légales et Politique de confidentialité (hors menu, au pied).
// « Accueil » et « Contact » sont des liens du thème.
//
// RIEN D'INVENTÉ. Les textes viennent de la génération (« à propos »,
// missions, services — sous la consigne « ne rien inventer » du lot 3).
// Ce qui ne peut pas être su — le mot, le nom et la BIOGRAPHIE du
// responsable, l'organigramme, les organismes, les programmes, les documents
// officiels — est un encadré « À compléter » qui dit QUOI ajouter et OÙ.
// Lot 4c : ces encadrés ne sont montrés qu'au PROPRIÉTAIRE
// (`institutionVisiteur.ts`) ; un visiteur ne voit que du réel.
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

/** La page propre à chaque famille, le responsable, et la rubrique de l'institution (lot 4c). */
const PROPRE: Readonly<Record<FamilleInstitution, { chemin: string; titre: string; chapeau: string; responsable: string; tete: string; aCompleter: string; rubrique: { chemin: string; titre: string }; tutelle: boolean }>> = {
  ministere: { chemin: 'nos-services', titre: 'Nos services', chapeau: 'Les services rendus aux usagers et aux partenaires.', responsable: 'du ministre', tete: 'Le ministre', aCompleter: 'les démarches, les guichets et leurs horaires', rubrique: { chemin: 'le-ministere', titre: 'Le Ministère' }, tutelle: true },
  agence_publique: { chemin: 'nos-services', titre: 'Nos services', chapeau: 'Les services rendus aux usagers et aux partenaires.', responsable: 'de la direction générale', tete: 'La direction générale', aCompleter: 'les démarches, les guichets et leurs horaires', rubrique: { chemin: 'l-agence', titre: 'L’Agence' }, tutelle: true },
  mairie: { chemin: 'demarches', titre: 'Démarches', chapeau: 'Les démarches administratives auprès de la commune.', responsable: 'du maire', tete: 'Le maire', aCompleter: 'les pièces à fournir, les guichets et leurs horaires', rubrique: { chemin: 'la-mairie', titre: 'La Mairie' }, tutelle: false },
  ong: { chemin: 'zones-d-intervention', titre: 'Zones d’intervention', chapeau: 'Les régions et les communautés où nous agissons.', responsable: 'de la présidence', tete: 'La présidence', aCompleter: 'les zones d’intervention, les partenaires et les résultats publiés', rubrique: { chemin: 'l-organisation', titre: 'L’Organisation' }, tutelle: false },
  ecole: { chemin: 'formations', titre: 'Formations', chapeau: 'Les formations proposées et les conditions d’admission.', responsable: 'de la direction', tete: 'La direction', aCompleter: 'le calendrier, les conditions d’admission et les frais officiels', rubrique: { chemin: 'l-etablissement', titre: 'L’Établissement' }, tutelle: false },
  hopital: { chemin: 'soins-et-services', titre: 'Soins et services', chapeau: 'Les services de soins et l’accueil des patients.', responsable: 'de la direction', tete: 'La direction', aCompleter: 'les services ouverts, les horaires de consultation et de visite', rubrique: { chemin: 'l-hopital', titre: 'L’Hôpital' }, tutelle: false },
}

/** Le chemin de la rubrique « Projets » : la section « Programmes en cours » de l'accueil lit ses sous-pages. */
export const CHEMIN_PROJETS = 'projets'

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

/**
 * LES DEUX PAGES LÉGALES (lot 4c), écrites depuis ce que le site FAIT
 * réellement — formulaire de contact, choix des cookies gardé dans le
 * navigateur, mesure d'audience seulement après accord, bulle d'assistant si
 * elle est allumée. Aucune loi citée : rien n'a été vérifié pour ce pays.
 * Ce qui ne peut pas être su (nom officiel, adresse, directeur de la
 * publication, contact) reste « À compléter » — jamais montré aux visiteurs.
 */
export function pagesLegalesInstitution(o: { assistant: boolean }): PageGeneree[] {
  const note: BlocGenere = { type: 'encadre', ton: 'attention', titre: 'Visible par vous seul', texte: 'Modèle à faire valider par votre service juridique avant toute publication officielle.' }
  return [
    { chemin: 'mentions-legales', parent: null, titre: 'Mentions légales', chapeau: null, ordre: 90, menu: false, publie: true,
      blocs: [
        note,
        { type: 'tableau', titre: 'Éditeur du site', entetes: ['Rubrique', 'Valeur'], lignes: [['Nom officiel', 'À compléter'], ['Adresse', 'À compléter'], ['Directeur de la publication', 'À compléter'], ['Contact', 'À compléter']] },
        { type: 'tableau', titre: 'Hébergement', entetes: ['Rubrique', 'Valeur'], lignes: [['Plateforme', 'Deribfy — www.deribfy.com'], ['Infrastructure', 'Vercel Inc. (pages) et Supabase Inc. (données)']] },
      ] },
    { chemin: 'confidentialite', parent: null, titre: 'Politique de confidentialité', chapeau: 'Ce que ce site fait de vos informations.', ordre: 91, menu: false, publie: true,
      blocs: [
        note,
        { type: 'titre', texte: 'Le formulaire de contact', niveau: 2 },
        { type: 'texte', texte: 'Quand vous écrivez par la page Contact, votre nom, votre adresse électronique et votre message sont enregistrés et transmis aux personnes qui gèrent ce site, pour vous répondre. Ils ne servent à rien d’autre.' },
        { type: 'titre', texte: 'Les cookies et la mesure d’audience', niveau: 2 },
        { type: 'texte', texte: 'À votre première visite, le site vous demande votre accord. Votre choix est gardé dans votre navigateur. La mesure d’audience (nombre de visites, vitesse des pages) n’est activée que si vous l’acceptez ; si vous refusez, elle ne se charge pas.' },
        ...(o.assistant ? [
          { type: 'titre', texte: 'L’assistant du site', niveau: 2 },
          { type: 'texte', texte: 'Les questions posées à l’assistant du site sont envoyées à un service d’intelligence artificielle pour y répondre. N’y écrivez pas d’informations personnelles.' },
        ] as BlocGenere[] : []),
        { type: 'titre', texte: 'Vos questions', niveau: 2 },
        { type: 'texte', texte: 'Pour savoir quelles informations vous concernant sont conservées, ou demander qu’elles soient effacées, écrivez-nous par la page Contact.' },
      ] },
  ]
}

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
  /** Lot 4c : la bulle d'assistant du site est-elle allumée (la politique de confidentialité le dit) ? */
  assistant?: boolean
}): PageGeneree[] {
  const p = PROPRE[o.famille]
  const image = (url: string | null, alt: string): BlocGenere[] => (url ? [{ type: 'image', url, alt }] : [])
  const about = nettoyer(o.about, 1200)
  const mission = nettoyer(o.mission, 600)
  const enListe = (xs: MissionGeneree[]): BlocGenere => ({ type: 'liste', items: xs.map((m) => (m.description ? `${m.titre} — ${m.description}` : m.titre)) })
  const liste: BlocGenere[] = o.missions.length > 0 ? [enListe(o.missions)] : [aCompleter('La liste des missions.')]
  const services = (o.services ?? []).filter((x) => !o.missions.some((m) => m.titre === x.titre))
  const r = p.rubrique.chemin
  const sous = (c: string) => `${r}/${c}`
  return [
    { chemin: r, parent: null, titre: p.rubrique.titre, chapeau: about || null, ordre: 10, menu: true, publie: true,
      blocs: [...image(o.photos.presentation, o.inst.nu), aCompleter('L’histoire, le statut et les textes fondateurs.')] },
    { chemin: sous('mot-du-responsable'), parent: r, titre: `Le mot ${p.responsable}`, chapeau: null, ordre: 1, menu: true, publie: true,
      blocs: [aCompleter(`Le texte, le nom et la photo ${p.responsable}.`)] },
    // LA BIOGRAPHIE N'EST JAMAIS GÉNÉRÉE : une vie ne s'invente pas.
    { chemin: sous('biographie'), parent: r, titre: `Biographie ${p.responsable}`, chapeau: null, ordre: 2, menu: true, publie: true,
      blocs: [aCompleter(`La biographie ${p.responsable} : son parcours, ses fonctions, sa photo officielle.`)] },
    { chemin: sous('missions'), parent: r, titre: 'Missions', chapeau: mission || null, ordre: 3, menu: true, publie: true,
      blocs: [...liste] },
    // L'ORGANIGRAMME : la seule boîte certaine (le responsable) ; le reste est à
    // ajouter dans l'éditeur, ligne par ligne (fonction, nom, supérieur).
    { chemin: sous('organigramme'), parent: r, titre: 'Organigramme', chapeau: null, ordre: 4, menu: true, publie: true,
      blocs: [{ type: 'organigramme', titre: 'Organigramme', items: [{ cle: 'tete', fonction: p.tete }] },
        aCompleter('Les directions et services : dans l’éditeur, ajoutez une ligne par poste (fonction, nom, et le poste dont il dépend dans « parent »).')] },
    { chemin: sous(p.chemin), parent: r, titre: p.titre, chapeau: p.chapeau, ordre: 5, menu: true, publie: true,
      blocs: [...(services.length > 0 ? [enListe(services)] : []), aCompleter(`Le détail : ${p.aCompleter}.`)] },
    ...(p.tutelle ? [{ chemin: sous('organismes-sous-tutelle'), parent: r, titre: 'Organismes sous tutelle', chapeau: null, ordre: 6, menu: true, publie: true,
      blocs: [aCompleter('Les organismes placés sous tutelle : une sous-page par organisme (son nom, sa mission, son site), qui apparaîtra ici en carte.')] }] : []),
    { chemin: CHEMIN_PROJETS, parent: null, titre: 'Projets', chapeau: `Les projets et programmes ${o.inst.de}.`, ordre: 20, menu: true, publie: true,
      blocs: [...image(o.photos.activite, 'Projets'), aCompleter('Les programmes en cours : une sous-page par programme. Le modèle « Programme — modèle » (non publié) montre les cases à remplir.')] },
    // UN MODÈLE, JAMAIS PUBLIÉ : il montre au propriétaire les cases d'une carte
    // de programme. Aucun programme n'est inventé.
    { chemin: `${CHEMIN_PROJETS}/modele-de-programme`, parent: CHEMIN_PROJETS, titre: 'Programme — modèle', chapeau: 'À compléter : la description du programme en deux phrases.', ordre: 99, menu: false, publie: false,
      blocs: [{ type: 'tableau', titre: 'Fiche du programme', entetes: ['Rubrique', 'Valeur'], lignes: [['Statut', 'À compléter'], ['Date', 'À compléter'], ['Bailleur', 'À compléter']] },
        aCompleter('Dupliquez ce modèle pour chaque programme : une photo (bloc Image), le statut, la date et le bailleur. Publiez-le : il apparaît sur l’accueil dans « Programmes en cours ».')] },
    { chemin: 'actualites', parent: null, titre: 'Actualités', chapeau: `Les communiqués, l’agenda et les articles ${o.inst.de}.`, ordre: 30, menu: true, publie: true, blocs: [] },
    { chemin: 'actualites/communiques', parent: 'actualites', titre: 'Communiqués', chapeau: null, ordre: 1, menu: true, publie: true, blocs: [] },
    { chemin: 'actualites/evenements', parent: 'actualites', titre: 'Agenda', chapeau: null, ordre: 2, menu: true, publie: true, blocs: [] },
    { chemin: 'documents', parent: null, titre: 'Documents', chapeau: `Les textes et documents publiés par ${o.inst.la}.`, ordre: 40, menu: true, publie: true,
      blocs: [aCompleter('Les textes officiels, rapports et formulaires à télécharger (bloc « Documents »).')] },
    ...pagesLegalesInstitution({ assistant: o.assistant === true }),
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
