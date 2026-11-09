// LOT 11 — OUVRIR LES COMPTES, POUR LA CPA ET POUR ELLE SEULE.
//
// La colonne est `default false` : les 41 autres sites ne bougent pas. Ce
// script DIT combien de sites sont ouverts avant et après — un script qui
// annonce « fait » sans compter ne prouve rien.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SLUG = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'

const avant = await srv.from('sites').select('slug').eq('ouvre_des_comptes', true)
console.log('sites ouverts AVANT :', avant.data?.length ?? 0, avant.data?.map((s) => s.slug) ?? [])

const { error } = await srv.from('sites').update({ ouvre_des_comptes: true }).eq('slug', SLUG)
if (error) { console.error('écriture refusée', error); process.exit(1) }

// ON RELIT. Une écriture annoncée n'est pas une écriture vérifiée.
const apres = await srv.from('sites').select('slug').eq('ouvre_des_comptes', true)
const ouverts = apres.data ?? []
console.log('sites ouverts APRÈS :', ouverts.length, ouverts.map((s) => s.slug))

const ok = ouverts.length === 1 && ouverts[0].slug === SLUG
console.log(ok ? '🟢 la CPA, et elle seule.' : '🔴 périmètre inattendu.')
process.exit(ok ? 0 : 1)
