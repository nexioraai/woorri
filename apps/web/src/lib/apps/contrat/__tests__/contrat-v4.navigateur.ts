// V4 · BLOC 2 — L'APPLICATION HAYINE ASSEMBLÉE, DANS CHROMIUM (0 $).
//
// Hors de la gate vitest (un vrai navigateur) : `vitest.navigateur.config.ts`,
// étape CI « juge navigateur ».
//
//   ① la lecture Hayine réelle (5b1c20bc), générée de bout en bout avec le
//      modèle simulé, est TRAVERSÉE par le juge d'expérience dans Chromium :
//      aucun refus, les trois langues appliquées (ar en rtl), le parcours lu
//      traversé, chaque écran ouvert ;
//   ③ le juge d'exécution de la ROUTE (simulateur happy-dom, plafond
//      PLAFOND_EXPERIENCE_MS) monte la même application et la traverse : 0
//      erreur, 0 refus, trois langues, le parcours — mesuré 32 s, d'où sa
//      place ici et non dans la gate (marge des tests) ;
//   ② le bandeau d'aperçu suit la langue : français au départ, arabe et rtl
//      après le choix de l'arabe — une seule version visible, sa ponctuation
//      dans le bon sens ; aucun débordement à 360 px.
// Rouge-puis-vert : le bandeau sans sa règle de style → ② rouge.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'
import { pageAutonome } from '../../boucle-directe'
import { jugerExperience } from '../../juge-experience'
import type { EntiteDeclaree } from '../../entites-declarees'
import { genererApplication } from '../generation'
import type { LectureGraphe } from '../graphe'
import type { TableLue } from '../validateur'
import { modeleSimule, planSimule } from './modele-simule-v4'

const J = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'lectures-v2.json'), 'utf8')) as { lectures: Record<string, { lecture: LectureGraphe; tables: TableLue[] }> }
const CAHIER = readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'cahier-9ee1ca86.txt'), 'utf8')
const PLAN_94 = JSON.parse(readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'plan-94cf0489.json'), 'utf8')) as { ecrans: { nom: string; role: string; navigation: string; tables: { lit: string[]; ecrit: string[] } }[] }
const ADRESSE = 'https://hayine.deribfy.test/'

async function hayine(o: { jugeReel?: boolean } = {}) {
  const { lecture, tables } = J.lectures['5b1c20bc']!
  const entites: EntiteDeclaree[] = tables.map((t) => ({ id: `ent_${t.nom}`, name: t.nom, fields: t.colonnes.map((c) => ({ id: `fld_${c}`, name: c, type: 'string', required: false })) }))
  const plan = { ECRANS: PLAN_94.ecrans.map((e) => ({ nom: e.nom, role: e.role, navigation: e.navigation, lit: e.tables.lit, ecrit: e.tables.ecrit, extrait: '' })) }
  const r = await genererApplication({
    demande: CAHIER, nom: 'Hayine', lecture: { ecrans: lecture.ecrans, roles: lecture.roles, parcours: lecture.parcours ?? [], langues: lecture.langues ?? [], devises: [], moyensPaiement: [], pays: [] },
    entites, devise: 'XAF', appelerModele: modeleSimule().appeler, appelerLeger: planSimule(plan).appeler, prix: { entree: 1.32, sortie: 3.96 },
    ...(o.jugeReel === true ? {} : { juger: () => Promise.resolve({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 }) }),
  })
  if (!r.ok || r.code === null) throw new Error(r.motif ?? 'non assemblée')
  return { r, html: pageAutonome(r.code, 'Hayine', undefined, 'apercu', null, r.languesPage) }
}

let navigateur: Browser
beforeAll(async () => { navigateur = await chromium.launch() })
afterAll(async () => { await navigateur.close() })

describe('V4 · l’application Hayine assemblée, dans Chromium', () => {
  it('① le juge d’expérience la traverse : aucun refus, trois langues, le parcours', async () => {
    const { r, html } = await hayine()
    const ecrans = (r.spec.ecrans as unknown as { route: string; acces: string }[]).map((e) => ({ nom: e.route, slug: e.route, role: e.acces === 'visiteur' ? '' : e.acces }))
    const v = await jugerExperience(html, { ecrans, langues: r.app.langues.map((l) => ({ code: l.code, dir: l.dir, libelles: [l.libelle] })), parcours: [...r.graphe.parcours], mode: 'application' })
    expect(v.aTourne, v.motif ?? '').toBe(true)
    process.stdout.write(`\n  juge Chromium : ${String(v.ecransOuverts)} écrans, ${String(v.controlesEssayes)} contrôles, ${String(v.refus.length)} refus\n`)
    expect(v.refus.map((x) => `${x.ecran} · ${x.controle} · ${x.quoi}`)).toEqual([])
    expect(v.langues.map((l) => `${l.code}:${String(l.ok)}:${l.dir}`)).toEqual(['fr:true:ltr', 'en:true:ltr', 'ar:true:rtl'])
    expect(v.parcours).toMatchObject({ ok: true })
    expect(v.ecransOuverts).toBe(ecrans.length)
  }, 300_000)

  it('④ l’accueil d’un rôle : ses cartes, sans la gestion ; la garde UNE fois sur le parcours', async () => {
    const { r, html } = await hayine()
    const p = await navigateur.newPage({ viewport: { width: 390, height: 844 } })
    await p.route('**/*', (x) => (x.request().url().startsWith(ADRESSE) ? x.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : x.fulfill({ status: 404, body: '' })))
    const cartes = () => p.evaluate(() => [...document.querySelectorAll('main [role="button"]')].map((e) => (e.textContent ?? '').trim()))
    await p.goto(`${ADRESSE}#accueil`); await p.waitForTimeout(200)
    const visiteur = await cartes()
    expect(visiteur).toContain('Gestion')
    // Le parcours lu : la garde n'apparaît qu'une fois.
    const gardes: string[] = []
    for (const route of r.graphe.parcours) {
      await p.evaluate((x) => { window.location.hash = x }, route); await p.waitForTimeout(150)
      if (await p.evaluate(() => !!document.querySelector('[data-deribfy="garde"]'))) { gardes.push(route); await p.click('[data-deribfy="garde"] [data-role] button'); await p.waitForTimeout(100) }
    }
    expect(gardes).toHaveLength(1)
    // Revenu à l'accueil avec le rôle choisi : ses cartes et les publiques, sans « Gestion » (réservée au gestionnaire).
    await p.evaluate(() => { window.location.hash = 'accueil' }); await p.waitForTimeout(150)
    const connecte = await cartes()
    const role = (r.spec.ecrans as unknown as { route: string; acces: string }[]).find((e) => e.route === gardes[0])!.acces
    const attendues = (r.spec.ecrans as unknown as { route: string; acces: string }[]).filter((e) => r.couverture.lus > 0 && r.ecrans.some((l) => l.route === e.route && l.choix !== 'deribfy') && (e.acces === 'visiteur' || e.acces === role)).map((e) => String(r.remplissages[e.route]!.slots.titre))
    expect(connecte).not.toContain('Gestion')
    expect(connecte.length).toBe(attendues.length)
    await p.close()
  }, 120_000)

  it('③ le juge d’exécution de la route monte Hayine et la traverse dans le simulateur', async () => {
    const { r } = await hayine({ jugeReel: true })
    const x = r.execution
    expect(x?.indisponible, String(x?.indisponible)).toBeUndefined()
    expect(x?.monteDansSimulateur, JSON.stringify(x?.erreurs)).toBe(true)
    expect(x?.erreurs ?? []).toEqual([])
    expect(x?.experience?.erreur).toBeUndefined()
    expect((x?.experience?.refus ?? []).map((y) => `${y.ecran} · ${y.controle} · ${y.quoi}`)).toEqual([])
    process.stdout.write(`\n  juge du simulateur : ${String(x?.ms ?? 0)} ms\n`)
  }, 300_000)

  it('② le bandeau d’aperçu suit la langue et la droite-à-gauche', async () => {
    const { html } = await hayine()
    const p = await navigateur.newPage({ viewport: { width: 360, height: 800 } })
    await p.route('**/*', (x) => (x.request().url().startsWith(ADRESSE) ? x.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : x.fulfill({ status: 404, body: '' })))
    await p.goto(ADRESSE)
    await p.waitForTimeout(200)
    const lire = () => p.evaluate(() => {
      const vis = [...document.querySelectorAll('[data-bandeau-langue]')].filter((e) => getComputedStyle(e).display !== 'none')
      return { html: [document.documentElement.lang, document.documentElement.dir], visibles: vis.map((e) => [e.getAttribute('lang'), e.getAttribute('dir'), getComputedStyle(e).direction]), deborde: document.documentElement.scrollWidth > window.innerWidth + 1 }
    })
    expect(await lire()).toEqual({ html: ['fr', 'ltr'], visibles: [['fr', 'ltr', 'ltr']], deborde: false })
    await p.click('[data-langue="ar"]')
    await p.waitForTimeout(100)
    expect(await lire()).toEqual({ html: ['ar', 'rtl'], visibles: [['ar', 'rtl', 'rtl']], deborde: false })
    await p.click('[data-langue="en"]')
    await p.waitForTimeout(100)
    expect(await lire()).toEqual({ html: ['en', 'ltr'], visibles: [['en', 'ltr', 'ltr']], deborde: false })
    await p.close()
  }, 120_000)
})
