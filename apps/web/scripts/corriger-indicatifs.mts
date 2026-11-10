// LOT 20 (suite) — les sites DÉJÀ générés avec un « +1 » faux, corrigés par la
// MÊME logique que le moteur (src/lib/telephone.ts) : l'indicatif suit le pays
// de l'adresse ; pays inconnu → pas d'indicatif, jamais « +1 ».
// Liste FERMÉE, demandée par le propriétaire le 2026-11-10. Relit après écriture.
//
// Lancer depuis apps/web :   npx tsx scripts/corriger-indicatifs.mts
// Sans écrire (aperçu) :     npx tsx scripts/corriger-indicatifs.mts --apercu
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { indicatifDuPays, corrigerIndicatif } from '../src/lib/telephone.ts'

const apercu = process.argv.includes('--apercu')
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const CIBLES = [
  'elegance-tchadienne-1789804877516', 'designmoi-1785591694300', 'ymvi-1785874663338',
  'almounawwara-1791658116586', 'almnwra-llthy-1791658627888', 'almnwra-1791657892456',
]

const { data } = await a.from('sites').select('id,slug,contact,area_served').in('slug', CIBLES)
for (const s of data ?? []) {
  const avant: string = s.contact?.phone ?? ''
  const ind = indicatifDuPays(`${s.contact?.address ?? ''} ${s.area_served ?? ''}`)
  let apres = corrigerIndicatif(avant, ind)
  if (/^\s*\+1(?!\d)/.test(apres)) apres = ind ? apres.replace(/^\s*\+1/, ind) : apres.replace(/^\s*\+1[\s.-]*/, '')
  if (apercu) { console.log(`${s.slug.padEnd(36)} | pays → ${ind ?? 'inconnu'} | « ${avant} » → « ${apres} »`); continue }
  const { error } = await a.from('sites').update({ contact: { ...s.contact, phone: apres } }).eq('id', s.id)
  const { data: relu } = await a.from('sites').select('contact').eq('id', s.id).single()
  console.log(`${s.slug.padEnd(36)} | pays → ${ind ?? 'inconnu'} | avant « ${avant} » | après « ${relu?.contact?.phone} »${error ? ' | ERREUR ' + error.message : ''}`)
}
