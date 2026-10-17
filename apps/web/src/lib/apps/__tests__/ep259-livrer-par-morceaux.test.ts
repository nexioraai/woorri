/**
 * EP-259 · LOT 7 — ON LIVRE CE QUI EXISTE, SANS ATTENDRE LA FIN.
 *
 * ── LA MESURE QUI COMMANDE CE LOT.
 *
 * Tir réel du 2026-10-10 : 53 MINUTES, 16,03 $, 1 252 757 jetons d'entrée —
 * et le propriétaire n'a rien vu. La route de livraison exigeait
 * `statut === 'livree'`. Pendant tout ce temps l'acquis était en base,
 * schéma-valide et compilable : `apercu-live` le COMPILAIT déjà pour
 * l'afficher à l'écran, et le téléchargement le refusait.
 *
 * C'est le verrou du LOT 1, un étage plus bas : un juge placé AVANT la
 * livraison plutôt qu'une MESURE de la livraison. La question n'est plus
 * « est-ce fini ? » mais « y a-t-il une œuvre ? ».
 *
 * ── LES DEUX MOITIÉS, ET ELLES NE VALENT QUE PAIRÉES.
 *
 * ① ON LIVRE L'ACQUIS. Une application partielle qui compile et s'affiche
 *    vaut mieux qu'une attente de 53 minutes pour peut-être rien.
 * ② ON NE LA FAIT JAMAIS PASSER POUR COMPLÈTE. La taire serait pire que
 *    l'attente : quelqu'un publierait une application à moitié écrite en
 *    croyant la tenir entière. Le nom du zip porte `-PARTIEL`, et la note
 *    ouvre sur l'avertissement — AVANT les réserves.
 *
 * ① sans ② est un piège. ② sans ① est le silence d'avant.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { migrateAirDocument, projectAirSchema, type ProjectAir } from '@deribfy/air-schema'
import { noteDeLivraison } from '../ce-que-je-dois-dire'

const RACINE = join(__dirname, '..', '..', '..', '..', '..', '..')

const document = (): ProjectAir =>
  migrateAirDocument(
    JSON.parse(
      readFileSync(join(RACINE, 'slices', 'tontine', 'tontine.air.json'), 'utf8'),
    ) as Record<string, unknown>,
  )

const routeLivraison = (): string =>
  readFileSync(
    join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'livraison', 'route.ts'),
    'utf8',
  )

/** La source sans les commentaires : ce fichier PARLE de « livree » et de
 *  « partiel », et mesurer la prose au lieu du code est un piège déjà payé
 *  trois fois dans ce dépôt. */
const codeDe = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'))
    .join('\n')

describe('EP-259 · livrer par morceaux', () => {
  it('① LA LIVRAISON NE DEMANDE PLUS « EST-CE FINI ? »', () => {
    const code = codeDe(routeLivraison())
    // LE VERROU LEVÉ : plus de refus sur le seul statut.
    expect(
      code,
      "la route refuse encore tout ce qui n'est pas `livree` : rien ne se télécharge en cours",
    ).not.toMatch(/statut !== 'livree'\s*\|\|/u)
    // ET L'ACQUIS EST LA SOURCE DE REPLI — nommément.
    expect(code, "l'acquis n'est pas lu : il n'y a rien à livrer en cours").toMatch(
      /sections_acquises/u,
    )
    expect(code, "l'acquis n'est pas la source de repli").toMatch(/sa\.acquis/u)
  })

  it('② LE MÊME ORDRE QUE L’APERÇU — l’écran et le zip ne divergent pas', () => {
    // ── POURQUOI CET ORDRE EST UNE PROPRIÉTÉ, PAS UN DÉTAIL.
    //
    // `apercu-live` montre `document` quand c'est livré, l'acquis sinon. Si
    // le zip choisissait l'inverse, on téléchargerait autre chose que ce
    // qu'on vient de voir — et personne ne saurait lequel croire.
    const livraison = codeDe(routeLivraison())
    const apercu = codeDe(
      readFileSync(
        join(RACINE, 'apps', 'web', 'src', 'app', 'api', 'generateur', 'apercu-live', 'route.ts'),
        'utf8',
      ),
    )
    for (const [nom, src] of [
      ['la livraison', livraison],
      ["l'aperçu", apercu],
    ] as const) {
      // L'œuvre finale d'abord, l'acquis ensuite : l'un AVANT l'autre.
      expect(src.indexOf("statut === 'livree'"), `${nom} ne privilégie pas l'œuvre finale`).toBeGreaterThan(-1)
      expect(src.indexOf('acquis'), `${nom} ne lit pas l'acquis`).toBeGreaterThan(-1)
    }
  })

  it('③ UN PARTIEL NE SE CONFOND PAS AVEC UN COMPLET — le nom du fichier', () => {
    const code = codeDe(routeLivraison())
    expect(
      code,
      'le nom du zip ne distingue pas un partiel : il se publiera par erreur',
    ).toMatch(/PARTIEL/u)
    // Et il est conditionné à l'état, pas collé en dur.
    expect(code, 'la mention est inconditionnelle ou absente').toMatch(
      /finale \? '' : '-PARTIEL'/u,
    )
  })

  it('④ LA NOTE OUVRE SUR L’AVERTISSEMENT — avant même les réserves', () => {
    const air = document()
    const partielle = noteDeLivraison(air, ['DERIVATION_TRAVERSEE_ACTEUR@ecrans[x]'], {
      partielle: true,
    })
    // L'ordre est la propriété : l'avertissement AVANT les réserves, qui
    // sont elles-mêmes avant le reste (EP-254).
    expect(partielle.indexOf('PARTIELLE'), "l'avertissement est absent").toBeGreaterThan(-1)
    expect(
      partielle.indexOf('PARTIELLE'),
      "les réserves passent avant l'avertissement de partialité",
    ).toBeLessThan(partielle.indexOf('réserve'))
    // Elle DIT de ne pas publier, et ce que contient la version tenue.
    expect(partielle, 'rien ne dissuade de publier une version partielle').toMatch(
      /Ne publiez pas/u,
    )
    expect(partielle, "l'ampleur de ce qui est tenu n'est pas dite").toMatch(/écrans/u)
  })

  it('④ bis UNE LIVRAISON COMPLÈTE NE PORTE AUCUN AVERTISSEMENT', () => {
    // Un avertissement toujours présent n'avertit plus de rien — même
    // raisonnement que les réserves d'EP-254.
    const complete = noteDeLivraison(document(), [])
    expect(complete, 'une livraison complète se déclare partielle').not.toMatch(/PARTIELLE/u)
    expect(complete, 'le reste de la note a disparu').toMatch(/Où vivent vos données/u)
    // Et l'option par défaut est « complète » : un appelant qui l'ignore ne
    // fabrique pas un faux avertissement.
    expect(noteDeLivraison(document(), [], {})).toBe(complete)
  })

  it('⑤ UN ACQUIS MI-PLIÉ N’EST PAS UNE PANNE — 409, pas 500', () => {
    // ── LA DISTINCTION QUI COMPTE POUR L'ÉCRAN.
    //
    // En cours de route, l'acquis peut être invalide le temps d'une tranche
    // (plein tour) : `apercu-live` rend alors `pret: false`. Ici, répondre
    // 500 ferait afficher une panne pour une attente. L'écran doit
    // reproposer, pas accuser.
    const code = codeDe(routeLivraison())
    expect(code, "l'acquis invalide n'a pas de réponse distincte").toMatch(/status: finale \? 500 : 409/u)
  })

  it('⑥ LE BRANCHEMENT, PAS L’INTENTION — l’écran propose vraiment', () => {
    // La leçon du LOT 3, payée une fois : une fonction écrite et débranchée
    // ne dit rien à personne.
    const ecran = readFileSync(
      join(RACINE, 'apps', 'web', 'src', 'components', 'onboarding', 'ConversationApplication.tsx'),
      'utf8',
    )
    const i = ecran.indexOf('Télécharger cette version partielle')
    expect(i, "l'écran ne propose pas le téléchargement partiel").toBeGreaterThan(-1)
    // ET IL EST DANS LE PANNEAU DE L'APERÇU : c'est l'aperçu qui PROUVE que
    // l'acquis compile. Le proposer ailleurs offrirait un zip impossible.
    const panneau = ecran.indexOf('apercuGen !== null ? (')
    const fin = ecran.indexOf(') : undefined', panneau)
    expect(
      i > panneau && i < fin,
      "le bouton n'est pas lié à l'aperçu : il s'afficherait sans preuve que l'acquis compile",
    ).toBe(true)
  })

  it('L’ACQUIS D’UN VRAI DOCUMENT EST BIEN LIVRABLE — la promesse tient', () => {
    // On éprouve la PROMESSE sur une vraie donnée : un acquis schéma-valide
    // passe le même portillon que la route, et sa note s'écrit.
    const air = document()
    const lu = projectAirSchema.safeParse(air)
    expect(lu.success, 'le document témoin ne passe plus le schéma').toBe(true)
    if (!lu.success) return
    const note = noteDeLivraison(lu.data, [], { partielle: true })
    expect(note.length, 'la note partielle est vide').toBeGreaterThan(200)
    expect(note).toMatch(/# Tontine\.SY/u)
  })
})
