// CPA — sous-page « Moyen roulant » dans « Nos activités » (demande de
// l'informaticien de la CPA, 2026-11-11). Intitulé tel qu'il l'a donné.
// Aucun chiffre inventé : le détail du parc est annoncé, pas affirmé.
// Idempotent : si la page existe, rien.
//
//   node --env-file=.env.local scripts/moyen-roulant-cpa.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const CHEMIN = 'activites/moyen-roulant'
const photo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-images/cpa/parcours/acheminement.webp`

const blocs = [
  { type: 'texte', texte: "Les moyens roulants de la Centrale sont le lien entre ses magasins et les structures sanitaires du pays. Ils permettent de livrer les médicaments essentiels et produits de santé dans le respect du calendrier de distribution et des conditions de conservation." },
  { type: 'image', url: photo, alt: 'Camion de livraison de la Centrale sur une route du Sahel', legende: 'Une tournée de livraison vers les structures sanitaires' },
  { type: 'titre', texte: 'Le parc de véhicules' },
  { type: 'liste', items: [
    'Camions de livraison pour les tournées régionales',
    'Véhicules frigorifiques pour les produits de la chaîne du froid',
    'Véhicules légers pour les livraisons urgentes et les missions de supervision',
  ] },
  { type: 'titre', texte: 'Ce que garantissent nos moyens roulants' },
  { type: 'liste', items: [
    'Des livraisons planifiées selon le calendrier régional',
    'Le maintien de la chaîne du froid pendant le transport',
    'La traçabilité de chaque chargement jusqu’à sa réception',
    'Un entretien régulier des véhicules pour la sécurité des tournées',
  ] },
  { type: 'encadre', ton: 'info', texte: 'La composition détaillée du parc (nombre de véhicules, capacités, zones desservies) sera publiée ici par la Centrale.' },
  { type: 'liens', items: [{ libelle: 'Distribution et logistique', chemin: 'activites/distribution' }, { libelle: 'Stockage et conservation', chemin: 'activites/stockage' }] },
]

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', CHEMIN).maybeSingle()
if (deja) { console.log(`⚪ /${CHEMIN} existe déjà : non touchée`); process.exit(0) }
const { error } = await srv.from('site_pages').insert({
  site_id: site.id, chemin: CHEMIN, parent: 'activites', titre: 'Moyen roulant',
  chapeau: 'Les véhicules qui acheminent les produits de santé jusqu’aux structures.',
  blocs, ordre: 6, menu: true, publie: true,
})
console.log(error ? `🔴 ${error.code} ${error.message}` : `🟢 /${CHEMIN} créée (menu « Nos activités », 6e)`)
process.exit(error ? 1 : 0)
