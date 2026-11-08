// Prouve le SUIVI d'une demande à l'adresse publique.
// Le coeur : les deux échecs — mauvaise référence, mauvais courriel — doivent
// rendre MOT POUR MOT la même chose. S'ils diffèrent d'un caractère, le suivi
// devient un moyen de savoir qu'une référence EXISTE, donc qu'un concurrent a
// écrit à la Centrale.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SUIVI = 'https://cpa-tchad.deribfy.app/api/demandes/suivi'
const PAGE = 'https://cpa-tchad.deribfy.app/demandes/suivi'
const EMAIL = 'temoin-suivi@essai.test'
const SECRET = 'TEXTE-SECRET-DU-DEMANDEUR-A-NE-JAMAIS-REAFFICHER'

let n = 0, ko = 0
const p = (t, a, o) => { n++; const k = String(a) === String(o); if (!k) ko++; console.log(`  ${k ? '🟢' : '🔴'} ${n}. ${t}`); if (!k) console.log(`       attendu « ${a} » · obtenu « ${o} »`) }
const demander = async (reference, email) => {
  const r = await fetch(SUIVI, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, email }),
  })
  return { statut: r.status, corps: await r.text() }
}

const { data: site } = await srv.from('sites').select('id,slug,name').like('slug','centrale-pharmaceutique%').maybeSingle()
const net = () => srv.from('messages').delete().eq('email', EMAIL)
await net()

console.log('① L’ÉTAT DE DÉPART')
const page0 = await fetch(PAGE, { cache: 'no-store' })
p('la page de suivi répond', 200, page0.status)
const html0 = await page0.text()
p('elle demande une référence', true, html0.includes('CPA-2026-XXXXXX'))
p('aucune demande pour ce courriel', 0, (await srv.from('messages').select('id').eq('email', EMAIL)).data?.length ?? '?')

console.log('② LA RÉFÉRENCE EST GÉNÉRÉE PAR LA BASE')
const { data: ref } = await srv.rpc('reference_demande', { nom_site: site.name })
p('elle a la forme attendue', true, /^CPA-\d{4}-[A-Z2-9]{6}$/.test(ref || ''))
console.log('     référence :', ref)
const { error: eI } = await srv.from('messages').insert({
  site_slug: site.slug, name: 'Témoin', email: EMAIL, message: SECRET, reference: ref,
}).select('id').single()
p('la demande témoin est posée', 'accordé', eI ? eI.code : 'accordé')

console.log('③ L’AUTEUR RETROUVE SA DEMANDE')
const ok = await demander(ref, EMAIL)
p('la route répond 200', 200, ok.statut)
p('elle dit « trouvé »', true, ok.corps.includes('"trouve":true'))
p('et rend l’état « recu »', true, ok.corps.includes('"etat":"recu"'))

console.log('④ BONNE RÉFÉRENCE, MAUVAIS COURRIEL')
const mauvaisMail = await demander(ref, 'intrus@essai.test')
p('la route répond 200 — pas 403', 200, mauvaisMail.statut)
p('elle ne dit rien de l’état', false, mauvaisMail.corps.includes('"etat"'))

console.log('⑤ MAUVAISE RÉFÉRENCE, BON COURRIEL')
const mauvaiseRef = await demander('CPA-2026-ZZZZZZ', EMAIL)
p('la route répond 200', 200, mauvaiseRef.statut)
p('🔑 MOT POUR MOT la même réponse que ④', mauvaisMail.corps, mauvaiseRef.corps)
p('et le même code', mauvaisMail.statut, mauvaiseRef.statut)

console.log('⑥ LE TEXTE DU DEMANDEUR NE SORT JAMAIS')
for (const [nom, r] of [['succès', ok], ['mauvais courriel', mauvaisMail], ['mauvaise référence', mauvaiseRef]])
  p(`absent de la réponse « ${nom} »`, false, r.corps.includes(SECRET))
p('absent du nom aussi', false, ok.corps.includes('Témoin'))

console.log('⑦ RETIRÉE, ELLE NE REND PLUS RIEN')
const { data: sup } = await net().select('reference')
p('suppression', 1, sup?.length ?? 0)
const apres = await demander(ref, EMAIL)
p('la référence ne rend plus rien', false, apres.corps.includes('"trouve":true'))
p('et la réponse est celle des deux échecs', mauvaisMail.corps, apres.corps)

console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${n - ko}/${n}`)
process.exit(ko === 0 ? 0 : 1)
