// CPA — le hero « vitrine » de l'ACCUEIL (2026-11-11). Il est déclaré par
// cette page, hors menu : l'accueil l'affiche à la place du hero d'avant.
// Pour revenir au hero d'avant : dépublier ou supprimer cette page (ou changer
// l'affichage du bloc). Tout se modifie dans /edit : textes, images, bouton.
//
//   node --env-file=.env.local scripts/accueil-hero-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'accueil-hero'
const img = (n) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/cpa/assemblage/${n}.webp`

const blocs = [{
  type: 'etapes', affichage: 'vitrine', titre: 'Du magasin au centre de santé',
  bouton: 'Découvrir nos activités', lien: 'activites',
  badge: "CENTRALE PHARMACEUTIQUE D'ACHATS • TCHAD • ",
  items: [
    { libelle: 'Acheter', titre: 'Acheter au juste prix', image: img('1-carton'),
      texte: 'La Centrale consolide les besoins des structures et met les fournisseurs en concurrence, en toute transparence.' },
    { libelle: 'Contrôler', titre: 'Contrôler chaque lot', image: img('2-boites'),
      texte: 'Aucun produit ne rejoint les magasins sans avoir été contrôlé et documenté.' },
    { libelle: 'Conserver', titre: 'Conserver dans les règles', image: img('3-plaquette'),
      texte: 'Chaque produit est conservé dans les conditions qu’il exige, jusqu’à sa sortie.' },
    { libelle: 'Le froid', titre: 'Tenir la chaîne du froid', image: img('4-froid'),
      texte: 'Les vaccins et produits sensibles voyagent sous température surveillée.' },
    { libelle: 'Préparer', titre: 'Préparer la livraison', image: img('5-ferme'),
      texte: 'La commande est comptée, scellée et prête à partir.' },
    { libelle: 'Livrer', titre: 'Livrer la santé', image: img('6-camion'),
      texte: 'Jusqu’aux structures sanitaires du pays, y compris les plus éloignées.' },
  ],
}]

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const ligne = { titre: 'Hero de l’accueil', chapeau: 'Le hero affiché en haut de la page d’accueil.', blocs, menu: false, publie: true, maj_le: new Date().toISOString() }
const { error } = deja
  ? await srv.from('site_pages').update(ligne).eq('id', deja.id)
  : await srv.from('site_pages').insert({ ...ligne, site_id: site.id, chemin: CHEMIN, parent: null, ordre: 97 })
console.log(error ? `🔴 ${error.message}` : `🟢 /${CHEMIN} ${deja ? 'mise à jour' : 'créée'}`)
process.exit(error ? 1 : 0)
