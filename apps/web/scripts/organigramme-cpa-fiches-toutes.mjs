// CPA — TOUTES les boîtes de l'organigramme deviennent cliquables (demande du
// 2026-11-11 : « ceux qui sont encerclés ça marche pas, pas cliquable »).
// Les 9 premières avaient déjà leur fiche ; ce script crée les 23 autres et
// ajoute le lien dans la boîte correspondante du bloc organigramme EN BASE
// (boîte retrouvée par sa clé ET son intitulé ; rien d'autre n'est modifié).
//
// Contenu d'exemple, signé par la FONCTION, aucun nom inventé. L'informaticien
// ajoute photo, nom et texte réels dans /edit. Une fiche existante n'est pas touchée.
//
//   node --env-file=.env.local scripts/organigramme-cpa-fiches-toutes.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PARENT = 'qui-sommes-nous/direction'
const retour = { type: 'appel', libelle: "Retour à l'organigramme", chemin: PARENT }

// [clé, intitulé exact de la boîte, slug, titre, chapeau, missions]
const F = [
  ['ad', 'ASSISTANCE DE DIRECTION', 'assistance-de-direction', 'Assistance de direction', "L'assistance de la direction générale.",
    ['Organiser l’agenda et le courrier de la direction', 'Préparer les réunions et en assurer le suivi', 'Assurer l’accueil et la liaison avec les divisions']],
  ['csappro', 'CHEF DE SERVICE APPRO', 'service-appro', 'Chef de service Appro', 'Le chef du service Appro, rattaché à la division Appro.',
    ['Mettre en œuvre les plans d’approvisionnement', 'Suivre les commandes auprès des fournisseurs', 'Encadrer les logisticiens']],
  ['log', 'LOGISTICIENS', 'logisticiens', 'Logisticiens', 'Les logisticiens du service Appro.',
    ['Organiser l’arrivée des produits commandés', 'Suivre les expéditions et les délais', 'Préparer les documents de transport']],
  ['csddm', 'CHEF SERVICE DDM', 'service-ddm', 'Chef service DDM', 'Le chef du service DDM, rattaché à la division DDM.',
    ['Organiser le traitement des commandes', 'Superviser les livraisons aux structures', 'Encadrer le traitement des commandes et le contrôle des livraisons']],
  ['rtc', 'RESPONSABLE TRAITEMENT COMMANDE', 'traitement-commande', 'Responsable traitement commande', 'Le responsable du traitement des commandes.',
    ['Enregistrer et vérifier les commandes des structures', 'Préparer les bons de livraison', 'Suivre chaque commande jusqu’à sa livraison']],
  ['cl', 'CONTROLEUR DE LIVRAISON', 'controleur-de-livraison', 'Contrôleur de livraison', 'Le contrôleur de livraison.',
    ['Contrôler chaque livraison avant son départ', 'Vérifier les quantités et les lots livrés', 'Signaler tout écart']],
  ['sc', 'SECRÉTAIRE COMMERCIAL', 'secretaire-commercial', 'Secrétaire commercial', 'Le secrétariat commercial de la division DDM.',
    ['Accueillir et orienter les structures clientes', 'Tenir les dossiers commerciaux', 'Assurer le suivi administratif des commandes']],
  ['csgpp', 'CHEF DE SERVICE GPP', 'service-gpp', 'Chef de service GPP', 'Le chef du service GPP.',
    ['Organiser le travail du service', 'Encadrer le magasinier chef et les magasiniers', 'Rendre compte des niveaux de stock']],
  ['mcgpp', 'MAGASINIER CHEF GPP', 'magasinier-chef-gpp', 'Magasinier chef GPP', 'Le magasinier chef du service GPP.',
    ['Organiser le magasin et ses équipes', 'Contrôler les entrées et les sorties', 'Tenir les fiches de stock']],
  ['mpp', 'MAGASINIERS PP', 'magasiniers-pp', 'Magasiniers PP', 'Les magasiniers PP.',
    ['Réceptionner et ranger les produits', 'Préparer les sorties de stock', 'Participer aux inventaires']],
  ['cssg', 'CHEF DE SERVICE SG', 'service-sg', 'Chef de service SG', 'Le chef du service SG, rattaché à la division gestion de stock.',
    ['Organiser les magasins A, B et C', 'Encadrer les magasiniers chefs', 'Suivre les inventaires et les dates de péremption']],
  ['mca', 'MAGASINIER CHEF A', 'magasinier-chef-a', 'Magasinier chef A', 'Le magasinier chef du magasin A.',
    ['Organiser le magasin A', 'Contrôler les entrées et les sorties', 'Encadrer les magasiniers A']],
  ['ma', 'MAGASINIERS A', 'magasiniers-a', 'Magasiniers A', 'Les magasiniers du magasin A.',
    ['Réceptionner et ranger les produits', 'Préparer les sorties de stock', 'Participer aux inventaires']],
  ['mcb', 'MAGASINIER CHEF B', 'magasinier-chef-b', 'Magasinier chef B', 'Le magasinier chef du magasin B.',
    ['Organiser le magasin B', 'Contrôler les entrées et les sorties', 'Encadrer les magasiniers B']],
  ['mb', 'MAGASINIERS B', 'magasiniers-b', 'Magasiniers B', 'Les magasiniers du magasin B.',
    ['Réceptionner et ranger les produits', 'Préparer les sorties de stock', 'Participer aux inventaires']],
  ['mcc', 'MAGASINIER CHEF C', 'magasinier-chef-c', 'Magasinier chef C', 'Le magasinier chef du magasin C.',
    ['Organiser le magasin C', 'Contrôler les entrées et les sorties', 'Encadrer les magasiniers C']],
  ['mc', 'MAGASINIERS C', 'magasiniers-c', 'Magasiniers C', 'Les magasiniers du magasin C.',
    ['Réceptionner et ranger les produits', 'Préparer les sorties de stock', 'Participer aux inventaires']],
  ['rh', 'RESPONSABLE RH', 'responsable-rh', 'Responsable RH', 'Le responsable des ressources humaines.',
    ['Gérer les dossiers du personnel', 'Organiser les recrutements et les formations', 'Suivre la paie et les congés']],
  ['mat', 'RESPONSABLE MATERIEL', 'responsable-materiel', 'Responsable matériel', 'Le responsable du matériel.',
    ['Tenir l’inventaire du matériel de la Centrale', 'Organiser l’entretien et les réparations', 'Suivre les moyens roulants']],
  ['cc', 'CHEF COMPTABLE', 'chef-comptable', 'Chef comptable', 'Le chef comptable de la Centrale.',
    ['Tenir la comptabilité générale', 'Préparer les états financiers', 'Encadrer les comptables et le recouvrement']],
  ['comp', 'COMPTABLES', 'comptables', 'Comptables', 'Les comptables de la Centrale.',
    ['Enregistrer les opérations comptables', 'Préparer les règlements fournisseurs', 'Tenir les pièces justificatives']],
  ['rec', 'RESPONSABLE DE RECOUVREMENT', 'responsable-de-recouvrement', 'Responsable de recouvrement', 'Le responsable du recouvrement.',
    ['Suivre les créances des structures clientes', 'Relancer les paiements en retard', 'Rendre compte de l’état du recouvrement']],
  ['ri', 'RESPONSABLE INFORMATIQUE', 'responsable-informatique', 'Responsable informatique', 'Le responsable informatique de la Centrale.',
    ['Administrer le parc informatique et le réseau', 'Assurer le bon fonctionnement des logiciels de gestion', 'Gérer le site internet de la Centrale']],
]

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
let ko = 0
for (const [k, [, , slug, titre, chapeau, miss]] of F.entries()) {
  const chemin = `${PARENT}/${slug}`
  const { data: deja } = await srv.from('site_pages').select('id').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (deja) { console.log(`  ⚪ /${chemin} existe déjà`); continue }
  const blocs = [
    { type: 'texte', texte: `${chapeau} La photo, le nom et le mot du responsable seront ajoutés par la Centrale.` },
    { type: 'titre', texte: 'Ses missions' }, { type: 'liste', items: miss }, retour,
  ]
  const { error } = await srv.from('site_pages').insert({ site_id: site.id, chemin, parent: PARENT, titre, chapeau, blocs, ordre: 20 + k, menu: false, publie: true })
  if (error) { ko++; console.log(`  🔴 /${chemin} — ${error.message}`) } else console.log(`  🟢 /${chemin}`)
}

// Le lien dans chaque boîte, retrouvée par clé + intitulé.
const { data: page } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', PARENT).maybeSingle()
const idx = page.blocs.findIndex((b) => b.type === 'organigramme')
const items = page.blocs[idx].items.map((it) => {
  const f = F.find(([cle, fonction]) => cle === it.cle && fonction === it.fonction)
  return f && !it.lien ? { ...it, lien: `${PARENT}/${f[2]}` } : it
})
const poses = items.filter((it, i) => it.lien && !page.blocs[idx].items[i].lien).length
const blocs = page.blocs.map((b, i) => (i === idx ? { ...b, items } : b))
const { error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() }).eq('site_id', site.id).eq('chemin', PARENT)
if (error) { console.error('🔴', error.message); process.exit(1) }
console.log(`\n${poses === F.length && ko === 0 ? '🟢' : '🔴'} liens posés : ${poses}/${F.length} ; boîtes cliquables : ${items.filter((i) => i.lien).length}/${items.length} ; fiches en échec : ${ko}`)
process.exit(poses === F.length && ko === 0 ? 0 : 1)
