// LOT 12.1 — PROUVE QUE LE SEAU DES DOCUMENTS EST VRAIMENT PRIVÉ.
//
// POURQUOI UN TÉMOIN. Interroger une adresse INEXISTANTE rend 400 dans les
// DEUX seaux — le privé comme le public. Une sonde qui ne distingue pas ne
// prouve rien : il faut un objet qui EXISTE, et comparer.
//
// LE TÉMOIN EST POSÉ PUIS RETIRÉ, dans les deux seaux, quoi qu'il arrive.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const URL_SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL
const srv = createClient(URL_SUPA, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const CLE = `temoins/sonde-${Date.now().toString(36)}.csv`
const CORPS = new Blob(['temoin,de,sonde\n'], { type: 'text/csv' })

let n = 0, ko = 0
const p = (t, ok, d = '') => { n++; if (!ok) ko++; console.log(`  ${ok ? '🟢' : '🔴'} ${n}. ${t}${d ? `\n       ${d}` : ''}`) }
const publique = (seau) => `${URL_SUPA}/storage/v1/object/public/${seau}/${CLE}`

try {
  for (const seau of ['comptes-documents', 'site-fichiers']) {
    const { error } = await srv.storage.from(seau).upload(CLE, CORPS, { contentType: 'text/csv', upsert: true })
    if (error) { p(`témoin posé dans ${seau}`, false, error.message); continue }
  }

  const prive = await fetch(publique('comptes-documents'))
  const pub = await fetch(publique('site-fichiers'))

  // LE TÉMOIN DU SEAU PUBLIC DOIT ÊTRE LISIBLE. Sans lui, un 400 des deux
  // côtés voudrait seulement dire que la sonde s'est trompée d'adresse.
  p('le seau PUBLIC sert bien son témoin (la sonde vise juste)', pub.status === 200,
    `site-fichiers -> ${pub.status}`)

  p('le seau PRIVÉ REFUSE la lecture publique du MÊME objet', prive.status !== 200,
    `comptes-documents -> ${prive.status}`)

  // ET LE LIEN SIGNÉ, LUI, DOIT MARCHER : un seau qu'on ne peut pas lire du
  // tout ne protège rien, il casse.
  const { data: signe } = await srv.storage.from('comptes-documents').createSignedUrl(CLE, 60)
  const parLien = signe?.signedUrl ? await fetch(signe.signedUrl) : null
  p('le lien SIGNÉ ouvre le même objet', parLien?.status === 200, `signé -> ${parLien?.status}`)
} finally {
  for (const seau of ['comptes-documents', 'site-fichiers']) {
    await srv.storage.from(seau).remove([CLE])
  }
  // ON VÉRIFIE LE RETRAIT. Laisser un témoin derrière soi, c'est salir ce
  // qu'on prétend mesurer.
  const { data: reste } = await srv.storage.from('comptes-documents').list('temoins')
  p('le témoin est retiré', !(reste ?? []).some((o) => CLE.endsWith(o.name)))
}

console.log(`\n${n - ko}/${n}${ko ? ` — ${ko} ROUGE(S)` : ''}`)
process.exit(ko ? 1 : 0)
