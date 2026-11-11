// CPA — les 23 fiches ajoutées prennent le MODÈLE de la fiche GPP (demande du
// 2026-11-11 : « prends tout exemple sur ça ») : mot en tête (citation), puis
// « Ses missions », puis le retour. La PHOTO EST LAISSÉE VIDE (`photo: ''`) :
// la page affiche un médaillon d'attente, l'équipe CPA pose sa photo dans /edit.
// Aucun nom inventé : chaque mot est signé par la fonction.
//
// GARDE : une fiche n'est convertie que si elle a ENCORE la forme posée par
// organigramme-cpa-fiches-toutes.mjs (texte, titre, liste, appel). Une fiche
// retouchée dans /edit n'est jamais écrasée.
//
//   node --env-file=.env.local scripts/organigramme-cpa-fiches-modele.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PARENT = 'qui-sommes-nous/direction'
const CPA = "Centrale Pharmaceutique d'Achats"

// slug → [titre du mot, texte du mot]
const MOTS = {
  'assistance-de-direction': ["Mot de l'assistance de direction", "Au cœur de la direction générale, nous veillons à ce que chaque courrier trouve sa réponse et chaque réunion son suivi.\n\nNotre rôle : faciliter le travail de la direction et faire le lien avec toutes les divisions de la Centrale."],
  'service-appro': ['Mot du chef de service Appro', "Notre service transforme les plans d'approvisionnement en commandes concrètes, suivies jusqu'à leur arrivée.\n\nAvec les logisticiens, nous veillons à ce que chaque produit commandé arrive à temps dans les magasins de la Centrale."],
  logisticiens: ["Mot de l'équipe des logisticiens", "Nous suivons les produits depuis le fournisseur jusqu'aux magasins de la Centrale.\n\nExpéditions, délais, documents de transport : rien n'est laissé au hasard pour que l'approvisionnement ne s'interrompe pas."],
  'service-ddm': ['Mot du chef service DDM', "Notre service organise le traitement des commandes et les livraisons aux structures sanitaires.\n\nChaque commande reçue est vérifiée, préparée, contrôlée et livrée : c'est notre engagement envers les structures que nous servons."],
  'traitement-commande': ['Mot du responsable traitement commande', "Chaque commande d'une structure est enregistrée, vérifiée et suivie jusqu'à sa livraison.\n\nNotre exigence : qu'aucune commande ne se perde et que chaque structure sache où en est la sienne."],
  'controleur-de-livraison': ['Mot du contrôleur de livraison', "Avant qu'une livraison ne quitte la Centrale, nous la contrôlons : quantités, lots, documents.\n\nCe dernier contrôle garantit que la structure reçoit exactement ce qu'elle a commandé."],
  'secretaire-commercial': ['Mot du secrétariat commercial', "Nous sommes le premier interlocuteur des structures clientes de la division DDM.\n\nAccueil, orientation, suivi des dossiers : nous veillons à ce que chaque demande reçoive une réponse."],
  'service-gpp': ['Mot du chef de service GPP', "Notre service organise au quotidien la gestion des produits qui lui sont confiés.\n\nAvec le magasinier chef et les magasiniers, nous garantissons des stocks justes, suivis et disponibles."],
  'magasinier-chef-gpp': ['Mot du magasinier chef GPP', "Le magasin est notre responsabilité : chaque entrée et chaque sortie y est contrôlée et enregistrée.\n\nUn magasin bien tenu, c'est un produit disponible au moment où on en a besoin."],
  'magasiniers-pp': ["Mot de l'équipe des magasiniers PP", "Nous réceptionnons, rangeons et préparons les produits du magasin.\n\nNotre travail quotidien rend possible chaque livraison de la Centrale."],
  'service-sg': ['Mot du chef de service SG', "Notre service organise les magasins A, B et C de la Centrale.\n\nInventaires, dates de péremption, rangement : nous veillons à ce que chaque produit soit conservé dans les règles."],
  'magasinier-chef-a': ['Mot du magasinier chef A', "Le magasin A est tenu au quotidien par notre équipe : entrées, sorties, rangement, inventaires.\n\nChaque mouvement est enregistré pour que le stock soit toujours juste."],
  'magasiniers-a': ["Mot de l'équipe des magasiniers A", "Nous réceptionnons, rangeons et préparons les produits du magasin A.\n\nNotre rigueur garantit que les produits sont bien conservés et prêts à partir."],
  'magasinier-chef-b': ['Mot du magasinier chef B', "Le magasin B est tenu au quotidien par notre équipe : entrées, sorties, rangement, inventaires.\n\nChaque mouvement est enregistré pour que le stock soit toujours juste."],
  'magasiniers-b': ["Mot de l'équipe des magasiniers B", "Nous réceptionnons, rangeons et préparons les produits du magasin B.\n\nNotre rigueur garantit que les produits sont bien conservés et prêts à partir."],
  'magasinier-chef-c': ['Mot du magasinier chef C', "Le magasin C est tenu au quotidien par notre équipe : entrées, sorties, rangement, inventaires.\n\nChaque mouvement est enregistré pour que le stock soit toujours juste."],
  'magasiniers-c': ["Mot de l'équipe des magasiniers C", "Nous réceptionnons, rangeons et préparons les produits du magasin C.\n\nNotre rigueur garantit que les produits sont bien conservés et prêts à partir."],
  'responsable-rh': ['Mot du responsable RH', "La Centrale, ce sont d'abord des femmes et des hommes. Nous les accompagnons du recrutement à la formation.\n\nDes équipes formées et reconnues, c'est une Centrale qui sert mieux les structures sanitaires."],
  'responsable-materiel': ['Mot du responsable matériel', "Véhicules, équipements, mobilier : nous veillons à ce que la Centrale dispose des moyens dont elle a besoin.\n\nUn matériel entretenu, c'est une activité qui ne s'arrête pas."],
  'chef-comptable': ['Mot du chef comptable', "La comptabilité de la Centrale doit pouvoir rendre compte de chaque opération.\n\nAvec les comptables et le recouvrement, nous tenons des comptes justes et transparents."],
  comptables: ["Mot de l'équipe des comptables", "Nous enregistrons chaque opération et préparons les règlements des fournisseurs.\n\nChaque pièce est tenue et justifiée : c'est la base de la transparence de la Centrale."],
  'responsable-de-recouvrement': ['Mot du responsable de recouvrement', "Le recouvrement permet à la Centrale de continuer à acheter. Nous suivons les créances et relançons les paiements.\n\nUne Centrale qui recouvre bien est une Centrale qui approvisionne sans interruption."],
  'responsable-informatique': ['Mot du responsable informatique', "Réseau, logiciels de gestion, site internet : nous faisons fonctionner les outils de la Centrale.\n\nDes outils fiables, c'est une information juste et disponible pour tous."],
}

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
let ok = 0, ko = 0
for (const [slug, [titreMot, texte]] of Object.entries(MOTS)) {
  const chemin = `${PARENT}/${slug}`
  const { data: page } = await srv.from('site_pages').select('titre,blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (!page) { ko++; console.log(`  🔴 /${chemin} absente`); continue }
  const b = page.blocs
  const provisoire = b.length === 4 && b[0].type === 'texte' && /seront ajoutés par la Centrale\.$/.test(b[0].texte) && b[1].type === 'titre' && b[2].type === 'liste' && b[3].type === 'appel'
  if (!provisoire) { console.log(`  ⚪ /${chemin} déjà retouchée : non écrasée`); continue }
  const blocs = [
    { type: 'citation', photo: '', titre: titreMot, auteur: page.titre, fonction: CPA, texte },
    b[1], b[2], b[3],
  ]
  const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('blocs')
  if (error || data?.[0]?.blocs?.[0]?.type !== 'citation') { ko++; console.log(`  🔴 /${chemin} — ${error?.message ?? 'relecture différente'}`); continue }
  ok++; console.log(`  🟢 /${chemin}`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok} fiche(s) au modèle GPP, ${ko} échec(s)`)
process.exit(ko ? 1 : 0)
