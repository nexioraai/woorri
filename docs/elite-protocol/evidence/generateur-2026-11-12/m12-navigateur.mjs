// M12 (navigateur) — les pages de m12-syntaxe-export.mts chargées COMME L'ATELIER :
// un cadre `sandbox="allow-scripts"` dont le `srcdoc` reçoit la page EN ARGUMENT
// (jamais dans un script inline : le `</script>` de la page fermerait l'hôte —
// erreur d'instrument mesurée le 2026-11-13, corrigée ici). Chromium et WebKit.
// Chaque erreur est ramenée à la ligne de la page et à sa région rolldown.
//   node <ce fichier> <dossier-de-travail>      (depuis la racine du dépôt)
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, webkit } from 'playwright'

const ICI = dirname(fileURLToPath(import.meta.url))
const DOSSIER = process.argv[2]
if (!DOSSIER) throw new Error('dossier de travail requis')
const region = (lignes, n) => { for (let k = n - 1; k >= 0; k--) { const m = lignes[k].match(/^\/\/#region (.+)$/u); if (m) return m[1] } return '(hors région)' }
const sortie = []
for (const [nom, moteur] of [['chromium', chromium], ['webkit', webkit]]) {
  const br = await moteur.launch()
  for (const id of ['4b8b1d20', 'f29323f6', '44ca6bbe']) {
    const page = readFileSync(join(DOSSIER, `page-${id}.html`), 'utf8'); const lignes = page.split('\n')
    const p = await br.newPage({ viewport: { width: 1280, height: 900 } })
    const erreurs = []
    p.on('pageerror', (e) => erreurs.push({ message: String(e.message).slice(0, 200), pile: String(e.stack ?? '').split('\n').slice(0, 2).join(' ') }))
    await p.setContent('<!doctype html><iframe id="c" sandbox="allow-scripts" style="width:1200px;height:800px"></iframe>')
    await p.evaluate((html) => { document.getElementById('c').srcdoc = html }, page)
    await p.waitForTimeout(3000)
    const cadre = p.frames()[1]
    const corps = cadre ? (await cadre.locator('body').innerText().catch(() => '(illisible)')).replace(/\s+/g, ' ').slice(0, 140) : '(pas de cadre)'
    const situees = erreurs.map((e) => { const n = Number((`${e.message} ${e.pile}`.match(/srcdoc:(\d+):(\d+)/) || [])[1]); return { ...e, ligne: n || null, region: n ? region(lignes, n) : null, code: n ? (lignes[n - 1] || '').trim().slice(0, 100) : null } })
    sortie.push({ navigateur: nom, id, erreurs: situees, corps })
    console.log(`${nom} · ${id} · ${situees.length} erreur(s) · « ${corps.slice(0, 80)} »`, situees.map((e) => ` → ${e.message}${e.ligne ? ` (page l.${e.ligne}, ${e.region} : ${e.code})` : ''}`).join(''))
    await p.close()
  }
  await br.close()
}
writeFileSync(join(ICI, 'sortie', 'm12-navigateur.json'), JSON.stringify({ sortie }, null, 1) + '\n')
