// LE JUGE D'EXPÉRIENCE, CÔTÉ NAVIGATEUR — processus enfant (Chromium).
// Entrée : { page, args, script } ; sortie : le verdict, ou { erreur }.
// La page est chargée EXACTEMENT comme l'atelier la sert : un cadre
// `sandbox="allow-scripts"` dont le `srcdoc` la reçoit EN ARGUMENT (jamais
// dans un script inline : son `</script>` fermerait l'hôte). Aucun réseau
// réel : toute requête sortante reçoit un refus local.
import { readFileSync, writeFileSync } from 'node:fs'

const [, , cheminEntree, cheminSortie] = process.argv
const { page, args, script } = JSON.parse(readFileSync(cheminEntree, 'utf8'))
let navigateur = null
try {
  const { chromium } = await import('playwright')
  navigateur = await chromium.launch()
  // La LARGEUR du cadre (téléphone 390, bureau 1 280) : absente, celle d'avant (1 200 dans 1 280).
  const largeur = typeof args.largeur === 'number' ? args.largeur : 1200
  const p = await navigateur.newPage({ viewport: { width: Math.max(1280, largeur + 80), height: 900 } })
  await p.route('**/*', (r) => {
    const u = r.request().url()
    if (u.startsWith('about:') || u.startsWith('data:')) return r.continue()
    return r.fulfill({ status: 404, headers: { 'content-type': 'application/json' }, body: '{}' })
  })
  await p.setContent(`<!doctype html><meta charset="utf-8"><body><iframe id="cadre" sandbox="allow-scripts" style="width:${String(largeur)}px;height:860px"></iframe></body>`)
  await p.evaluate((html) => { document.getElementById('cadre').srcdoc = html }, page)
  await p.waitForTimeout(3000)
  const cadre = p.frames()[1]
  if (!cadre) throw new Error('le cadre de l’application ne s’est pas ouvert')
  const verdict = await cadre.evaluate(`(${script})(${JSON.stringify(args)})`)
  writeFileSync(cheminSortie, JSON.stringify(verdict))
} catch (e) {
  writeFileSync(cheminSortie, JSON.stringify({ erreur: String(e && e.message || e).slice(0, 300) }))
} finally {
  if (navigateur !== null) await navigateur.close().catch(() => undefined)
}
