// LES SUJETS PAR DÉFAUT DE LA BULLE (lot 2 « textes neutres », 2026-11-26).
//
// Ils étaient écrits en dur pour la CPA (appels d'offres, devenir fournisseur,
// Centrale…) et s'affichaient sur tout site qui allume l'assistant. Ils sont
// maintenant TIRÉS DU SITE : un sujet n'existe que si le site a ce qu'il
// promet, et un lien n'est donné que vers une adresse CONNUE (page publiée ou
// écran du compte). Un site qui écrit ses propres boutons (page « assistant »)
// garde les siens — c'est le cas de la CPA.
//
// PUR : aucune lecture.
import type { Institution } from '@/lib/sites/institution'

export type Lien = { chemin: string; titre: string }
export type Sujet = { label: string; reponse: string; liens: Lien[] }

export function sujetsParDefaut(o: {
  inst: Institution
  appelsOffres: boolean
  comptes: boolean
  /** Les adresses connues → leur titre (pages publiées, écrans du compte, `/#contact`). */
  connus: ReadonlyMap<string, string>
}): Sujet[] {
  const garder = (liens: Lien[]) => liens.filter((l) => o.connus.has(l.chemin) || l.chemin === '/#contact')
  const sujets: Sujet[] = []
  if (o.appelsOffres) {
    sujets.push({ label: 'Appels d’offres',
      reponse: 'Tous les appels d’offres publiés sont sur cette page, avec leur date limite de remise et leur portée.',
      liens: garder([{ chemin: '/appels-offres', titre: 'Voir les appels d’offres' }, { chemin: '/appels-offres/comment-repondre', titre: 'Comment répondre' }]) })
  }
  if (o.comptes) {
    sujets.push({ label: 'Créer un compte',
      reponse: 'Remplissez le formulaire d’inscription : nom, organisation, téléphone, adresse électronique et mot de passe. Votre compte est créé tout de suite.',
      liens: garder([{ chemin: '/inscription', titre: 'Créer un compte' }, { chemin: '/connexion', titre: 'Se connecter' }]) })
  }
  if (o.connus.has('/actualites')) {
    sujets.push({ label: 'Actualités',
      reponse: `Les dernières nouvelles ${o.inst.de} sont publiées ici.`,
      liens: garder([{ chemin: '/actualites', titre: 'Actualités' }]) })
  }
  sujets.push({ label: 'Contact',
    reponse: `Les coordonnées ${o.inst.de} et le formulaire de contact sont sur la page d’accueil.`,
    liens: [{ chemin: '/#contact', titre: `Contacter ${o.inst.la}` }] })
  // Un sujet sans aucun lien utile ne s'affiche pas — sauf Contact, toujours là.
  return sujets.filter((s) => s.liens.length > 0)
}
