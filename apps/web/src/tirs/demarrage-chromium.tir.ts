/**
 * TIR · LES ŒUVRES LIVRÉES DÉMARRENT DANS CHROMIUM, AUX CONDITIONS DE L'ATELIER (étape 3b).
 *
 * GRATUIT : aucun modèle, aucune base. Deux œuvres réelles (`4b8b1d20`, pièces
 * auto ; `9cc16d10`, Hayine) sont rejouées à travers l'assembleur, la page est
 * reconstruite EXACTEMENT comme l'atelier la sert (`pageAutonome`, enveloppe
 * `try{ … }catch` comprise), chargée dans un cadre `sandbox="allow-scripts"`
 * par `srcdoc`, dans Chromium (outillage M12). On lit les erreurs de page et le
 * corps rendu.
 *
 * Avant l'étape 3b, les deux s'arrêtaient sur « Unexpected token 'export' ».
 *
 *   npx vitest run -c vitest.tir.config.ts src/tirs/demarrage-chromium.tir.ts
 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { racineDepot } from '@/lib/apps/racine'
import { assembler } from '@/lib/apps/bac-a-sable'
import { pageAutonome } from '@/lib/apps/boucle-directe'

const EVIDENCE = join(racineDepot(), 'docs', 'elite-protocol', 'evidence', 'generateur-2026-11-12')
const FIXTURES = join(racineDepot(), 'apps', 'web', 'src', 'lib', 'apps', '__tests__', 'fixtures')
const oeuvre = (id: string): ReadonlyMap<string, string> =>
  new Map(Object.entries(JSON.parse(gunzipSync(readFileSync(join(FIXTURES, `oeuvre-${id}.json.gz`))).toString('utf8')) as Record<string, string>))

type Mesure = { id: string; octets: number; erreurs: string[]; corps: string; ms: number }

describe('tir · les œuvres livrées démarrent dans Chromium, page servie comprise', () => {
  it(
    '4b8b1d20 et 9cc16d10 : zéro erreur de page, un corps rendu',
    async () => {
      const navigateur = await chromium.launch()
      const mesures: Mesure[] = []
      try {
        for (const id of ['4b8b1d20', '9cc16d10']) {
          const v = await assembler(oeuvre(id))
          if (!v.ok) { mesures.push({ id, octets: 0, erreurs: [`inassemblable : ${v.erreur.slice(0, 160)}`], corps: '', ms: 0 }); continue }
          const page = pageAutonome(v.code, 'Votre application', undefined, 'apercu')
          const debut = Date.now()
          const p = await navigateur.newPage({ viewport: { width: 1280, height: 900 } })
          const erreurs: string[] = []
          p.on('pageerror', (e) => erreurs.push(String(e.message).slice(0, 200)))
          await p.setContent('<!doctype html><iframe id="c" sandbox="allow-scripts" style="width:1200px;height:800px"></iframe>')
          // La page est passée EN ARGUMENT, jamais dans un script inline : son
          // `</script>` fermerait l'hôte (erreur d'instrument mesurée le 2026-11-13).
          await p.evaluate((html) => { (document.getElementById('c') as HTMLIFrameElement).srcdoc = html }, page)
          await p.waitForTimeout(3000)
          const cadre = p.frames()[1]
          const corps = cadre ? (await cadre.locator('body').innerText().catch(() => '(illisible)')).replace(/\s+/gu, ' ').slice(0, 200) : '(pas de cadre)'
          mesures.push({ id, octets: v.code.length, erreurs, corps, ms: Date.now() - debut })
          await p.close()
        }
      } finally {
        await navigateur.close()
      }
      mkdirSync(join(EVIDENCE, 'sortie'), { recursive: true })
      writeFileSync(join(EVIDENCE, 'sortie', 'etape3-chromium.json'), JSON.stringify({ quand: new Date().toISOString(), mesures }, null, 1) + '\n')
      for (const m of mesures) process.stdout.write(`\n  ${m.id} · ${String(m.octets)} o · ${String(m.ms)} ms · ${String(m.erreurs.length)} erreur(s)${m.erreurs.map((e) => `\n    ✗ ${e}`).join('')}\n    « ${m.corps.slice(0, 120)} »\n`)
      // ① L'INSTRUMENT a tourné : un cadre rendu pour chaque œuvre.
      expect(mesures.map((m) => m.corps)).not.toContain('(pas de cadre)')
      // ② LES ŒUVRES : aucune erreur de page, et pas l'écran d'arrêt.
      expect(mesures.map((m) => `${m.id} → ${m.erreurs.join(' | ')}`).filter((x) => !x.endsWith('→ '))).toEqual([])
      for (const m of mesures) expect(m.corps, `${m.id} affiche l'écran d'arrêt`).not.toMatch(/s'est arr[eê]t[ée]e/u)
      for (const m of mesures) expect(m.corps.length, `${m.id} n'a rien rendu`).toBeGreaterThan(20)
    },
    180_000,
  )
})
