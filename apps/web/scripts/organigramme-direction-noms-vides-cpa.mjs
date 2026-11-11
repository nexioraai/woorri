// CPA — page « Direction générale » : les `nom` de l'organigramme étaient des
// libellés de remplissage (« Direction générale » sous « Direction générale »,
// « Chef de service »…), pas des noms. On les VIDE sans retirer le champ : la
// case « nom » reste dans /edit, prête pour les vrais titulaires. La page
// Gouvernance n'est pas touchée. Sauvegarde des blocs d'avant en argument.
//
//   node --env-file=.env.local scripts/organigramme-direction-noms-vides-cpa.mjs <dossier-de-sauvegarde>
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'qui-sommes-nous/direction'
const SAUVEGARDE = process.argv[2]
if (!SAUVEGARDE) { console.error('Dossier de sauvegarde manquant.'); process.exit(2) }

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: page } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const idx = page.blocs.map((b, i) => (b.type === 'organigramme' ? i : -1)).filter((i) => i >= 0)
if (idx.length !== 1) { console.error(`🔴 ${idx.length} organigramme(s), attendu 1`); process.exit(1) }
writeFileSync(`${SAUVEGARDE}/direction-avant-noms.json`, JSON.stringify(page.blocs, null, 2))

const org = page.blocs[idx[0]]
const neuf = { ...org, items: org.items.map((it) => ({ ...it, nom: '' })) }
const blocs = page.blocs.map((b, i) => (i === idx[0] ? neuf : b))
const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
  .eq('site_id', site.id).eq('chemin', CHEMIN).select('blocs')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'aucune ligne'); process.exit(1) }
const relu = data[0].blocs
const autres = page.blocs.every((b, i) => i === idx[0] || JSON.stringify(relu[i]) === JSON.stringify(b))
const r = relu[idx[0]]
const seulsNoms = r.items.length === org.items.length && r.items.every((it, k) => it.nom === '' &&
  JSON.stringify({ ...it, nom: undefined }) === JSON.stringify({ ...org.items[k], nom: undefined }))
const ok = autres && seulsNoms && r.affichage === org.affichage
console.log(`${ok ? '🟢' : '🔴'} /${CHEMIN} : ${r.items.length} noms vidés ; seuls les noms ont changé : ${seulsNoms} ; autres blocs intacts : ${autres}`)
process.exit(ok ? 0 : 1)
