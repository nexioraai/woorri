/**
 * LE TÉMOIN V3 — une application de réservation bâtie avec les TREIZE
 * archétypes (et les trois pages du compte), sur des données en mémoire.
 * Il sert aux trois preuves de V3 : les captures (3 largeurs × 2 directions ×
 * 2 thèmes), les cinq états, et la traversée du juge d'expérience.
 *
 * Ses textes anglais et arabes sont des MARQUEURS (« [en] … »), sauf ceux des
 * gabarits et du moteur, que Deribfy traduit lui-même. Une vraie traduction
 * témoin est B3, en V4.
 */
import { libellesDuGabarit, expanser, type Remplissage } from '../archetypes'
import { compilerApp } from '../compiler'
import type { Spec } from '../catalogue'
import type { EtatSource, Ligne, Reglages } from '../rendu/donnees'
import type { AppCompilee } from '../rendu/moteur'
import { textesDe } from '../textes'
import type { Contexte } from '../validateur'

export const LANGUES = [
  { code: 'fr', dir: 'ltr' as const, libelle: 'Français' },
  { code: 'en', dir: 'ltr' as const, libelle: 'English' },
  { code: 'ar', dir: 'rtl' as const, libelle: 'العربية' },
]

export const CTX: Contexte = {
  routes: ['accueil', 'bienvenue', 'connexion', 'inscription', 'offres', 'recherche', 'offre', 'paiement', 'confirmation', 'profil', 'tableau', 'gestion', 'nouvelle-offre'],
  roles: ['Client', 'Gérant'],
  tables: [
    { nom: 'offre', colonnes: ['nom', 'ville', 'prix', 'statut'], publique: true },
    { nom: 'reservation', colonnes: ['offre', 'client', 'montant', 'statut'] },
    { nom: 'paiement', colonnes: ['montant', 'moyen'] },
    { nom: 'compte', colonnes: ['nom', 'courriel', 'langue'] },
  ],
  langues: ['fr', 'en', 'ar'],
  devises: ['XAF'],
  moyensPaiement: ['Airtel Money', 'Moov Money'],
  pays: ['Tchad'],
  parcours: ['accueil', 'offres', 'offre', 'paiement', 'confirmation'],
}

export const DONNEES: Record<string, Ligne[]> = {
  offre: [
    { id: 'o1', nom: 'Chambre double — Hôtel du Chari', ville: 'NDjamena', prix: 35000, statut: 'disponible' },
    { id: 'o2', nom: 'Suite familiale — Résidence Moursal', ville: 'NDjamena', prix: 62000, statut: 'disponible' },
    { id: 'o3', nom: 'Chambre simple — Auberge du Logone', ville: 'Moundou', prix: 18000, statut: 'complet' },
    { id: 'o4', nom: 'Bungalow — Lac Fitri', ville: 'Ati', prix: 27000, statut: 'disponible' },
  ],
  reservation: [
    { id: 'r1', offre: 'Chambre double — Hôtel du Chari', client: 'Achta Mahamat', montant: 35000, statut: 'payée' },
    { id: 'r2', offre: 'Bungalow — Lac Fitri', client: 'Idriss Saleh', montant: 27000, statut: 'en attente' },
  ],
  paiement: [],
  compte: [{ id: 'c1', nom: 'Achta Mahamat', courriel: 'achta@exemple.td', langue: 'fr' }],
}
const colonnesOffre = [{ colonne: 'nom', libelle: 'Offre' }, { colonne: 'ville', libelle: 'Ville' }, { colonne: 'prix', libelle: 'Prix par nuit', format: 'montant' }, { colonne: 'statut', libelle: 'Disponibilité', format: 'statut' }]

/** Les remplissages : ce que le modèle écrira à l'étape 4. `acces` est remplacé par « visiteur » pour les captures. */
export const REMPLISSAGES: Remplissage[] = [
  { archetype: 'accueil', route: 'accueil', acces: 'visiteur', slots: { titre: 'Réservez au Tchad', intro: 'Des chambres vérifiées, payées en toute simplicité.', raccourcis: [
    { libelle: 'Voir les offres', route: 'offres' }, { libelle: 'Chercher une ville', route: 'recherche' }, { libelle: 'Premiers pas', route: 'bienvenue' },
    { libelle: 'Se connecter', route: 'connexion' }, { libelle: 'Mon profil', route: 'profil' }, { libelle: 'Tableau de bord', route: 'tableau' }] } },
  { archetype: 'onboarding', route: 'bienvenue', acces: 'visiteur', slots: { titre: 'Bienvenue', fin: 'accueil', libelleFin: 'Commencer', etapes: [
    { composant: 'Encart', enfants: [{ composant: 'Titre', texte: 'Choisissez', niveau: 'encart' }, { composant: 'Phrase', texte: 'Parcourez les chambres disponibles près de vous.' }] },
    { composant: 'Encart', enfants: [{ composant: 'Titre', texte: 'Réservez', niveau: 'encart' }, { composant: 'Phrase', texte: 'Payez par mobile money, sans frais cachés.' }] }] } },
  { archetype: 'auth', route: 'connexion', acces: 'visiteur', slots: { titre: 'Connexion', intro: 'Retrouvez vos réservations.', natureIdentifiant: 'telephone', libelleIdentifiant: 'Numéro de téléphone', libelleSecret: 'Mot de passe', apres: 'tableau', inscription: 'inscription', libelleInscription: 'Créer un compte' } },
  { archetype: 'formulaire', route: 'inscription', acces: 'visiteur', slots: { titre: 'Créer un compte', table: 'compte', apres: 'connexion', libelleEnvoi: 'Créer mon compte', champs: [
    { colonne: 'nom', libelle: 'Nom complet', nature: 'texte', requis: true }, { colonne: 'courriel', libelle: 'Courriel', nature: 'courriel', requis: true }] } },
  { archetype: 'liste', route: 'offres', acces: 'visiteur', slots: { titre: 'Toutes les offres', table: 'offre', colonnes: colonnesOffre, detail: 'offre', vide: 'Aucune offre pour le moment.' } },
  { archetype: 'recherche', route: 'recherche', acces: 'visiteur', slots: { titre: 'Chercher une ville', table: 'offre', colonneRecherche: 'ville', libelleRecherche: 'Ville', colonnes: colonnesOffre, detail: 'offre', vide: 'Aucune offre dans cette ville.' } },
  { archetype: 'detail', route: 'offre', acces: 'visiteur', slots: { titre: 'L’offre', table: 'offre', colonnes: colonnesOffre, retour: 'offres', vide: 'Choisissez d’abord une offre.', actions: [
    { composant: 'Bouton', libelle: 'Réserver et payer', genre: 'principal', effets: [{ faire: 'navigate', route: 'paiement' }] }] } },
  { archetype: 'checkout', route: 'paiement', acces: 'Client', slots: { titre: 'Paiement', table: 'offre', colonnes: colonnesOffre.slice(0, 2), colonneMontant: 'prix', tablePaiement: 'paiement', champMontant: 'montant', champMoyen: 'moyen', moyens: ['Airtel Money', 'Moov Money'], confirmation: 'confirmation', libellePayer: 'Payer maintenant', vide: 'Aucune offre choisie.' } },
  { archetype: 'confirmation', route: 'confirmation', acces: 'Client', slots: { titre: 'Votre réservation', message: 'Paiement reçu : votre chambre est réservée.', table: 'offre', colonnes: colonnesOffre.slice(0, 3), vide: 'Aucune réservation en cours.', suites: [{ libelle: 'Retour à l’accueil', route: 'accueil' }, { libelle: 'Voir mon profil', route: 'profil' }] } },
  { archetype: 'profil', route: 'profil', acces: 'Client', slots: { titre: 'Mon profil', table: 'compte', colonnes: [{ colonne: 'nom', libelle: 'Nom' }, { colonne: 'courriel', libelle: 'Courriel' }, { colonne: 'langue', libelle: 'Langue' }], vide: 'Profil introuvable.' } },
  { archetype: 'compte', route: 'compte', acces: 'visiteur', slots: { titre: 'Mon compte' } },
  { archetype: 'dashboard', route: 'tableau', acces: 'Gérant', slots: { titre: 'Tableau de bord', table: 'reservation', vide: 'Aucune réservation.', raccourcis: [{ libelle: 'Gérer les offres', route: 'gestion' }, { libelle: 'Voir le site', route: 'offres' }],
    colonnes: [{ colonne: 'offre', libelle: 'Offre' }, { colonne: 'client', libelle: 'Client' }, { colonne: 'montant', libelle: 'Montant', format: 'montant' }, { colonne: 'statut', libelle: 'Statut', format: 'statut' }] } },
  { archetype: 'tableAdmin', route: 'gestion', acces: 'Gérant', slots: { titre: 'Gérer les offres', table: 'offre', colonnes: colonnesOffre, creation: 'nouvelle-offre', vide: 'Aucune offre.' } },
  { archetype: 'formulaire', route: 'nouvelle-offre', acces: 'Gérant', slots: { titre: 'Nouvelle offre', table: 'offre', apres: 'gestion', libelleEnvoi: 'Publier l’offre', champs: [
    { colonne: 'nom', libelle: 'Nom de l’offre', nature: 'texte', requis: true }, { colonne: 'ville', libelle: 'Ville', nature: 'texte', requis: true }, { colonne: 'prix', libelle: 'Prix par nuit', nature: 'nombre', requis: true }] } },
  { archetype: 'pageDuCompte', route: 'aide', acces: 'visiteur', slots: { titre: 'Aide', texte: 'Une question sur une réservation ? Écrivez-nous depuis la page Contact.', retour: 'compte' } },
  { archetype: 'pageDuCompte', route: 'contact', acces: 'visiteur', slots: { titre: 'Contact', texte: 'Notre équipe répond du lundi au samedi.', retour: 'compte' } },
  { archetype: 'pageDuCompte', route: 'legal', acces: 'visiteur', slots: { titre: 'Mentions légales', texte: 'Plateforme de réservation, données hébergées pour le compte de l’exploitant.', retour: 'compte' } },
]

/** La route de chaque archétype (une par archétype). */
export const ROUTE_PAR_ARCHETYPE: Readonly<Record<string, string>> = Object.fromEntries(
  REMPLISSAGES.filter((r, i, a) => r.archetype !== 'pageDuCompte' && a.findIndex((x) => x.archetype === r.archetype) === i).map((r) => [r.archetype, r.route]),
)

/** Traductions : les libellés de gabarit traduits par Deribfy ; les autres, des marqueurs. */
function traduire(ecrans: readonly unknown[]): Spec['traductions'] {
  const fr = libellesDuGabarit('fr')
  const inverse = new Map(Object.entries(fr).map(([k, v]) => [v, k]))
  return (['en', 'ar'] as const).map((langue) => ({
    langue,
    textes: ecrans.flatMap((e) => textesDe(e)).map((t) => {
      const k = inverse.get(t.texte)
      return { cle: t.cle, texte: k !== undefined ? libellesDuGabarit(langue)[k]! : `[${langue}] ${t.texte}` }
    }),
  }))
}

export function ecransTemoin(o: { visiteurPartout?: boolean } = {}): Record<string, unknown>[] {
  return REMPLISSAGES.map((r) => expanser({ ...r, acces: o.visiteurPartout === true ? 'visiteur' : r.acces }, { langue: 'fr', langues: LANGUES }))
}

export function specTemoin(o: { visiteurPartout?: boolean } = {}): Spec {
  const ecrans = ecransTemoin(o)
  return { ecrans: ecrans as Spec['ecrans'], barre: ['accueil', 'offres', 'recherche', 'compte'], traductions: traduire(ecrans) }
}

export function appTemoin(o: { visiteurPartout?: boolean } = {}): AppCompilee {
  return compilerApp(specTemoin(o), { nom: 'Réserver au Tchad', langues: LANGUES, devise: 'XAF' })
}

/** Les fichiers de l'application témoin, à assembler : le moteur (lu sur disque) et l'entrée. */
export function fichiersTemoin(moteur: Readonly<Record<string, string>>, o: { visiteurPartout?: boolean; etat?: EtatSource; latenceMs?: number } = {}): Map<string, string> {
  const reglages: Reglages = {
    tables: DONNEES,
    ...(o.etat !== undefined ? { etats: Object.fromEntries(Object.keys(DONNEES).map((t) => [t, o.etat!])) } : {}),
    ...(o.latenceMs !== undefined ? { latenceMs: o.latenceMs } : {}),
  }
  const parcours = [['offre', DONNEES.offre![0]], ['compte', DONNEES.compte![0]]]
  return new Map([
    ...Object.entries(moteur).map(([k, v]) => [`rendu/${k}`, v] as [string, string]),
    ['temoin.ts', `export const APP = ${JSON.stringify(appTemoin(o))}\nexport const REGLAGES = ${JSON.stringify(reglages)}\nexport const PARCOURS = ${JSON.stringify(parcours)}\n`],
    ['index.tsx', `import { monter } from './rendu/moteur'\nimport { Magasin } from './rendu/donnees'\nimport { APP, REGLAGES, PARCOURS } from './temoin'\nmonter(APP as never, new Magasin(REGLAGES as never), new Map(PARCOURS as never))\n`],
  ])
}
