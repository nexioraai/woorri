/**
 * EP-279 — UNE ROUTE QUI TRAVAILLE LONGTEMPS DOIT BATTRE.
 *
 * ── LE DÉFAUT, MESURÉ EN PRODUCTION LE 2026-10-19.
 *
 * La route d'écriture directe a travaillé 255 secondes, abouti, et écrit sa
 * ligne en base — ligne que j'ai relue après coup, horodatée 01:26:05.
 *
 * L'écran, lui, avait renoncé avant : « Lecture impossible. Votre texte est
 * revenu dans le champ. » Le propriétaire a vu un échec là où la machine
 * avait réussi, et il a eu raison de me dire que je le menais en bateau :
 * j'avais écrit la veille que ce message ne pouvait plus revenir.
 *
 * ── CE QUI L'A CAUSÉ, ET CE QUI NE L'A PAS CAUSÉ.
 *
 *   · PAS le filet du navigateur : `DELAI_MAX_MS` vaut 45 minutes.
 *   · PAS la fonction : elle a répondu, et sa ligne existe.
 *   · LA CONNEXION, restée sans UN SEUL OCTET pendant plus de quatre
 *     minutes, fermée par une couche intermédiaire.
 *
 * La documentation de l'hébergeur le dit mot pour mot : « HTTP/1.1 clients
 * and intermediate network layers may still close idle connections. For those
 * cases, stream progress or heartbeat data while work is running. »
 *
 * ── CE QUE CE CLIQUET TIENT.
 *
 * Que la route BATTE, et que l'écran SACHE LIRE un corps qui bat. Les deux,
 * parce que l'un sans l'autre ne sert à rien : une route qui bat devant un
 * écran qui appelle `res.json()` casse exactement comme avant.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { derniereLigneJson, lireReponseQuiBat } from '../flux-lignes'

const lire = (...p: string[]) => readFileSync(join(__dirname, '..', '..', '..', ...p), 'utf8')

describe('EP-279 · lire un corps qui bat', () => {
  it('① LES BATTEMENTS SONT IGNORÉS, la dernière ligne est lue', () => {
    // La forme exacte que produit la route : des lignes vides pendant le
    // travail, puis UNE ligne JSON.
    const corps = '\n\n\n\n' + JSON.stringify({ ok: true, html: '<p>x</p>' })
    expect(derniereLigneJson<{ ok: boolean }>(corps)?.ok).toBe(true)
  })

  it('② UNE RÉPONSE ORDINAIRE SE LIT DU MÊME GESTE', () => {
    // ── CE N'EST PAS UNE COMMODITÉ, C'EST CE QUI REND LE LECTEUR SÛR.
    //
    // Les refus rapides de la route — demande vide, mauvais moteur, clé
    // absente — restent du JSON simple. Si l'écran devait choisir son
    // lecteur selon la forme reçue, il se tromperait le jour où une route
    // change d'avis. Une réponse JSON EST une seule ligne non vide.
    const d = derniereLigneJson<{ error: string }>(JSON.stringify({ error: 'demande requise' }))
    expect(d?.error).toBe('demande requise')
  })

  it('③ UN CORPS QUI N’A QUE DES BATTEMENTS REND null, pas un objet vide', () => {
    // C'est le cas RÉEL d'une connexion coupée en plein travail. Rendre `{}`
    // ferait dire à l'écran « ok est absent donc c'est un échec » sans
    // pouvoir distinguer d'un vrai refus — et c'est ainsi qu'on affiche
    // « Lecture impossible » sur une machine qui tournait très bien.
    expect(derniereLigneJson('\n\n\n')).toBeNull()
    expect(derniereLigneJson('')).toBeNull()
  })

  it('④ UNE DERNIÈRE LIGNE TRONQUÉE NE CONDAMNE PAS LA PRÉCÉDENTE', () => {
    const corps = `${JSON.stringify({ ok: true })}\n{"ok":fal`
    expect(derniereLigneJson<{ ok: boolean }>(corps)?.ok).toBe(true)
  })

  it('⑤ LE LECTEUR PREND LE CORPS EN TEXTE, jamais en JSON', async () => {
    // `res.json()` s'étranglerait sur les lignes vides du battement. Ce
    // double n'expose QUE `text()` : y revenir fait rougir.
    const faux = { text: async () => '\n\n{"ok":true}' } as unknown as Response
    const d = await lireReponseQuiBat<{ ok: boolean }>(faux)
    expect(d?.ok).toBe(true)
  })
})

describe('EP-279 · les deux bouts sont branchés', () => {
  // Ces deux contrôles lisent la SOURCE, parce que le défaut est dans le
  // branchement : un lecteur parfait qu'on n'appelle pas ne sert à rien, et
  // une route qui ne bat pas rend le lecteur inutile. C'est la leçon
  // d'EP-267 — une machine posée mais débranchée reste débranchée.

  it('⑥ LA ROUTE ÉMET UN BATTEMENT PENDANT QU’ELLE TRAVAILLE', () => {
    const src = lire('app', 'api', 'generateur', 'direct', 'route.ts')
    const code = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    expect(code, 'la réponse ne part pas en flux : la connexion redeviendra muette').toContain(
      'new ReadableStream',
    )
    expect(code, 'aucun battement périodique n’est posé').toMatch(/setInterval\(/u)
    // SANS CET EN-TÊTE, un proxy peut tout garder en tampon et ne rien
    // relâcher avant la fin — ce qui annulerait le battement qu'on vient
    // de poser, sans qu'aucun test d'exécution ne le voie.
    expect(code, 'un proxy peut encore tout mettre en tampon').toContain('X-Accel-Buffering')
  })

  it('⑦ L’ÉCRAN LIT CE FLUX, et n’appelle plus res.json() sur cette route', () => {
    const src = lire('components', 'onboarding', 'ConversationApplication.tsx')
    const code = src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    const i = code.indexOf("fetch('/api/generateur/direct'")
    expect(i, 'la route directe n’est plus appelée depuis l’écran').toBeGreaterThan(-1)
    // On ne regarde que le branchement de CETTE route : les autres appels de
    // ce fichier parlent à des routes qui répondent en un bloc.
    const branche = code.slice(i, i + 900)
    expect(branche, 'l’écran ne sait pas lire un corps qui bat').toContain('lireReponseQuiBat')
    expect(branche, '`res.json()` s’étrangle sur les lignes vides du battement').not.toContain(
      'res.json()',
    )
  })
})
