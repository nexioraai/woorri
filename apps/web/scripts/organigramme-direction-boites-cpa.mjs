// CPA — l'organigramme de la page « Direction générale » passe en affichage
// « boîtes » (schéma haut-bas relié, comme demandé le 2026-11-11). Ne touche
// QUE le champ `affichage` de ce bloc ; Gouvernance garde l'arbre replié.
//
//   node --env-file=.env.local scripts/organigramme-direction-boites-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'qui-sommes-nous/direction'

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: page } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const idx = page.blocs.map((b, i) => (b.type === 'organigramme' ? i : -1)).filter((i) => i >= 0)
if (idx.length !== 1) { console.error(`🔴 ${idx.length} organigramme(s) sur la page, attendu 1`); process.exit(1) }
if (page.blocs[idx[0]].affichage === 'boites') { console.log('🟢 déjà en boîtes : rien à faire'); process.exit(0) }

const blocs = page.blocs.map((b, i) => (i === idx[0] ? { ...b, affichage: 'boites' } : b))
const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
  .eq('site_id', site.id).eq('chemin', CHEMIN).select('blocs')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'aucune ligne'); process.exit(1) }
const relu = data[0].blocs
const autres = page.blocs.every((b, i) => i === idx[0] || JSON.stringify(relu[i]) === JSON.stringify(b))
const { affichage, ...reste } = relu[idx[0]]
const memeContenu = JSON.stringify(reste) === JSON.stringify(page.blocs[idx[0]])
const ok = relu.length === page.blocs.length && autres && memeContenu && affichage === 'boites'
console.log(`${ok ? '🟢' : '🔴'} /${CHEMIN} : affichage=${affichage} ; autres blocs intacts : ${autres} ; contenu de l'organigramme intact : ${memeContenu}`)
process.exit(ok ? 0 : 1)
