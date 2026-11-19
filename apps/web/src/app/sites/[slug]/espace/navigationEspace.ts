import {
  LayoutDashboard, CirclePlus, ShoppingBag, ClipboardCheck, Users, FolderOpen, BadgeCheck, Gavel,
  MessageSquare, TriangleAlert, FileText, Search, UserRound, MessagesSquare,
} from 'lucide-react'
import type { MotsEspace } from '../espace-client/EspaceClient'

// ============================================================================
// LA NAVIGATION DE L'ESPACE — une seule liste, pour la barre latérale et pour
// les raccourcis de l'accueil (CPA, 2026-11-19 : « un vrai tableau de bord,
// sidebar à gauche »).
//
// Ce qu'on voit dépend du RÔLE que la route a rendu, jamais d'un indice local :
//   · un client (structure sanitaire, ONG) commande ;
//   · un fournisseur a son dossier, sa préqualification, ses consultations ;
//   · un agent de la Division DDM gère les commandes et les comptes clients.
// Les routes refusent de toute façon ce qu'un rôle n'a pas à voir.
// ============================================================================

export type IconeNav =
  | 'tableau' | 'commander' | 'commandes' | 'gestion' | 'clients'
  | 'dossier' | 'prequalification' | 'consultations'
  | 'demandes' | 'reclamations' | 'documents' | 'suivi' | 'profil' | 'messages'

export type EntreeNav = { chemin: string; libelle: string; icone: IconeNav }
export type GroupeNav = { titre: string; entrees: EntreeNav[] }

export function navigationEspace(
  { role, gestion }: { role: 'structure' | 'fournisseur' | 'agent'; gestion: boolean },
  mots: MotsEspace,
): GroupeNav[] {
  // L'AGENT DE LA DDM N'EST PAS UN CLIENT (CPA, 2026-11-19 : « le système doit
  // absolument faire la différence ») : il a SON tableau de bord, ses clients,
  // les commandes, son profil — et rien des écrans d'un client.
  if (gestion) return [
    { titre: mots.navGestion, entrees: [
      { chemin: 'espace-client', libelle: mots.tableauDeBord, icone: 'tableau' },
      { chemin: 'comptes-clients', libelle: mots.comptesClients, icone: 'clients' },
      { chemin: 'gestion-commandes', libelle: mots.gestionCommandes, icone: 'gestion' },
    ] },
    { titre: mots.navCompte, entrees: [{ chemin: 'mon-profil', libelle: mots.monProfil, icone: 'profil' }] },
  ]
  const groupes: GroupeNav[] = []
  groupes.push({ titre: mots.navPrincipal, entrees: [
    { chemin: 'espace-client', libelle: mots.tableauDeBord, icone: 'tableau' },
    // « Évite la répétition » (CPA, 2026-11-19) : « Passer une commande » vit
    // dans le tableau de bord et dans « Mes commandes », pas une 3e fois ici.
    ...(role === 'structure' ? [
      { chemin: 'mes-commandes', libelle: mots.mesCommandes, icone: 'commandes' as const },
      { chemin: 'mes-messages', libelle: mots.messages, icone: 'messages' as const },
    ] : []),
  ] })
  if (role === 'fournisseur') groupes.push({ titre: mots.navFournisseur, entrees: [
    { chemin: 'mon-dossier', libelle: mots.monDossier, icone: 'dossier' },
    { chemin: 'ma-prequalification', libelle: mots.maPrequalification, icone: 'prequalification' },
    { chemin: 'mes-consultations', libelle: mots.mesConsultations, icone: 'consultations' },
  ] })
  groupes.push({ titre: mots.navEchanges, entrees: [
    { chemin: 'mes-demandes', libelle: mots.mesDemandes, icone: 'demandes' },
    { chemin: 'mes-reclamations', libelle: mots.mesReclamations, icone: 'reclamations' },
    { chemin: 'mes-documents', libelle: mots.mesDocuments, icone: 'documents' },
    // « Suivre une demande par sa référence » sert au visiteur SANS compte ;
    // connecté, « Mes demandes » montre déjà tout. Pas de doublon ici.
  ] })
  groupes.push({ titre: mots.navCompte, entrees: [
    { chemin: 'mon-profil', libelle: mots.monProfil, icone: 'profil' },
  ] })
  return groupes
}

/** L'entrée active : la plus longue qui correspond au chemin de la page. */
export function estActif(entree: EntreeNav, actif: string): boolean {
  return entree.chemin.split('#')[0] === actif && !entree.chemin.includes('#')
}

/** L'icône de chaque entrée — barre latérale et raccourcis de l'accueil. */
export const ICONES: Record<IconeNav, typeof LayoutDashboard> = {
  tableau: LayoutDashboard, commander: CirclePlus, commandes: ShoppingBag, gestion: ClipboardCheck, clients: Users,
  dossier: FolderOpen, prequalification: BadgeCheck, consultations: Gavel,
  demandes: MessageSquare, reclamations: TriangleAlert, documents: FileText, suivi: Search, profil: UserRound, messages: MessagesSquare,
}
