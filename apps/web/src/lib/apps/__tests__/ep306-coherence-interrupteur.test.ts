/**
 * EP-306 — LES DEUX RÉGLAGES DE L'INTERRUPTEUR NE PEUVENT PAS SE CONTREDIRE.
 *
 * ── LE DÉFAUT, SOULEVÉ PAR LE PROPRIÉTAIRE LE 2026-10-31.
 *
 * L'interrupteur a DEUX réglages chez l'hébergeur : `GENERATEUR_MOTEUR`
 * (serveur) et `NEXT_PUBLIC_GENERATEUR_MOTEUR` (écran). RIEN ne force leur
 * égalité — on peut en changer un et oublier l'autre.
 *
 * Mesuré ici, les quatre combinaisons : quand ils divergent, l'écran frappe
 * à une porte que le serveur a fermée. La personne voit « cette version
 * n'est pas active » sans rien avoir fait de mal, et le produit paraît
 * cassé — alors qu'il se protège.
 *
 * Les deux portes refusent bien (EP-281 tient), donc rien ne DÉPENSE à
 * tort : le défaut n'est pas une fuite, c'est une IMPASSE MUETTE. Ce
 * cliquet exige qu'elle soit DITE au démarrage, pas découverte par un
 * acheteur.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  coherenceInterrupteur,
  moteurChoisi,
  refusSiPasAir,
  type Moteur,
} from '../interrupteur-moteur'

/** Les entrées fautives mesurées le 2026-10-31, AVANT la bascule EP-305. */
const ENTREES: readonly (string | undefined)[] = [
  undefined,
  '',
  '   ',
  'DIRECT',
  'dirct',
  'v3',
  'true',
  'air',
  'direct',
]

describe('EP-306 · le tableau d’après, imprimé', () => {
  it('① LES MÊMES ENTRÉES, APRÈS LA BASCULE — rien ne tombe sur le mort', () => {
    const lignes: string[] = []
    for (const v of ENTREES) {
      const m = moteurChoisi(v)
      lignes.push(`${String(v).padEnd(10)} → ${m}`)
      expect(m, `« ${String(v)} » ne devrait mener à air que si c'est exact`).toBe(
        v === 'air' ? 'air' : 'direct',
      )
    }
    // La table est IMPRIMÉE : une affirmation sans sortie est non vérifiée.
    console.log('\n── moteurChoisi, après EP-305 :\n' + lignes.join('\n'))
  })
})

describe('EP-306 · les quatre combinaisons des deux réglages', () => {
  const combinaisons: readonly (readonly [string | undefined, string | undefined])[] = [
    ['air', 'air'],
    ['air', 'direct'],
    ['direct', 'air'],
    ['direct', 'direct'],
    [undefined, undefined],
    ['direct', undefined],
  ]

  it('② CHAQUE COMBINAISON EST MESURÉE, et la divergence est NOMMÉE', () => {
    const lignes: string[] = []
    for (const [serveur, ecran] of combinaisons) {
      const ms: Moteur = moteurChoisi(serveur)
      const me: Moteur = moteurChoisi(ecran)
      const c = coherenceInterrupteur(serveur, ecran)
      lignes.push(
        `serveur=${String(serveur).padEnd(9)} écran=${String(ecran).padEnd(9)} → ` +
          `${ms.padEnd(6)} / ${me.padEnd(6)} · ${c === null ? 'cohérent' : 'DIVERGENT : ' + c.raison.slice(0, 60)}`,
      )
      expect(c === null, `cohérence mal jugée pour ${String(serveur)}/${String(ecran)}`).toBe(
        ms === me,
      )
    }
    console.log('\n── les deux réglages, combinaison par combinaison :\n' + lignes.join('\n'))
  })

  it('③ LA DIVERGENCE DIT LEQUEL EST QUOI — pas « une erreur est survenue »', () => {
    const c = coherenceInterrupteur('air', 'direct')
    expect(c?.raison).toMatch(/serveur/iu)
    expect(c?.raison).toMatch(/écran/iu)
    expect(c?.raison).toMatch(/air/u)
    expect(c?.raison).toMatch(/direct/u)
  })
})

describe('EP-306 · la divergence se DIT, elle ne reste pas dans un test', () => {
  it('⑦ LA SONDE DE LA FONCTION PORTE L’ÉTAT DES DEUX RÉGLAGES', () => {
    // Une cohérence vérifiée seulement par un cliquet ne protège que le
    // dépôt. Chez l'hébergeur, c'est la configuration DÉPLOYÉE qui diverge —
    // et seule la sonde, qui tourne dans la fonction réelle, peut la lire.
    const source = readFileSync(
      join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'),
      'utf8',
    )
      .replace(/\/\*[\s\S]*?\*\//gu, ' ')
      .replace(/^\s*\/\/.*$/gmu, ' ')
    expect(source, 'la sonde ne rapporte pas l’état de l’interrupteur').toContain(
      'coherenceInterrupteur(',
    )
    expect(source).toMatch(/interrupteur:\s*\{/u)
    expect(source, 'la sonde ne lit pas le réglage de l’écran').toContain(
      'NEXT_PUBLIC_GENERATEUR_MOTEUR',
    )
  })
})

describe('EP-306 · l’option 2 reste ATTEIGNABLE — exercé, pas relu', () => {
  const avec = <T>(valeur: string | undefined, f: () => T): T => {
    const avant = process.env.GENERATEUR_MOTEUR
    if (valeur === undefined) delete process.env.GENERATEUR_MOTEUR
    else process.env.GENERATEUR_MOTEUR = valeur
    try {
      return f()
    } finally {
      if (avant === undefined) delete process.env.GENERATEUR_MOTEUR
      else process.env.GENERATEUR_MOTEUR = avant
    }
  }

  it('④ SUR « air », LA PORTE DE L’OPTION 2 S’OUVRE et celle du direct se ferme', () => {
    // Consigne du propriétaire : l'option 2 reste en place, inerte — mais
    // on ne la laisse pas POURRIR en silence. Plus personne ne l'emprunte :
    // elle pourrait devenir inatteignable sans que rien ne rougisse.
    const surAir = avec('air', () => ({
      option2: refusSiPasAir(),
      direct: moteurChoisi(process.env.GENERATEUR_MOTEUR),
    }))
    expect(surAir.option2, 'l’option 2 est devenue inatteignable').toBeNull()
    expect(surAir.direct, 'la route directe devrait refuser quand air sert').toBe('air')
    console.log('\n── interrupteur sur « air » : option 2 ouverte, route directe refusée (409)')
  })

  it('⑤ SUR « direct », C’EST L’INVERSE — la symétrie d’EP-281 tient', () => {
    const surDirect = avec('direct', () => ({
      option2: refusSiPasAir(),
      direct: moteurChoisi(process.env.GENERATEUR_MOTEUR),
    }))
    expect(surDirect.option2, 'l’option 2 reste ouverte alors que direct sert').not.toBeNull()
    expect(surDirect.direct).toBe('direct')
  })

  it('⑥ ET SUR UNE VARIABLE ABSENTE, l’option 2 refuse — fail-safe EP-305', () => {
    const sansRien = avec(undefined, () => refusSiPasAir())
    expect(sansRien, 'une variable absente rouvrirait le moteur éteint').not.toBeNull()
  })
})
