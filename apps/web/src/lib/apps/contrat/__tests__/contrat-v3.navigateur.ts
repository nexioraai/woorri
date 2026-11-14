// V3 · LES TREIZE ARCHÉTYPES RENDUS PAR LE MOTEUR, DANS CHROMIUM (0 $).
//
// Hors de la gate vitest (un vrai navigateur) : `vitest.navigateur.config.ts`,
// étape CI « juge navigateur ».
//
//   ① chaque archétype, rendu en 3 largeurs (360 compact, 720 moyen, 1024
//      étendu) × 2 directions (fr, ar) × 2 thèmes (clair, sombre) = 12
//      captures : AUCUN débordement horizontal, AUCUNE cible < 48 × 48 ;
//      `dir` suit la langue ;
//   ② l'état vide n'est JAMAIS affiché pendant l'attente (latence 700 ms,
//      échantillons toutes les 20 ms), et il l'est après ;
//   ③ les cinq états — attente, erreur (avec « Réessayer »), vide (avec son
//      appel à l'action), partiel (avec son bandeau), idéal — sont rendus par
//      le moteur sur chaque archétype qui lit une donnée ;
//   ④ le juge d'expérience traverse le témoin assemblé des treize archétypes :
//      aucun refus, langues appliquées, parcours accueil → offres → offre →
//      paiement → confirmation traversé.
// Les captures vont dans $CAPTURES_V3 (sinon un dossier temporaire).
// Rouge-puis-vert : une cible ramenée à 40 px → ① rouge ; l'état vide rendu
// pendant l'attente → ② rouge.
import { mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { assembler } from '../../bac-a-sable'
import { pageAutonome } from '../../boucle-directe'
import { jugerExperience } from '../../juge-experience'
import { ARCHETYPES, NOMS_ARCHETYPES } from '../archetypes'
import type { EtatSource } from '../rendu/donnees'
import { CTX, LANGUES, REMPLISSAGES, ROUTE_PAR_ARCHETYPE, fichiersTemoin } from './temoin-v3'

const R = join(__dirname, '..', 'rendu')
const MOTEUR = Object.fromEntries(['moteur.tsx', 'donnees.ts', 'textes-systeme.ts'].map((f) => [f, readFileSync(join(R, f), 'utf8')]))
const CAPTURES = process.env.CAPTURES_V3 ?? join(tmpdir(), 'deribfy-v3-captures')
const ADRESSE = 'https://temoin.deribfy.test/'
const AVEC_DONNEES = NOMS_ARCHETYPES.filter((a) => ARCHETYPES[a].donnees !== 'aucune')

async function html(o: { visiteurPartout?: boolean; etat?: EtatSource; latenceMs?: number }): Promise<string> {
  const v = await assembler(fichiersTemoin(MOTEUR, o))
  if (!v.ok) throw new Error(v.erreur)
  return pageAutonome(v.code, 'Témoin V3')
}

let navigateur: Browser
beforeAll(async () => { navigateur = await chromium.launch(); mkdirSync(CAPTURES, { recursive: true }) })
afterAll(async () => { await navigateur.close() })

async function ouvrir(document: string, largeur = 1024): Promise<Page> {
  const p = await navigateur.newPage({ viewport: { width: largeur, height: 900 } })
  await p.route('**/*', (r) => (r.request().url().startsWith(ADRESSE) ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: document }) : r.fulfill({ status: 404, body: '' })))
  return p
}
const aller = async (p: Page, route: string) => { await p.goto(`${ADRESSE}#${route}`); await p.waitForTimeout(120) }

const MESURER = `(() => {
  const w = window.innerWidth
  const debord = []
  if (document.documentElement.scrollWidth > w + 1) debord.push('page : ' + document.documentElement.scrollWidth + ' > ' + w)
  for (const el of document.querySelectorAll('#racine *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || st.display === 'none' || st.position === 'absolute' && r.width <= 1) continue
    if (r.right > w + 1 || r.left < -1) debord.push(el.tagName + ' « ' + (el.textContent || '').trim().slice(0, 30) + ' » ' + Math.round(r.left) + '…' + Math.round(r.right))
  }
  const petites = []
  for (const el of document.querySelectorAll('#racine button, #racine a[href], #racine input, #racine select, #racine textarea, #racine [role="button"]')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (r.width < 47.5 || r.height < 47.5) petites.push(el.tagName + ' « ' + (el.textContent || el.getAttribute('type') || '').trim().slice(0, 30) + ' » ' + Math.round(r.width) + '×' + Math.round(r.height))
  }
  return { debord, petites, dir: document.documentElement.dir, lang: document.documentElement.lang }
})()`

describe('V3 · les archétypes dans Chromium', () => {
  it('① 13 archétypes × 3 largeurs × 2 directions × 2 thèmes : aucun débordement, aucune cible < 48', async () => {
    const doc = await html({ visiteurPartout: true })
    const fautes: string[] = []
    let captures = 0
    for (const largeur of [360, 720, 1024]) {
      const p = await ouvrir(doc, largeur)
      for (const a of NOMS_ARCHETYPES) {
        await aller(p, ROUTE_PAR_ARCHETYPE[a]!)
        for (const l of [LANGUES[0]!, LANGUES[2]!]) {
          await p.evaluate((code) => { window.__deribfy?.langue(code) }, l.code)
          for (const theme of ['clair', 'sombre'] as const) {
            await p.evaluate((t) => { window.__deribfy?.theme(t) }, theme)
            await p.waitForTimeout(60)
            const m = (await p.evaluate(MESURER)) as { debord: string[]; petites: string[]; dir: string; lang: string }
            const ou = `${a} · ${String(largeur)} · ${l.code} · ${theme}`
            if (m.dir !== l.dir) fautes.push(`${ou} : dir="${m.dir}"`)
            for (const d of m.debord) fautes.push(`${ou} : débordement ${d}`)
            for (const c of m.petites) fautes.push(`${ou} : cible ${c}`)
            await p.screenshot({ path: join(CAPTURES, `${a}-${String(largeur)}-${l.code}-${theme}.png`), fullPage: true })
            captures += 1
          }
        }
      }
      await p.close()
    }
    process.stdout.write(`\n  ${String(captures)} captures → ${CAPTURES}\n`)
    expect(captures).toBe(NOMS_ARCHETYPES.length * 12)
    expect(fautes).toEqual([])
  }, 300_000)

  it('② l’état vide n’est jamais affiché pendant l’attente, et il l’est après', async () => {
    const doc = await html({ visiteurPartout: true, etat: 'vide', latenceMs: 700 })
    const fautes: string[] = []
    for (const a of AVEC_DONNEES) {
      const p = await ouvrir(doc)
      await p.goto(`${ADRESSE}#${ROUTE_PAR_ARCHETYPE[a]!}`)
      const echantillons = (await p.evaluate(`(async () => { const r = []; const t0 = performance.now(); while (performance.now() - t0 < 500) { r.push([!!document.querySelector('[data-etat="chargement"]'), !!document.querySelector('[data-etat="vide"]')]); await new Promise((f) => setTimeout(f, 20)) } return r })()`)) as [boolean, boolean][]
      await p.waitForTimeout(500)
      const apres = await p.evaluate(`!!document.querySelector('[data-etat="vide"]')`)
      if (!echantillons.some(([ch]) => ch)) fautes.push(`${a} : aucun squelette pendant l’attente`)
      if (echantillons.some(([, vide]) => vide)) fautes.push(`${a} : état vide affiché pendant l’attente (${String(echantillons.filter(([, v]) => v).length)} échantillon(s) sur ${String(echantillons.length)})`)
      if (apres !== true) fautes.push(`${a} : l’état vide n’est pas affiché après l’attente`)
      await p.close()
    }
    expect(fautes).toEqual([])
  }, 300_000)

  it('③ les cinq états, sur chaque archétype qui lit une donnée', async () => {
    const attendu: Record<EtatSource, string> = { attente: 'chargement', erreur: 'erreur', vide: 'vide', partiel: 'partiel', ideal: 'ideal' }
    const fautes: string[] = []
    for (const etat of ['attente', 'erreur', 'vide', 'partiel', 'ideal'] as const) {
      const doc = await html({ visiteurPartout: true, etat, ...(etat === 'attente' ? { latenceMs: 60_000 } : {}) })
      const p = await ouvrir(doc)
      for (const a of AVEC_DONNEES) {
        await aller(p, ROUTE_PAR_ARCHETYPE[a]!)
        await p.waitForTimeout(80)
        const r = (await p.evaluate(`(() => {
          const z = document.querySelector('[data-etat="${attendu[etat]}"]')
          return { present: !!z, bouton: !!(z && z.querySelector('button')), statut: !!(z && z.querySelector('[role="status"]')), vide: !!document.querySelector('[data-etat="vide"]') }
        })()`)) as { present: boolean; bouton: boolean; statut: boolean; vide: boolean }
        if (!r.present) fautes.push(`${a} · ${etat} : aucun [data-etat="${attendu[etat]}"]`)
        if (etat === 'erreur' && !r.bouton) fautes.push(`${a} · erreur : pas de « Réessayer »`)
        if (etat === 'vide' && !r.bouton) fautes.push(`${a} · vide : pas d’appel à l’action`)
        if (etat === 'partiel' && !r.statut) fautes.push(`${a} · partiel : pas de bandeau`)
        if (etat === 'attente' && r.vide) fautes.push(`${a} · attente : l’état vide est affiché`)
      }
      await p.close()
    }
    expect(fautes).toEqual([])
  }, 300_000)

  it('④ le juge d’expérience traverse le témoin des treize archétypes', async () => {
    const doc = await html({})
    const r = await jugerExperience(doc, {
      ecrans: REMPLISSAGES.map((x) => ({ nom: x.route, slug: x.route, role: x.acces === 'visiteur' ? '' : x.acces })),
      langues: LANGUES.map((l) => ({ code: l.code, dir: l.dir, libelles: [l.libelle] })),
      parcours: [...(CTX.parcours ?? [])],
      mode: 'application',
    })
    expect(r.aTourne, r.motif ?? '').toBe(true)
    process.stdout.write(`\n  juge : ${String(r.ecransOuverts)} écrans, ${String(r.controlesEssayes)} contrôles, ${String(r.refus.length)} refus\n`)
    expect(r.refus.map((x) => `${x.ecran} · ${x.controle} · ${x.quoi}`)).toEqual([])
    expect(r.langues.map((l) => `${l.code}:${String(l.ok)}:${l.dir}`)).toEqual(['fr:true:ltr', 'en:true:ltr', 'ar:true:rtl'])
    expect(r.parcours).toMatchObject({ ok: true })
    expect(r.ecransOuverts).toBe(REMPLISSAGES.length)
  }, 300_000)
})
