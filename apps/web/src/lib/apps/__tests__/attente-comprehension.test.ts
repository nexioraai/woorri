/**
 * LES PREUVES DE L'ATTENTE — ecrites contre le defaut reel, pas contre l'idee.
 */
import { describe, expect, it } from 'vitest'
import {
  DELAI_MAX_MS,
  MESSAGE_ILLISIBLE,
  PIRE_LECTURE_MESUREE_MS,
  SEUIL_CAHIER,
  grouper,
  libelleLecture,
  messageDeLEchec,
  messageInterrompu,
  phraseAttente,
  retirerDernierEcho,
} from '../attente-comprehension'

describe('le nombre se lit', () => {
  it('groupe par trois avec une espace fine insécable', () => {
    expect(grouper(8220)).toBe('8 220')
    expect(grouper(999)).toBe('999')
    expect(grouper(1000)).toBe('1 000')
    expect(grouper(1234567)).toBe('1 234 567')
  })
  it('ne produit jamais de nombre négatif ni décimal', () => {
    expect(grouper(-5)).toBe('0')
    expect(grouper(12.9)).toBe('12')
  })
})

describe('ce qu’on dit pendant qu’on lit', () => {
  it('une phrase reste une demande', () => {
    expect(libelleLecture(40)).toBe('Je lis votre demande')
    expect(libelleLecture(SEUIL_CAHIER - 1)).toBe('Je lis votre demande')
  })
  it('un cahier des charges est nommé, avec sa taille réelle', () => {
    expect(libelleLecture(8220)).toBe('Je lis votre cahier des charges (8 220 caractères)')
    expect(libelleLecture(SEUIL_CAHIER)).toContain('cahier des charges')
  })
  it('JAMAIS de pourcentage, de barre ni de compte à rebours', () => {
    for (const n of [0, 500, SEUIL_CAHIER, 8220, 200_000]) {
      expect(libelleLecture(n)).not.toMatch(/%|restant|reste|bientôt|presque|\bdans \d/iu)
    }
  })
})

describe('ce qu’on dit quand on rend la main', () => {
  it('la minute annoncée est DÉRIVÉE du délai, jamais recopiée', () => {
    // Le cliquet : si quelqu'un change le delai sans changer la phrase, c'est
    // la phrase qui ment. Ici elle ne peut pas.
    expect(messageInterrompu(DELAI_MAX_MS)).toContain(
      `${String(Math.round(DELAI_MAX_MS / 60_000))} minutes`,
    )
    expect(messageInterrompu(120_000)).toContain('2 minutes')
    expect(messageInterrompu(600_000)).toContain('10 minutes')
  })
  it('promet le retour du texte — c’est ce que le code doit tenir', () => {
    expect(messageInterrompu()).toContain('revenu dans le champ')
    expect(MESSAGE_ILLISIBLE).toContain('revenu dans le champ')
  })
  it('ne laisse JAMAIS fuir l’état du compte ni le jargon du fournisseur', () => {
    const interdit = /crédit|credit|quota|facture|token|jeton|\$|USD|anthropic|api[_ -]?key|rate.?limit/iu
    expect(messageInterrompu()).not.toMatch(interdit)
    expect(MESSAGE_ILLISIBLE).not.toMatch(interdit)
    expect(libelleLecture(8220)).not.toMatch(interdit)
  })
})

describe('le délai est un filet posé sur la MESURE, pas sur une config', () => {
  // CLIQUET ECRIT APRES LE DEFAUT, ET CONTRE LUI.
  //
  // La premiere version valait 6 min, deduite de `maxDuration = 300`. Une
  // lecture a abouti a 7,2 min : le filet a jete une comprehension entiere
  // et payee. Un delai deduit d'une valeur de configuration ne vaut rien —
  // seul le temps RELEVE compte.
  it('se tient au-dessus du pire temps de lecture mesuré', () => {
    expect(DELAI_MAX_MS).toBeGreaterThan(PIRE_LECTURE_MESUREE_MS)
  })
  it('garde une marge franche, pas une marge de justesse', () => {
    expect(DELAI_MAX_MS).toBeGreaterThanOrEqual(PIRE_LECTURE_MESUREE_MS * 1.5)
  })
  it('la mesure elle-même est celle du journal : 23,0 min', () => {
    expect(PIRE_LECTURE_MESUREE_MS).toBe(23 * 60_000)
  })
})

describe('la phrase que l’utilisateur lit vraiment', () => {
  const DEBUT = '2026-10-10T18:00:00.000Z'
  const T = (min: number) => new Date(DEBUT).getTime() + min * 60_000

  it('dit CE QU’on lit et DEPUIS QUAND', () => {
    expect(phraseAttente(8220, DEBUT, T(0))).toBe(
      'Je lis votre cahier des charges (8\u202f220 caractères) depuis moins d’une minute…' + ' Une lecture complète prend plusieurs minutes.',
    )
    expect(phraseAttente(8220, DEBUT, T(3))).toBe(
      'Je lis votre cahier des charges (8\u202f220 caractères) depuis 3 min…' + ' Une lecture complète prend plusieurs minutes.',
    )
    expect(phraseAttente(40, DEBUT, T(2))).toBe('Je lis votre demande depuis 2 min…')
  })

  it('prévient SEULEMENT sur un cahier — une phrase n’attend pas', () => {
    expect(phraseAttente(8220, DEBUT, T(1))).toContain('prend plusieurs minutes')
    expect(phraseAttente(40, DEBUT, T(1))).not.toContain('plusieurs minutes')
  })

  it('l’écoulé est RÉEL : il ne peut pas précéder le départ', () => {
    expect(phraseAttente(40, DEBUT, T(-99))).toContain('moins d’une minute')
  })
})

describe('quel message pour quel échec', () => {
  it('le filet qui mord annonce qu’on a rendu la main', () => {
    const avorte = new Error('aborted')
    avorte.name = 'AbortError'
    expect(messageDeLEchec(avorte)).toBe(messageInterrompu())
  })
  it('une panne franche reste une panne franche', () => {
    expect(messageDeLEchec(new TypeError('réseau'))).toBe(MESSAGE_ILLISIBLE)
    expect(messageDeLEchec('bizarre')).toBe(MESSAGE_ILLISIBLE)
    expect(messageDeLEchec(undefined)).toBe(MESSAGE_ILLISIBLE)
  })
})

describe('effacer la trace d’un tour qui n’a pas eu lieu', () => {
  const moi = (texte: string) => ({ role: 'moi', texte })
  const eux = { role: 'deribfy' as const }

  it('retire la bulle du tour échoué', () => {
    expect(retirerDernierEcho([eux, moi('bonjour')], 'bonjour')).toEqual([eux])
  })
  it('ne touche à RIEN si la dernière bulle n’est pas la bonne', () => {
    // Le garde-fou qui compte : une suppression qui se trompe de cible
    // effacerait la reponse de Deribfy ou le tour d'avant.
    const fil = [moi('bonjour'), eux]
    expect(retirerDernierEcho(fil, 'bonjour')).toEqual(fil)
    const autre = [moi('bonjour'), moi('autre chose')]
    expect(retirerDernierEcho(autre, 'bonjour')).toEqual(autre)
  })
  it('supporte un fil vide sans broncher', () => {
    expect(retirerDernierEcho([], 'bonjour')).toEqual([])
  })
  it('n’en retire JAMAIS plus d’une', () => {
    const fil = [moi('x'), moi('x'), moi('x')]
    expect(retirerDernierEcho(fil, 'x')).toHaveLength(2)
  })
})
