// CPA — le hero de l'ACCUEIL devient le « parcours » en photos (choix du
// propriétaire, 2026-11-11) : achat → chargement → acheminement → déchargement
// → distribution. Contenu repris de la page d'essai validée ; les deux pages
// d'essai sont ensuite dépubliées (elles ne servaient qu'à la démonstration).
//
//   node --env-file=.env.local scripts/accueil-parcours-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()

const { data: essai } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', 'essai-parcours').maybeSingle()
const bloc = essai?.blocs?.[0]
if (!bloc || bloc.type !== 'etapes' || bloc.affichage !== 'parcours' || bloc.items?.length !== 5) { console.error('🔴 contenu du parcours introuvable ou inattendu'); process.exit(1) }

const { data, error } = await srv.from('site_pages').update({ blocs: [bloc], publie: true, maj_le: new Date().toISOString() })
  .eq('site_id', site.id).eq('chemin', 'accueil-hero').select('publie,blocs')
if (error || !data?.length) { console.error('🔴', error?.message ?? 'page accueil-hero absente'); process.exit(1) }
console.log(`🟢 accueil-hero : parcours (${data[0].blocs[0].items.length} étapes), publiée : ${data[0].publie}`)

for (const chemin of ['essai-assemblage', 'essai-parcours']) {
  const { error: e } = await srv.from('site_pages').update({ publie: false, maj_le: new Date().toISOString() }).eq('site_id', site.id).eq('chemin', chemin)
  console.log(e ? `🔴 ${chemin} : ${e.message}` : `🟢 ${chemin} dépubliée`)
}
