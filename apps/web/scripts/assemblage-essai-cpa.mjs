// CPA — page d'ESSAI du hero « assemblage » (2026-11-11), hors menu : le
// colis CPA qui se construit au défilement, comme les sites « produit »
// premium. L'accueil n'est touché qu'après validation du propriétaire.
//
//   node --env-file=.env.local scripts/assemblage-essai-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'essai-assemblage'
const img = (n) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/cpa/assemblage/${n}.webp`

const blocs = [{
  type: 'etapes', affichage: 'assemblage', titre: 'Du magasin au centre de santé',
  items: [
    { libelle: 'Acheter', titre: 'Acheter au juste prix', image: img('1-carton'),
      texte: 'La Centrale consolide les besoins des structures et met les fournisseurs en concurrence, en toute transparence.' },
    { libelle: 'Contrôler', titre: 'Contrôler chaque lot', image: img('2-boites'),
      texte: 'Aucun produit ne rejoint les magasins sans avoir été contrôlé et documenté.' },
    { libelle: 'Conserver', titre: 'Conserver dans les règles', image: img('3-plaquette'),
      texte: 'Chaque produit est conservé dans les conditions qu’il exige, jusqu’à sa sortie.' },
    { libelle: 'Froid', titre: 'Tenir la chaîne du froid', image: img('4-froid'),
      texte: 'Les vaccins et produits sensibles voyagent sous température surveillée.' },
    { libelle: 'Préparer', titre: 'Préparer la livraison', image: img('5-ferme'),
      texte: 'La commande est comptée, scellée et prête à partir.' },
    { libelle: 'Livrer', titre: 'Livrer la santé', image: img('6-camion'),
      texte: 'Jusqu’aux structures sanitaires du pays, y compris les plus éloignées.' },
  ],
}]

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const ligne = { titre: 'Essai — l’assemblage', chapeau: 'Page d’essai, hors menu, avant validation.', blocs, menu: false, publie: true, maj_le: new Date().toISOString() }
const { error } = deja
  ? await srv.from('site_pages').update(ligne).eq('id', deja.id)
  : await srv.from('site_pages').insert({ ...ligne, site_id: site.id, chemin: CHEMIN, parent: null, ordre: 98 })
console.log(error ? `🔴 ${error.message}` : `🟢 /${CHEMIN} ${deja ? 'mise à jour' : 'créée'}`)
process.exit(error ? 1 : 0)
