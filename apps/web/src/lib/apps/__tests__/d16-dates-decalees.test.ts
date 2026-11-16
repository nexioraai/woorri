/**
 * D16 (2026-11-16) — une date saisie le 10 affichée « 09/11/2026 ».
 *
 * MESURÉ sous TZ=America/Toronto (UTC−5), sur les œuvres servies :
 *   Atelier 3b96d2e7 : new Date("2026-11-10").toLocaleDateString → « 09/11/2026 » ;
 *   bibliothèque : lireDate("2026-11-01").getMonth() → 9 (octobre) ;
 *   Suivi de stock 4d480027 : new Date().toISOString().slice(0, 10) à 20 h 30
 *   le 16 → « 2026-11-17 ».
 *
 * ① la bibliothèque lit un jour comme un jour LOCAL (lireDate, parMois, dateCourte) ;
 * ② le juge voit les deux formes du modèle, et seulement elles ;
 * ③ la boucle en fait un reproche, la route un diagnostic.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { assembler } from '../bac-a-sable'
import { fichiersSysteme } from '../bibliotheque-ui'
import { jugerDates, reprocheDates } from '../juge-dates'
import { boucleEcriture } from '../boucle-directe'
import { jugeMuet } from './juge-muet'
import { lireSource } from './lire-source'
import { motifTexte } from './motif-texte'

const tzAvant = process.env.TZ
beforeAll(() => { process.env.TZ = 'America/Toronto' })
afterAll(() => { process.env.TZ = tzAvant })

/** Le module de données ÉMIS (pas sa source TypeScript), exécuté. */
async function donneesEmises(): Promise<Record<string, (...a: unknown[]) => unknown>> {
  const carte = new Map<string, string>([
    ['index.tsx', `import * as D from './systeme/donnees'\n;(globalThis as any).__d16 = D\n`],
    ...fichiersSysteme('XAF'),
  ])
  const v = await assembler(carte)
  if (!v.ok) throw new Error(v.erreur)
  new Function(v.code)()
  return (globalThis as unknown as { __d16: Record<string, (...a: unknown[]) => unknown> }).__d16
}

/** dateCourte n'est pas exportée : on exécute SON texte émis. */
function dateCourteEmise(): (v: unknown) => string | undefined {
  const ui = fichiersSysteme('XAF').get('systeme/ui.tsx') ?? ''
  const bloc = (nom: string) => {
    const i = ui.indexOf(`function ${nom}(`)
    return ui.slice(i, ui.indexOf('\n}\n', i) + 2)
  }
  const js = (bloc('jourLocal') + bloc('dateCourte')).replace(/: (?:string|unknown|Date) \| (?:null|undefined)|: unknown|: string/gu, '')
  return new Function(`${js}; return dateCourte`)() as (v: unknown) => string | undefined
}

describe('D16 — un jour saisi est le jour affiché', () => {
  it('le fuseau du test est bien UTC−5 (sinon ce fichier ne prouve rien)', () => {
    expect(new Date('2026-11-10').getDate(), 'la règle ECMAScript : minuit UTC').toBe(9)
  })

  it('① lireDate lit « 2026-11-01 » comme le 1er novembre local', async () => {
    const D = await donneesEmises()
    const d = D.lireDate('2026-11-01') as Date
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1])
    // un horodatage complet garde son sens
    expect((D.lireDate('2026-11-01T03:00:00Z') as Date).getDate()).toBe(31)
    expect(D.lireDate('pas une date')).toBeNull()
  }, 60_000)

  it('① parMois range le 1er du mois dans SON mois', async () => {
    const D = await donneesEmises()
    const auj = new Date()
    const premier = new Date(auj.getFullYear(), auj.getMonth(), 1).toLocaleDateString('sv-SE')
    const serie = D.parMois([{ date: premier }], 'date', 2) as { valeur: number }[]
    expect(serie.map((p) => p.valeur)).toEqual([0, 1])
  }, 60_000)

  it('① dateCourte : un jour reste ce jour, sans heure inventée', () => {
    const dateCourte = dateCourteEmise()
    expect(dateCourte('2026-11-10')).toBe(new Date(2026, 10, 10).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))
    expect(dateCourte(new Date().toLocaleDateString('sv-SE'))).toBe('aujourd’hui')
  })

  it('② le juge voit les deux formes mesurées', () => {
    const d = jugerDates(new Map([
      ['Gestion.tsx', 'function formaterDate(iso) { if (!iso) return ""; return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit" }); }'],
      ['Stock.tsx', 'const [date, setDate] = useState(new Date().toISOString().slice(0, 10))'],
      ['Tableau.tsx', 'const moisActuel = maintenant.toISOString().slice(0, 7)\nconst ok = mouvements.filter((m) => new Date(m.date).getMonth() === 3)'],
      ['Suivi.tsx', 'return mouvements.filter((m) => {\n  const d = new Date(m.date);\n  return d.getMonth() === maintenant.getMonth()\n})'],
    ]))
    expect(d.map((x) => `${x.fichier}:${x.forme}`).sort()).toEqual([
      'Gestion.tsx:jour-lu-en-utc',
      'Stock.tsx:jour-de-greenwich',
      'Suivi.tsx:jour-lu-en-utc',
      'Tableau.tsx:jour-de-greenwich',
      'Tableau.tsx:jour-lu-en-utc',
    ])
    const r = reprocheDates(d) ?? ''
    expect(r).toMatch(motifTexte('lireDate(v), exportée par ./systeme/donnees'))
    expect(r).toMatch(motifTexte('new Date().toLocaleDateString("sv-SE")'))
  })

  it('② il se tait sur les formes justes et sur la bibliothèque fournie', () => {
    expect(jugerDates(new Map([
      ['A.tsx', [
        'const t = new Date().toLocaleDateString("fr-FR")',
        'const m = new Date(a, mois - 1, 1).getMonth()',
        'const x = new Date(Date.now()).getDate()',
        'const j = lireDate(r.date)?.toLocaleDateString("fr-FR")',
        'const s = new Date(r.cree_le).getTime()',
        'const iso = new Date().toISOString()',
        'const debut = new Date(a, m, 1); debut.getMonth()',
        'const c = new Date(r.cree_le); const ms = c.getTime()',
      ].join('\n')],
      ['systeme/donnees.ts', 'const d = new Date(v).getMonth(); x.toISOString().slice(0, 10)'],
    ]))).toEqual([])
  })

  it('② SEULE la forme toISOString().slice(0, 10|7) est bloquante', () => {
    const d = jugerDates(new Map([
      ['A.tsx', [
        'const j = new Date().toISOString().slice(0, 10)',
        'const m = maintenant.toISOString().slice(0, 7)',
        'const s = new Date().toISOString().split("T")[0]',
        'const l = new Date(r.date).toLocaleDateString("fr-FR")',
      ].join('\n')],
    ]))
    expect(d.map((x) => `${x.forme}:${String(x.bloquant)}`)).toEqual([
      'jour-de-greenwich:true', 'jour-de-greenwich:true', 'jour-de-greenwich:false', 'jour-lu-en-utc:false',
    ])
    expect(reprocheDates(d) ?? '').toMatch(/\[BLOQUANT/u)
  })

  it('② la boucle REFUSE de livrer une œuvre qui garde la forme bloquante, et livre l’autre', async () => {
    const appli = (ligne: string) => `=== index.tsx ===\nexport const mois = () => ${ligne}`
    const refus = await boucleEcriture({
      demande: 'x',
      appeler: (async () => ({ texte: appli('new Date().toISOString().slice(0, 7)'), tronquee: false })) as never,
      juger: jugeMuet,
      toursMax: 2,
    })
    expect(refus.ok, 'une œuvre aux dates de Greenwich a été livrée').toBe(false)
    if (refus.ok) return
    expect(refus.raison).toBe('bloquant')
    expect(refus.motif).toMatch(/calculait encore ses dates à l’heure de Greenwich \(index\.tsx\)/u)
    let appels = 0
    const corrigee = await boucleEcriture({
      demande: 'x',
      appeler: (async () => {
        appels += 1
        return { texte: appli(appels === 1 ? 'new Date().toISOString().slice(0, 7)' : 'new Date().toLocaleDateString("sv-SE").slice(0, 7)'), tronquee: false }
      }) as never,
      juger: jugeMuet,
      toursMax: 3,
    })
    expect(corrigee.ok, corrigee.ok ? '' : corrigee.motif).toBe(true)
    expect(appels, 'le défaut n’a pas été renvoyé au modèle').toBe(2)
    // non bloquant : une lecture new Date(x) restante accompagne l'œuvre
    const accompagnee = await boucleEcriture({
      demande: 'x',
      appeler: (async () => ({ texte: appli('new Date(x.date).getMonth()'), tronquee: false })) as never,
      juger: jugeMuet,
      toursMax: 1,
    })
    expect(accompagnee.ok, accompagnee.ok ? '' : accompagnee.motif).toBe(true)
    if (accompagnee.ok) expect(accompagnee.dates.map((x) => x.bloquant)).toEqual([false])
  })

  it('③ la boucle reproche, la route le dit sur la carte', () => {
    const boucle = lireSource(join(__dirname, '..', 'boucle-directe.ts'))
    expect(boucle).toMatch(motifTexte('const quoiDates = reprocheDates(dates)'))
    expect(boucle).toMatch(motifTexte('if (quoiDates !== null) reproches.push(quoiDates)'))
    const route = lireSource(join(__dirname, '..', '..', '..', 'app', 'api', 'generateur', 'direct', 'route.ts'))
    expect(route).toMatch(motifTexte('date(s) qui peuvent s’afficher décalées d’un jour'))
  })
})

/**
 * LE MARCHÉ RÉEL : UTC+1 (Moundou, N'Djamena). Mesuré le 2026-11-16 sous
 * Africa/Ndjamena : new Date(a, m - 1, 1).toISOString().slice(0, 7) rend
 * « 2026-09 » pour octobre — en PERMANENCE, pas une heure par jour.
 */
describe('D16 — à UTC+1, le fuseau des utilisateurs de Deribfy', () => {
  const avant = process.env.TZ
  beforeAll(() => { process.env.TZ = 'Africa/Ndjamena' })
  afterAll(() => { process.env.TZ = avant })

  it('le fuseau du test est bien UTC+1 (sinon ce bloc ne prouve rien)', () => {
    expect(new Date(2026, 9, 1).getTimezoneOffset()).toBe(-60)
  })

  it('la forme bloquante y est FAUSSE toute la journée : le mois précédent tombe deux mois avant', () => {
    const maintenant = new Date(2026, 10, 16, 10, 0)
    expect(new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1).toISOString().slice(0, 7)).toBe('2026-09')
    // le remède proposé par le reproche, lui, est juste
    expect(new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1).toLocaleDateString('sv-SE').slice(0, 7)).toBe('2026-10')
    expect(jugerDates(new Map([['A.tsx', 'const moisPrec = new Date(a, m - 1, 1).toISOString().slice(0, 7)']]))[0]?.bloquant).toBe(true)
  })

  it('la bibliothèque y range chaque jour dans son mois et son jour', async () => {
    const D = await donneesEmises()
    const d = D.lireDate('2026-11-01') as Date
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 1])
    const auj = new Date()
    const premier = new Date(auj.getFullYear(), auj.getMonth(), 1).toLocaleDateString('sv-SE')
    expect((D.parMois([{ date: premier }], 'date', 2) as { valeur: number }[]).map((p) => p.valeur)).toEqual([0, 1])
    expect(dateCourteEmise()(new Date().toLocaleDateString('sv-SE'))).toBe('aujourd’hui')
  }, 60_000)
})
