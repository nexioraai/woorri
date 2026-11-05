/**
 * EP-348 · L'ACCUEIL PARLE DES QUATRE CHOIX, PAS DE TROIS.
 *
 * ── LE DÉFAUT, SIGNALÉ LE 2026-11-05.
 *
 * Les six exemples qui défilent dans le champ ne parlaient QUE de
 * commerce — « Mes clients créent, je vends… », « Vendre sans stock ni
 * argent… ». Or « Application » est l'un des quatre boutons, juste
 * au-dessus.
 *
 * Quelqu'un qui veut une application ne voyait AUCUN exemple qui lui
 * ressemble, et se croyait au mauvais endroit. C'est le même défaut que
 * la question d'activité — l'écran dit implicitement « ce n'est pas pour
 * vous » — en plus discret, donc en plus difficile à nommer.
 *
 * ── ET MÉLANGER LES FAMILLES EST LE DÉFAUT SYMÉTRIQUE.
 *
 * Montrer « Vendre sans stock » pendant qu'un type de projet est retenu
 * reproduirait exactement la confusion qu'on vient de fermer, dans
 * l'autre sens.
 *
 * ── LE PICTOGRAMME NE REMPLACE PAS LE LIBELLÉ.
 *
 * Quatre pastilles de texte nu se lisent mal sur un téléphone. Mais un
 * pictogramme SEUL se devine mal : le libellé reste sous lui, pas à sa
 * place.
 */
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { lireSource } from './lire-source'
import { invitesPour, PLACEHOLDER_BY_LANG } from '../invites-accueil'

const ECRAN = join(__dirname, '..', '..', '..', 'components', 'onboarding', 'OnboardingChat.tsx')
const MODULE = join(__dirname, '..', 'invites-accueil.ts')

describe('EP-348 · l’accueil et ses quatre choix', () => {
  it('① CHAQUE BOUTON PORTE UN PICTOGRAMME, ET GARDE SON LIBELLÉ', () => {
    const src = lireSource(ECRAN)
    for (const [mode, icone] of [
      ['home.mode.website', 'Globe'],
      ['home.mode.store', 'Store'],
      ['home.mode.dropshipping', 'Truck'],
      ['home.mode.application', 'Smartphone'],
    ] as const) {
      expect(src, `« ${mode} » n’a pas de pictogramme`).toMatch(
        new RegExp(`${mode}'[^\\n]*Icone: ${icone}`, 'u'),
      )
    }
    // ── LE LIBELLÉ RESTE : un pictogramme seul se devine mal.
    expect(src, 'le pictogramme a remplacé le libellé').toMatch(
      /<Icone className="w-5 h-5"[\s\S]{0,60}\{t\(tkey\)\}/u,
    )
  })

  it('② LES EXEMPLES D’APPLICATION EXISTENT, dans les quatre langues', () => {
    // ── ON LIT LES DONNÉES, PAS LA SOURCE.
    //
    // Les exemples ont quitté l'écran pour un module : c'est de la
    // logique, pas de l'interface, et un contrôle qui importe l'écran
    // tire Supabase avec lui.
    for (const langue of ['fr', 'en', 'es', 'ar']) {
      const app = (PLACEHOLDER_BY_LANG[langue] ?? []).filter((i) => i.familles.includes('application'))
      expect(app.length, `aucun exemple d’application en « ${langue} »`).toBeGreaterThanOrEqual(4)
    }
    const src = lireSource(MODULE)
    // Un seul exemple par langue suffit à prouver la famille ; les
    // quatre langues, parce qu'en oublier une rend l'écran muet pour
    // ceux qui la parlent.
    // ET ILS SONT MARQUÉS COMME TELS — sans le `modes: [0]`, ils
    // défileraient aussi quand quelqu'un construit une boutique.
    expect(src, 'les exemples d’application ne sont pas rattachés à leur famille').toMatch(
      /Calculer ma facture[^\n]*familles: \['application'\]/u,
    )
  })

  it('③ ET LA ROTATION SUIT LE TYPE CHOISI', () => {
    const toutes = [
      { texte: 'boutique', familles: ['boutique', 'dropship'] as const },
      { texte: 'appli', familles: ['application'] as const },
      { texte: 'site', familles: ['site'] as const },
    ]
    // ── RIEN DE CHOISI : les quatre familles défilent.
    //
    // C'est ce qui dit « il y a une place pour vous » à quelqu'un qui
    // n'a pas encore cliqué.
    expect(invitesPour(toutes, null), 'l’accueil ne montre pas tout').toEqual([
      'boutique',
      'appli',
      'site',
    ])
    // UN TYPE CHOISI : les siens, et rien d'autre.
    expect(invitesPour(toutes, 'application'), 'les exemples d’un autre type se mêlent').toEqual(['appli'])
    expect(invitesPour(toutes, 'boutique')).toEqual(['boutique'])
    // ── ET UN TYPE SANS EXEMPLE NE LAISSE PAS UN CHAMP MUET.
    //
    // Retomber sur tout vaut mieux que ne rien montrer : un champ vide
    // n'apprend rien, et c'est précisément ce qu'on corrige.
    expect(invitesPour(toutes, 'inconnue' as never), 'un type sans exemple vide le champ').toEqual([
      'boutique',
      'appli',
      'site',
    ])
  })
})
