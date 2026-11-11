// CPA — page d'ESSAI du hero « parcours » (2026-11-11), hors menu. L'accueil
// n'est pas touché tant que le propriétaire n'a pas validé cette page.
//
//   node --env-file=.env.local scripts/parcours-essai-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'essai-parcours'
const img = (e) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/cpa/parcours/${e}.webp`

const blocs = [{
  type: 'etapes', affichage: 'parcours', titre: 'Du magasin au centre de santé',
  items: [
    { libelle: 'Achat', titre: 'Acheter au juste prix', image: img('achat'),
      texte: 'La Centrale consolide les besoins des structures sanitaires et met les fournisseurs en concurrence, en toute transparence.' },
    { libelle: 'Chargement', titre: 'Préparer chaque commande', image: img('chargement'),
      texte: 'Au magasin, les lots contrôlés sont préparés, comptés et chargés avec soin, dans le respect des conditions de conservation.' },
    { libelle: 'Acheminement', titre: "Livrer jusqu'au bout de la route", image: img('acheminement'),
      texte: 'Nos camions parcourent le pays pour approvisionner les structures, y compris les plus éloignées.' },
    { libelle: 'Déchargement', titre: 'Réceptionner et vérifier', image: img('dechargement'),
      texte: "À l'arrivée, chaque livraison est déchargée et contrôlée avec l'équipe de la structure." },
    { libelle: 'Distribution', titre: 'Soigner, enfin', image: img('distribution'),
      texte: "Le médicament essentiel arrive entre les mains du patient : c'est la raison d'être de la Centrale." },
  ],
}]

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
const ligne = { titre: 'Essai — le parcours', chapeau: 'Page d’essai, hors menu, avant validation.', blocs, menu: false, publie: true, maj_le: new Date().toISOString() }
const { error } = deja
  ? await srv.from('site_pages').update(ligne).eq('id', deja.id)
  : await srv.from('site_pages').insert({ ...ligne, site_id: site.id, chemin: CHEMIN, parent: null, ordre: 99 })
console.log(error ? `🔴 ${error.message}` : `🟢 /${CHEMIN} ${deja ? 'mise à jour' : 'créée'}`)
process.exit(error ? 1 : 0)
