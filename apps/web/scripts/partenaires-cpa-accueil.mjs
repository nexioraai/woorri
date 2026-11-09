// LOT 15.13 — LES PARTENAIRES PASSENT DU BLOC DE SOUS-PAGE À L'ACCUEIL.
//
// Le lot 15.5 les avait posés au bas de `/qui-sommes-nous`. Mesuré à l'écran
// par le propriétaire : personne ne descend une sous-page pour les voir. Ils
// deviennent une section de l'accueil, juste avant Contact.
//
// ON DÉPLACE, ON NE DUPLIQUE PAS : le bloc de sous-page est retiré dans la
// même exécution. Les laisser aux deux endroits ferait deux listes qui
// divergeraient au premier changement.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const SLUG = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'

const { data: site } = await srv.from('sites').select('id,partenaires').eq('slug', SLUG).maybeSingle()
if (!site) { console.error('site introuvable'); process.exit(1) }

const { data: page } = await srv.from('site_pages')
  .select('id,blocs').eq('site_id', site.id).eq('chemin', 'qui-sommes-nous').maybeSingle()
const blocs = Array.isArray(page?.blocs) ? page.blocs : []
const bloc = blocs.find((b) => b && b.type === 'partenaires')

// LA SOURCE EST LE BLOC S'IL EXISTE ENCORE, sinon ce qui est déjà en colonne.
// Rejouer le script ne doit pas vider la colonne parce que le bloc est parti.
const items = Array.isArray(bloc?.items) && bloc.items.length
  ? bloc.items
  : (Array.isArray(site.partenaires) ? site.partenaires : [])

console.log('avant — bloc de sous-page :', bloc ? `${bloc.items?.length ?? 0} partenaire(s)` : 'absent')
console.log('avant — colonne du site   :', (site.partenaires ?? []).length, 'partenaire(s)')
if (items.length === 0) { console.error('🔴 rien à déplacer'); process.exit(1) }

const { error: e1 } = await srv.from('sites').update({ partenaires: items }).eq('id', site.id)
if (e1) { console.error('écriture de la colonne refusée', e1); process.exit(1) }

if (bloc) {
  const sansBloc = blocs.filter((b) => !(b && b.type === 'partenaires'))
  const { error: e2 } = await srv.from('site_pages').update({ blocs: sansBloc }).eq('id', page.id)
  if (e2) { console.error('retrait du bloc refusé', e2); process.exit(1) }
}

// ON RELIT LES DEUX CÔTÉS. Une écriture annoncée n'est pas une écriture
// vérifiée — et ici il faut prouver le DÉPLACEMENT, donc l'arrivée ET le
// départ. Compter seulement l'arrivée laisserait un doublon invisible.
const { data: apres } = await srv.from('sites').select('partenaires').eq('id', site.id).maybeSingle()
const { data: pageApres } = await srv.from('site_pages').select('blocs').eq('id', page.id).maybeSingle()
const blocApres = (pageApres?.blocs ?? []).some((b) => b && b.type === 'partenaires')

console.log('après — colonne du site   :', (apres?.partenaires ?? []).length, 'partenaire(s)')
console.log('après — bloc de sous-page :', blocApres ? '🔴 TOUJOURS LÀ' : 'retiré')
const ok = (apres?.partenaires ?? []).length === items.length && !blocApres
console.log(ok ? '🟢 déplacé, et à un seul endroit.' : '🔴 état inattendu.')
process.exit(ok ? 0 : 1)
