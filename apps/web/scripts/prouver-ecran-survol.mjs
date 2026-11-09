// LOT 15.13 — PROUVE QUE LE SURVOL CHANGE QUELQUE CHOSE, DANS UN VRAI
// NAVIGATEUR.
//
// POURQUOI PAS LA FEUILLE DE STYLE. Vérifier que la règle est DANS la page
// ne dit pas qu'elle s'APPLIQUE : un sélecteur qui ne correspond à rien est
// servi exactement comme un sélecteur qui fonctionne. On survole, et on
// compare les styles CALCULÉS avant et après.
import { chromium } from 'playwright'

const BASE = process.env.SONDE_BASE ?? 'https://cpa-tchad.deribfy.app'
const ATTENDU = process.argv[2] ?? null

const PAGES = ['', '/qui-sommes-nous', '/activites', '/catalogue', '/appels-offres', '/contact']

let n = 0, ko = 0
const p = (t, ok, detail = '') => {
  n++; if (!ok) ko++
  console.log(`  ${ok ? '🟢' : '🔴'} ${n}. ${t}${detail ? `\n       ${detail}` : ''}`)
}

if (ATTENDU) {
  const r = await fetch(`${BASE}/api/version`, { cache: 'no-store' }).catch(() => null)
  const servi = r ? (await r.json().catch(() => ({}))).commit : null
  const court = Math.min(String(servi ?? '').length, ATTENDU.length, 12)
  if (!servi || court < 7 || String(servi).slice(0, court) !== ATTENDU.slice(0, court)) {
    console.log(`⏳ servi « ${servi} », attendu « ${ATTENDU} » — on ne mesure pas un ancien déploiement.`)
    process.exit(2)
  }
}

const nav = await chromium.launch()

for (const chemin of PAGES) {
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 } })
  const r = await page.goto(BASE + chemin, { waitUntil: 'networkidle' }).catch(() => null)
  if (!r || r.status() >= 400) {
    console.log(`\n── ${chemin || '/'} — ${r ? r.status() : 'injoignable'}, ignorée`)
    await page.close(); continue
  }
  console.log(`\n── ${chemin || '/'}`)

  // On prend les surfaces CLIQUABLES visibles, pas tous les liens : c'est
  // d'elles que le propriétaire parle (« chaque bouton »).
  const cibles = await page.$$('a[class*="rounded"], button[class*="rounded"], a[style*="border-radius"], button[style*="border-radius"]')
  const visibles = []
  for (const c of cibles) {
    if (await c.isVisible().catch(() => false)) visibles.push(c)
    if (visibles.length >= 6) break
  }

  p(`${chemin || '/'} — des surfaces cliquables à mesurer`, visibles.length > 0,
    `${visibles.length} trouvée(s)`)
  if (visibles.length === 0) { await page.close(); continue }

  let bouges = 0
  for (const c of visibles) {
    const avant = await c.evaluate((e) => {
      const s = getComputedStyle(e)
      return s.transform + '|' + s.boxShadow + '|' + s.backgroundColor + '|' + s.color
    })
    // ON AMÈNE L'ÉLÉMENT DANS L'ÉCRAN AVANT DE POSER LE CURSEUR.
    //
    // Premier jet : `hover({ force: true })`. `force` saute les vérifications
    // d'actionnabilité — donc aussi la mise à vue : le curseur se posait hors
    // de l'écran et `:hover` ne se déclenchait pas. Une surface sur quatre
    // était déclarée immobile alors que son balisage était identique aux
    // trois autres. Le rouge venait de l'instrument, pas du code.
    await c.scrollIntoViewIfNeeded().catch(() => {})
    await c.hover().catch(() => {})
    await page.waitForTimeout(420)
    const apres = await c.evaluate((e) => {
      const s = getComputedStyle(e)
      return s.transform + '|' + s.boxShadow + '|' + s.backgroundColor + '|' + s.color
    })
    if (avant !== apres) bouges++
  }
  p(`${chemin || '/'} — le survol change le rendu de CHACUNE`, bouges === visibles.length,
    `${bouges}/${visibles.length} ont bougé`)

  // LE CLAVIER DOIT VOIR LA MÊME CHOSE. Un effet réservé à la souris laisse
  // qui tabule sans aucun repère.
  // ON TABULE POUR DE VRAI.
  //
  // Premier jet : `e.focus()` par script. Chromium ne déclenche PAS
  // `:focus-visible` sur un focus programmatique — il le réserve aux
  // interactions clavier. Le test rougissait donc sur un code correct, et le
  // rouge venait de l'instrument. On appuie sur Tab, comme un humain.
  await page.keyboard.press('Tab')
  let liseré = false
  for (let i = 0; i < 25 && !liseré; i++) {
    liseré = await page.evaluate(() => {
      const e = document.activeElement
      if (!e || e === document.body) return false
      const s = getComputedStyle(e)
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
    })
    if (!liseré) await page.keyboard.press('Tab')
  }
  p(`${chemin || '/'} — le clavier reçoit un liseré visible`, liseré === true)

  await page.close()
}

await nav.close()
console.log(`\n${n - ko}/${n}${ko ? ` — ${ko} ROUGE(S)` : ''}`)
process.exit(ko ? 1 : 0)
