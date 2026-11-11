// CPA — l'organigramme sur la page « Direction générale » (demande de la CPA,
// 2026-11-11). On AJOUTE, on ne remplace rien : copie du bloc organigramme de
// /qui-sommes-nous/gouvernance (qui garde le sien), insérée après la liste des
// responsabilités. Idempotent : si la page a déjà un organigramme, rien.
// Sauvegarde des blocs d'avant dans le dossier passé en argument.
//
//   node --env-file=.env.local scripts/organigramme-direction-cpa.mjs <dossier-de-sauvegarde>
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SAUVEGARDE = process.argv[2]
if (!SAUVEGARDE) { console.error('Dossier de sauvegarde manquant.'); process.exit(2) }

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const lire = async (chemin) => (await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()).data
const gouv = await lire('qui-sommes-nous/gouvernance')
const dir = await lire('qui-sommes-nous/direction')
if (!gouv || !dir) { console.error('🔴 page absente'); process.exit(1) }

const source = gouv.blocs.filter((b) => b.type === 'organigramme')
if (source.length !== 1) { console.error(`🔴 ${source.length} organigramme(s) sur Gouvernance, attendu 1`); process.exit(1) }
if (dir.blocs.some((b) => b.type === 'organigramme')) { console.log('🟢 la page Direction a déjà un organigramme : rien à faire'); process.exit(0) }

// Point d'insertion : juste après la PREMIÈRE liste (les responsabilités).
const iListe = dir.blocs.findIndex((b) => b.type === 'liste')
if (iListe !== 1) { console.error(`🔴 structure inattendue : première liste à l'index ${iListe}, attendu 1`); process.exit(1) }

writeFileSync(`${SAUVEGARDE}/direction-avant.json`, JSON.stringify(dir.blocs, null, 2))
const bloc = { ...structuredClone(source[0]), titre: 'Organigramme de la Centrale' }
const blocs = [...dir.blocs.slice(0, iListe + 1), bloc, ...dir.blocs.slice(iListe + 1)]

const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
  .eq('site_id', site.id).eq('chemin', 'qui-sommes-nous/direction').select('blocs')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'aucune ligne'); process.exit(1) }
const relu = data[0].blocs
const intacts = dir.blocs.every((b) => relu.some((r) => JSON.stringify(r) === JSON.stringify(b)))
const ok = relu.length === dir.blocs.length + 1 && intacts && JSON.stringify(relu[iListe + 1]) === JSON.stringify(bloc)
console.log(`${ok ? '🟢' : '🔴'} /qui-sommes-nous/direction : ${dir.blocs.length} → ${relu.length} blocs ; anciens intacts : ${intacts} ; organigramme en position ${iListe + 1} avec ${bloc.items.length} boîtes`)
process.exit(ok ? 0 : 1)
