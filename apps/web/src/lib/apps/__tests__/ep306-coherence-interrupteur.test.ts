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
  etatInterrupteur,
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

  it('② CHAQUE COMBINAISON EST MESURÉE — serveur à l’EXÉCUTION, client au BUILD', () => {
    const lignes: string[] = []
    for (const [serveur, cuit] of combinaisons) {
      const e = etatInterrupteur(serveur, { presente: cuit !== undefined, moteur: moteurChoisi(cuit) })
      lignes.push(
        `serveur(exec)=${String(serveur).padEnd(9)} client(cuit)=${String(cuit).padEnd(9)} → ` +
          `${e.serveur.padEnd(6)} / ${e.client.padEnd(6)} · ` +
          `posées: srv=${String(e.serveurPresente).padEnd(5)} cli=${String(e.clientCuitPresente).padEnd(5)} · ` +
          (e.coherent ? 'cohérent' : 'DIVERGENT'),
      )
      expect(e.coherent, `cohérence mal jugée pour ${String(serveur)}/${String(cuit)}`).toBe(
        moteurChoisi(serveur) === moteurChoisi(cuit),
      )
    }
    console.log('\n── les deux MONDES, combinaison par combinaison :\n' + lignes.join('\n'))
  })

  it('③ « ABSENTE » N’EST PAS « LUE » — le cas le plus courant reste visible', () => {
    // Une variable absente tombe sur le fail-safe (direct) : pas une faute,
    // mais pas la même chose qu'une valeur posée. Les confondre rendrait le
    // contrôle aveugle à la variable oubliee.
    const absente = etatInterrupteur(undefined, { presente: false, moteur: moteurChoisi(undefined) })
    expect(absente.serveur).toBe('direct')
    expect(absente.serveurPresente).toBe(false)
    expect(absente.clientCuitPresente).toBe(false)
    expect(absente.coherent, 'le fail-safe rend bien les deux mondes d’accord').toBe(true)
    const posee = etatInterrupteur('direct', { presente: true, moteur: 'direct' })
    expect(posee.serveurPresente).toBe(true)
    expect(posee.clientCuitPresente).toBe(true)
  })

  it('④bis LE CAS QUI MENTAIT : réglage changé chez l’hébergeur SANS redéploiement', () => {
    // Le défaut nommé par le propriétaire : le serveur voit la NOUVELLE
    // valeur, l'écran garde l'ANCIENNE (cuite). L'ancienne version de ce
    // contrôle lisait les deux côté serveur et aurait dit « cohérent ».
    const e = etatInterrupteur('air', { presente: true, moteur: 'direct' })
    expect(e.coherent, 'le faux vert est revenu').toBe(false)
    expect(e.raison).toMatch(/cuit au build/u)
    expect(e.raison, 'la conduite à tenir n’est pas dite').toMatch(/REDEPLOYEZ/u)
    console.log('\n── serveur=air (exécution) / client=direct (cuit) → DIVERGENT, et la raison dit de redéployer')
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
    expect(source, 'la sonde ne rapporte pas son réglage serveur').toMatch(
      /serveur:\s*moteurChoisi\(serveurBrut\)/u,
    )
    expect(source, 'la sonde ne publie pas l’état').toMatch(/interrupteur:\s*etat/u)
    // La sonde ne PEUT PAS connaître le paquet client : elle ne rapporte
    // que son propre monde. Le client se lit dans la PAGE, par le contrôle.
    expect(source, 'la sonde ne rapporte plus son propre réglage').toContain('serveurPresente')
    expect(source, 'la sonde prétend connaître le client — elle ne le peut pas').not.toContain(
      'MOTEUR_CUIT',
    )
  })
})

describe('EP-306 · le contrôle d’après-déploiement ROUGIT', () => {
  it('⑧ UNE DIVERGENCE FAIT ÉCHOUER LE CONTRÔLE — pas un paragraphe de rapport', async () => {
    // Règle 6 du propriétaire : « un contrôle rend rouge, ou il n'existe
    // pas ». Mesuré sur corps forgés : cohérent → aucune anomalie ;
    // serveur/écran divergents → anomalie ; juge indisponible → anomalie.
    const { jugerSonde } = (await import('../../../../scripts/verifier-sonde.mjs')) as {
      jugerSonde: (c: unknown, html?: string) => string[]
    }
    const sain = {
      interrupteur: { serveur: 'direct', serveurPresente: true },
      // Le CNAME generique est desormais surveille : publier n'ecrit plus
      // de DNS, tout repose sur lui (2026-11-01).
      generique: { vivant: true, temoin: 'x.deribfy.app', detail: 'cname.vercel-dns.com' },
      execution: { utilisable: true },
      assemblage: { ok: true },
    }
    expect(jugerSonde(sain), 'un déploiement sain est déclaré malade').toEqual([])
    // LE CAS REEL : le reglage a change chez l'hebergeur sans redeploiement.
    // Le serveur voit la nouvelle valeur, le navigateur garde l'ancienne —
    // et seules DEUX LECTURES DISTINCTES peuvent le voir.
    const pageClientDirect =
      '<meta name="deribfy-moteur-client" content="direct" data-posee="oui"/>'
    expect(
      jugerSonde({ ...sain, interrupteur: { serveur: 'air' } }, pageClientDirect).join(' '),
      'la divergence des deux mondes ne fait pas rougir',
    ).toMatch(/DIVERGENT/u)
    expect(jugerSonde(sain, pageClientDirect), 'un déploiement aligné est déclaré malade').toEqual([])
    expect(
      jugerSonde(sain, '<html></html>').join(' '),
      'une page sans marqueur passe inaperçue',
    ).toMatch(/ne porte pas la balise/u)
    const jugeMort = { ...sain, execution: { utilisable: false, indisponible: 'spawn refusé' } }
    expect(jugerSonde(jugeMort).join(' ')).toMatch(/INDISPONIBLE/u)
  })

  it('⑨ LE WORKFLOW APPELLE CE CONTRÔLE — sinon il ne protège rien', () => {
    const w = readFileSync(
      join(__dirname, '..', '..', '..', '..', '..', '..', '.github', 'workflows', 'sonde-apres-deploiement.yml'),
      'utf8',
    )
    expect(w, 'le workflow ne lance pas le vérificateur de sonde').toContain(
      'verifier-sonde.mjs',
    )
    expect(w, 'le workflow ne lit pas la PAGE — il ne verrait pas le paquet client').toContain(
      '/tmp/page.html',
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
