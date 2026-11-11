// CPA — l'ENCRE DE MARQUE (2026-11-11) : le bleu du site remplace le noir du
// thème (menu, titres, carte mise en avant, pied de page). Le blanc ne bouge
// pas. Déclarée par une page NON PUBLIÉE `couleur-de-marque` (jamais servie).
// Pour revenir au noir d'avant : supprimer cette page.
//
//   node --env-file=.env.local scripts/encre-de-marque-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'couleur-de-marque'
const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const ligne = { titre: 'Couleur de marque', chapeau: 'Réglage : la couleur du site remplace le noir du thème. Supprimer cette page pour revenir au noir.', blocs: [], menu: false, publie: false, maj_le: new Date().toISOString() }
const { error } = deja
  ? await srv.from('site_pages').update(ligne).eq('id', deja.id)
  : await srv.from('site_pages').insert({ ...ligne, site_id: site.id, chemin: CHEMIN, parent: null, ordre: 99 })
console.log(error ? `🔴 ${error.message}` : `🟢 /${CHEMIN} ${deja ? 'mise à jour' : 'créée'} (non publiée)`)
process.exit(error ? 1 : 0)
