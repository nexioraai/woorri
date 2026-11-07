// Sonde LOT 4 — le corps structuré, mesuré en base et par la vue publique.
// Chaque point dit son ATTENDU et son OBTENU. Un témoin jetable est posé puis
// retiré, et son retrait est VÉRIFIÉ : une sonde qui laisse sa trace salit la
// base qu'elle mesure.
import { createClient } from '@supabase/supabase-js'
const U = process.env.NEXT_PUBLIC_SUPABASE_URL
const srv = createClient(U, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ano = createClient(U, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

let n = 0, ko = 0
const p = (titre, attendu, obtenu) => {
  n++; const ok = attendu === obtenu; if (!ok) ko++
  console.log(`  ${ok ? '🟢' : '🔴'} ${n}. ${titre}`)
  if (!ok) console.log(`       attendu « ${attendu} » · obtenu « ${obtenu} »`)
}
const code = (e) => (e ? e.code || 'erreur' : 'accordé')

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
if (!site) { console.log('🔴 site CPA introuvable'); process.exit(1) }
const CH = 'temoin-jetable-blocs'
await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)

console.log('\nA. LE VOCABULAIRE EST TENU PAR LA BASE')
const pose = (blocs) => srv.from('site_pages')
  .insert([{ site_id: site.id, chemin: CH, titre: 'Témoin', ordre: 0, menu: false, publie: true, blocs }])
  .select('id')
for (const t of ['titre', 'frise', 'chiffres', 'tableau', 'documents', 'questions']) {
  const { error } = await pose([{ type: t, texte: 'x' }])
  p(`un bloc « ${t} » est ACCEPTÉ`, 'accordé', code(error))
  await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
}
for (const [t, quoi] of [['script', 'type inconnu'], ['iframe', 'autre type inconnu']]) {
  const { error } = await pose([{ type: t }])
  p(`${quoi} « ${t} » → REFUSÉ`, '23514', code(error))
  await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
}
p('un bloc sans « type » → REFUSÉ', '23514', code((await pose([{ texte: 'x' }])).error))
await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
p('un objet au lieu d’un tableau → REFUSÉ', '23514', code((await pose({ type: 'texte' })).error))
await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
p('121 blocs → REFUSÉ (plafond 120)', '23514',
  code((await pose(Array.from({ length: 121 }, () => ({ type: 'texte', texte: 'x' })))).error))
await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)
p('un corps de 300 Ko → REFUSÉ (plafond 200 Ko)', '23514',
  code((await pose([{ type: 'texte', texte: 'x'.repeat(300000) }])).error))
await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH)

console.log('\nB. LA VUE PUBLIQUE REND LES BLOCS, ET RIEN DE PLUS')
const { error: eP } = await pose([{ type: 'chiffres', items: [{ valeur: '1 200', libelle: 'références' }] }])
p('le témoin est posé', 'accordé', code(eP))
const { data: vu, error: eV } = await ano.from('site_pages_public').select('chemin,blocs').eq('chemin', CH).maybeSingle()
p('anon LIT la colonne blocs par la vue', 'accordé', code(eV))
p('et il y retrouve la valeur posée', '1 200', vu?.blocs?.[0]?.items?.[0]?.valeur ?? 'absent')
p('anon ÉCRIT sur la vue → refusé', '55000', code((await ano.from('site_pages_public').update({ blocs: [] }).eq('chemin', CH)).error))
p('anon ÉCRIT sur la table → refusé', '42501', code((await ano.from('site_pages').update({ blocs: [] }).eq('chemin', CH)).error))
p('anon LIT la table → refusé', '42501', code((await ano.from('site_pages').select('blocs').limit(1)).error))

console.log('\nC. LE TÉMOIN EST RETIRÉ, ET LE RETRAIT EST VÉRIFIÉ')
const { error: eD } = await srv.from('site_pages').delete().eq('site_id', site.id).eq('chemin', CH).select('id')
p('suppression du témoin', 'accordé', code(eD))
const reste = await ano.from('site_pages_public').select('chemin').eq('chemin', CH)
p('plus aucune trace par la vue publique', reste.error ? `erreur ${reste.error.code}` : '0', String(reste.data?.length ?? 'lecture ratée'))

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
