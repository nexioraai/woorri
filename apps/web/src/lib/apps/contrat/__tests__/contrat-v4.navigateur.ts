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

  it('④ l’accueil par espace : le visiteur choisit son espace, le rôle voit les siens ; la garde UNE fois', async () => {
    const { r, html } = await hayine()
    const p = await navigateur.newPage({ viewport: { width: 1280, height: 900 } })
    await p.route('**/*', (x) => (x.request().url().startsWith(ADRESSE) ? x.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : x.fulfill({ status: 404, body: '' })))
    const cartes = () => p.evaluate(() => [...document.querySelectorAll('main [role="button"]')].map((e) => (e.textContent ?? '').trim()))
    const menu = () => p.evaluate(() => [...document.querySelectorAll('nav[aria-label="Navigation"] button')].map((e) => e.getAttribute('title') ?? ''))
    const ecrans = r.spec.ecrans as unknown as { route: string; acces: string; titre: unknown }[]
    const lus = ecrans.filter((e) => r.ecrans.some((l) => l.route === e.route && l.choix !== 'deribfy'))
    const gestion = ecrans.find((e) => e.route === 'gestion')!
    const roles = [...new Set([...lus.map((e) => e.acces), gestion.acces].filter((a) => a !== 'visiteur'))]
    await p.goto(`${ADRESSE}#accueil`); await p.waitForTimeout(200)
    // Le visiteur : une carte par espace, ses écrans publics (≤ 3), RIEN de réservé, pas « Gestion ».
    const visiteur = await cartes()
    expect(visiteur.filter((t) => t.startsWith('Espace ')).sort()).toEqual(roles.map((x) => `Espace ${x}`).sort())
    expect(visiteur).not.toContain('Gestion')
    expect(visiteur.length).toBe(roles.length + Math.min(3, lus.filter((e) => e.acces === 'visiteur').length))
    expect((await menu()).length).toBeLessThanOrEqual(7 + 1)
    // Le parcours lu : la garde n'apparaît qu'une fois.
    const gardes: string[] = []
    for (const route of r.graphe.parcours) {
      await p.evaluate((x) => { window.location.hash = x }, route); await p.waitForTimeout(150)
      if (await p.evaluate(() => !!document.querySelector('[data-deribfy="garde"]'))) { gardes.push(route); await p.click('[data-deribfy="garde"] [data-role] button'); await p.waitForTimeout(100) }
    }
    expect(gardes).toHaveLength(1)
    // Revenu à l'accueil avec le rôle choisi : SES raccourcis (six au plus), plus d'espaces, pas « Gestion ».
    await p.evaluate(() => { window.location.hash = 'accueil' }); await p.waitForTimeout(150)
    const connecte = await cartes()
    const role = ecrans.find((e) => e.route === gardes[0])!.acces
    expect(connecte.filter((t) => t.startsWith('Espace '))).toEqual([])
    expect(connecte).not.toContain('Gestion')
    expect(connecte.length).toBe(Math.min(6, lus.filter((e) => e.acces === role).length + (gestion.acces === role ? 1 : 0)))
    // Le menu : aucun écran d'un autre rôle, sept entrées au plus (plus le compte).
    const autres = new Set(ecrans.filter((e) => e.acces !== 'visiteur' && e.acces !== role).map((e) => e.route))
    const titresAutres = lus.filter((e) => autres.has(e.route)).map((e) => String(r.remplissages[e.route]!.slots.titre))
    const m = await menu()
    expect(m.length).toBeLessThanOrEqual(7 + 1)
    for (const t of titresAutres) if (!lus.some((e) => e.acces === role && String(r.remplissages[e.route]!.slots.titre) === t)) expect(m).not.toContain(t)
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
    // Les langues se choisissent dans le Compte (V4.3f) : le bandeau, lui, suit la page entière.
    await p.goto(`${ADRESSE}#compte`)
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

  it('⑤ les médias : une vraie photo, un document et la position, saisis, enregistrés, MONTRÉS', async () => {
    // Une application de relevés : la table dit photo / vidéo / reçu / position — la règle de Deribfy pose les saisies.
    const colonnes = ['index', 'photo', 'video', 'recu', 'position_gps']
    const plan = { ECRANS: [{ nom: 'relevé', role: 'agent', navigation: 'public', lit: ['releve'], ecrit: ['releve'], extrait: '' }] }
    const r = await genererApplication({
      demande: 'Les agents photographient le compteur et joignent le reçu.', nom: 'Relevés',
      lecture: { ecrans: ['relevé'], roles: ['agent'], parcours: [], langues: [], devises: [], moyensPaiement: [], pays: [] },
      entites: [{ id: 'ent_releve', name: 'releve', fields: colonnes.map((c) => ({ id: `fld_${c}`, name: c, type: 'string', required: false })) }],
      devise: null, appelerModele: modeleSimule().appeler, appelerLeger: planSimule(plan).appeler, prix: { entree: 1.32, sortie: 3.96 },
      juger: () => Promise.resolve({ monteDansSimulateur: true, erreurs: [], octetsRendus: 1, texte: '', ms: 0 }),
    })
    expect(r.ok, r.motif ?? '').toBe(true)
    const html = pageAutonome(r.code!, 'Relevés', undefined, 'apercu', null, r.languesPage)
    const contexte = await navigateur.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 12.1348, longitude: 15.0557 } })
    const p = await contexte.newPage()
    await p.route('**/*', (x) => (x.request().url().startsWith(ADRESSE) ? x.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : x.fulfill({ status: 404, body: '' })))
    // Une VRAIE photo de 2 000 × 1 500 px, dessinée puis encodée en PNG.
    await p.goto(`${ADRESSE}#releve-creer`); await p.waitForTimeout(250)
    const png = Buffer.from((await p.evaluate(() => { const t = document.createElement('canvas'); t.width = 2000; t.height = 1500; const g = t.getContext('2d')!; g.fillStyle = '#2a6'; g.fillRect(0, 0, 2000, 1500); g.fillStyle = '#fff'; g.fillRect(400, 300, 1200, 900); return t.toDataURL('image/png') })).split(',')[1]!, 'base64')
    if (await p.$('[data-deribfy="garde"] [data-role] button')) { await p.click('[data-deribfy="garde"] [data-role] button'); await p.waitForTimeout(150) }
    // Les saisies posées par la règle : photo (appareil + galerie), vidéo, fichier, position.
    expect(await p.$$eval('[data-nature]', (xs) => xs.map((x) => x.getAttribute('data-nature')))).toEqual(['photo', 'video', 'fichier', 'localisation'])
    const photo = p.locator('[data-nature="photo"] input[type="file"]')
    expect(await photo.first().getAttribute('capture')).toBe('environment')
    expect(await photo.first().getAttribute('accept')).toBe('image/*')
    await photo.first().setInputFiles({ name: 'compteur.png', mimeType: 'image/png', buffer: png })
    // T1 : la prise ATTEND « Reprendre » ou « Valider » — rien n'entre dans le formulaire avant.
    await p.waitForSelector('[data-nature="photo"] [data-attente="oui"] img[data-media="image"]')
    expect(await p.$$eval('[data-nature="photo"] [data-attente="oui"] label, [data-nature="photo"] [data-attente="oui"] button', (xs) => xs.map((x) => (x.textContent ?? '').trim()))).toEqual(['Reprendre', 'Valider'])
    await p.locator('[data-nature="photo"] [data-attente="oui"] input[type="file"]').setInputFiles({ name: 'compteur-2.png', mimeType: 'image/png', buffer: png })
    await p.waitForSelector('[data-nature="photo"] [data-attente="oui"] img[data-media="image"]')
    await p.getByRole('button', { name: 'Valider' }).click()
    await p.waitForSelector('[data-nature="photo"] img[data-media="image"]')
    expect(await p.$$('[data-nature="photo"] [data-attente]')).toHaveLength(0)
    // Réduite au téléphone avant l'envoi : 1 600 px au plus.
    await p.waitForFunction(() => ((document.querySelector('[data-nature="photo"] img[data-media="image"]') as HTMLImageElement | null)?.naturalWidth ?? 0) > 0)
    expect(await p.$eval('[data-nature="photo"] img[data-media="image"]', (x) => Math.max((x as HTMLImageElement).naturalWidth, (x as HTMLImageElement).naturalHeight))).toBe(1600)
    await p.locator('[data-nature="fichier"] input[type="file"]').setInputFiles({ name: 'recu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') })
    await p.waitForSelector('[data-nature="fichier"] [data-media="fichier"]')
    await p.getByRole('button', { name: 'Utiliser ma position' }).click(); await p.waitForTimeout(300)
    expect(await p.inputValue('[data-nature="localisation"] input')).toBe('12.134800, 15.055700')
    // Enregistrer : la liste MONTRE la photo et le document.
    await p.locator('main button').filter({ hasText: /Enregistrer|Ajouter|Créer|Valider/u }).first().click(); await p.waitForTimeout(200)
    await p.evaluate(() => { window.location.hash = 'releve-liste' }); await p.waitForTimeout(300)
    expect(await p.$$eval('main img[data-media="image"]', (xs) => xs.filter((x) => (x as HTMLImageElement).naturalWidth > 0).length)).toBe(1)
    expect(await p.$$('main [data-media="fichier"]')).toHaveLength(1)
    await contexte.close()
  }, 120_000)
})
