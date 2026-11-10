// LOT 16 — ALLUMER L'ASSISTANT POUR LA CPA, ET DIRE LA VÉRITÉ SUR /confidentialite.
//
// La page disait qu'aucune donnée ne sortait du site. Avec l'assistant,
// la question d'un visiteur part chez DeepSeek : on l'écrit AVANT d'allumer.
import { readFileSync } from 'node:fs'
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) { const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l); if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'') }
const { createClient } = await import('@supabase/supabase-js')
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const { data: site } = await srv.from('sites').select('id').eq('slug','centrale-pharmaceutique-d-achats-cpa-1793979506814').single()

const BLOC = { type: 'encadre', ton: 'info', titre: 'L’assistant du site',
  texte: "Si vous utilisez l'assistant (la bulle en bas à droite), votre question est transmise au service d'intelligence artificielle DeepSeek pour être traitée, avec des extraits des pages publiques de ce site. Nous ne conservons pas votre question. Nous gardons seulement, pendant 24 heures, une empreinte anonyme de votre connexion pour limiter le nombre de questions. N'écrivez pas d'informations personnelles dans l'assistant." }

const { data: page, error: e1 } = await srv.from('site_pages').select('id,blocs').eq('site_id', site.id).eq('chemin','confidentialite').maybeSingle()
if (e1 || !page) { console.error('🔴 page /confidentialite introuvable — l’assistant N’EST PAS allumé'); process.exit(1) }
const blocs = Array.isArray(page.blocs) ? page.blocs : []
const suivants = blocs.some(b => b?.titre === BLOC.titre) ? blocs.map(b => b?.titre === BLOC.titre ? BLOC : b) : [...blocs, BLOC]
const { error: e2 } = await srv.from('site_pages').update({ blocs: suivants }).eq('id', page.id)
if (e2) { console.error('🔴 écriture refusée — l’assistant N’EST PAS allumé', e2.message); process.exit(1) }
const { data: relu } = await srv.from('site_pages').select('blocs').eq('id', page.id).single()
const ok = (relu.blocs ?? []).some(b => b?.titre === BLOC.titre)
console.log(ok ? '🟢 /confidentialite dit désormais que la question part chez DeepSeek' : '🔴 bloc absent après relecture')
if (!ok) process.exit(1)

// SEULEMENT ENSUITE, l'interrupteur — et pour ce site seul.
await srv.from('sites').update({ assistant_actif: true }).eq('id', site.id)
const { data: actifs } = await srv.from('sites').select('slug').eq('assistant_actif', true)
console.log(actifs.length === 1 ? `🟢 assistant allumé pour la CPA, et elle seule` : `🔴 ${actifs.length} sites allumés`)
