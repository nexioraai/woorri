/**
 * RELEVÉ DE BASE DU ROUTAGE — l'état AVANT, sans lequel l'après ne prouve rien.
 * Usage : node scripts/releve-routage.mjs [avant|apres]
 */
import { clientAdmin } from './temoin-en-base.mjs'
import { writeFileSync, readFileSync } from 'node:fs'
const MODE = process.argv[2] ?? 'avant'
const ORIGINE = 'https://www.deribfy.com'
const CHEMINS = ['', '/blog', '/appels-offres', '/qui-sommes-nous', '/activites', '/fournisseurs', '/nimportequoi-inexistant']
const sb = clientAdmin('.')
const { data } = await sb.from('sites').select('slug').eq('published', true).is('archived_at', null)
const releve = {}
for (const s of data ?? []) {
  for (const c of CHEMINS) {
    const url = `${ORIGINE}/sites/${s.slug}${c}`
    let code, titre
    try {
      const r = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } })
      code = r.status
      const h = r.ok ? await r.text() : ''
      titre = (h.match(/<title>([^<]*)<\/title>/) ?? [, ''])[1].slice(0, 60)
    } catch { code = 0; titre = 'INJOIGNABLE' }
    releve[`${s.slug}${c || '/'}`] = { code, titre }
  }
  process.stdout.write('.')
}
const f = `/tmp/routage-${MODE}.json`
writeFileSync(f, JSON.stringify(releve, null, 1))
console.log(`\n\n  ${Object.keys(releve).length} relevés · ${f}`)
const par = {}
for (const v of Object.values(releve)) par[v.code] = (par[v.code] ?? 0) + 1
console.log(`  codes : ${Object.entries(par).map(([k, v]) => `${k} → ${v}`).join('  ·  ')}`)
if (MODE === 'apres') {
  const av = JSON.parse(readFileSync('/tmp/routage-avant.json', 'utf8'))
  const ecarts = Object.keys(av).filter((k) => av[k].code !== releve[k]?.code || av[k].titre !== releve[k]?.titre)
  console.log(`\n  ÉCARTS : ${ecarts.length}`)
  for (const k of ecarts.slice(0, 20)) console.log(`    ${k}  ${av[k].code} → ${releve[k]?.code}`)
  process.exit(ecarts.length ? 1 : 0)
}
