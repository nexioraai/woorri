// LOT 15.7 — LES PARTENAIRES DE LA CENTRALE.
//
// Arbitrage du propriétaire, 2026-11-09 : « oui bien sûr il a de partenaires,
// mais il faut les mettre les fictifs aussi, et puis ils vont edit modifier
// depuis edit ». Ces noms sont donc des PLACEHOLDERS crédibles, pas une
// affirmation : chacun est remplaçable depuis `/edit`, logo compris.
//
// LE SIGLE EST ÉCRIT ENTRE PARENTHÈSES. `monogrammeDe()` le préfère aux
// initiales calculées — et sans logo c'est lui qui occupe la tuile.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// LES VARIABLES SE LISENT ICI, PAS DANS LE SHELL. `.env.local` contient des
// clés avec des caractères que zsh interprète : `source` en exportait deux de
// travers et le script tournait avec une identité incomplète.
for (const l of readFileSync(new URL('../.env.local', import.meta.url), 'utf-8').split('\n')) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PARTENAIRES = [
  { nom: "Ministère de la Santé publique et de la Prévention" },
  { nom: "Organisation mondiale de la santé (OMS)" },
  { nom: "Fonds des Nations unies pour l'enfance (UNICEF)" },
  { nom: "Fonds mondial de lutte contre le sida, la tuberculose et le paludisme" },
  { nom: "Agence des États-Unis pour le développement international (USAID)" },
  { nom: "Fonds des Nations unies pour la population (UNFPA)" },
  { nom: "Agence française de développement (AFD)" },
  { nom: "Banque mondiale" },
  { nom: "Union européenne" },
]

const BLOC = {
  type: 'partenaires',
  titre: 'Ils travaillent avec la Centrale',
  items: PARTENAIRES,
}

const CHEMIN = 'qui-sommes-nous'

// LE SLUG N'EST PAS LE SOUS-DOMAINE. L'adresse publique est
// `cpa-tchad.deribfy.app` ; le slug en base est celui que le générateur a
// forgé à la création. Supposer le premier aurait écrit sur rien — et le
// script aurait dit « site introuvable » sans que personne sache pourquoi.
const SLUG = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'
const { data: site, error: eSite } = await srv
  .from('sites').select('id').eq('slug', SLUG).maybeSingle()
if (eSite || !site) { console.error('site introuvable', eSite); process.exit(1) }

const { data: page, error: ePage } = await srv
  .from('site_pages').select('id,blocs').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
if (ePage || !page) { console.error('page introuvable', CHEMIN, ePage); process.exit(1) }

const blocs = Array.isArray(page.blocs) ? page.blocs : []

// ON AJOUTE, ON NE REMPLACE PAS — et on ne pose pas deux fois. Rejouer le
// script doit donner le même état, pas deux bandeaux.
const dejaLa = blocs.some((b) => b && b.type === 'partenaires')
const suivants = dejaLa
  ? blocs.map((b) => (b && b.type === 'partenaires' ? BLOC : b))
  : [...blocs, BLOC]

const { error: eMaj } = await srv
  .from('site_pages').update({ blocs: suivants }).eq('id', page.id)
if (eMaj) { console.error('écriture refusée', eMaj); process.exit(1) }

// GEN-D053 — ON RELIT, ET ON COMPTE CE QUI COMPTE. `jsonb` réordonne les
// clés : comparer deux `JSON.stringify` donnerait un faux rouge sur une
// écriture réussie. On vérifie le NOMBRE de blocs et la présence du type.
const { data: relu } = await srv
  .from('site_pages').select('blocs').eq('id', page.id).maybeSingle()
const apres = Array.isArray(relu?.blocs) ? relu.blocs : []
const bandeau = apres.find((b) => b && b.type === 'partenaires')
console.log('blocs avant :', blocs.length, '— après :', apres.length)
console.log('bandeau posé :', !!bandeau, '— partenaires :', bandeau?.items?.length ?? 0)
if (!bandeau || bandeau.items?.length !== PARTENAIRES.length) process.exit(1)
