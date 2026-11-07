// Contenu généré pour les pages de la CPA — LOT 4.
// Il est RIVÉ au vocabulaire fermé : la base refuserait tout autre type.
// Ce texte est du contenu de GÉNÉRATEUR : la Centrale le remplace depuis
// /edit par le sien. Chiffres et dates sont des exemples de mise en forme,
// pas des faits vérifiés — c'est exactement ce que l'éditeur sert à corriger.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const P = {
'qui-sommes-nous': [
 {type:'texte',texte:"La Centrale Pharmaceutique d'Achats est l'opérateur public chargé d'approvisionner les structures sanitaires du pays en médicaments essentiels, dispositifs médicaux et consommables. Elle achète, contrôle, stocke et distribue, sous un cahier des charges de qualité unique."},
 {type:'chiffres',titre:'La Centrale en bref',items:[
   {valeur:'1 200+',libelle:'références au catalogue'},{valeur:'23',libelle:'districts sanitaires desservis'},
   {valeur:'4',libelle:'entrepôts régionaux'},{valeur:'100 %',libelle:'des lots contrôlés avant mise en stock'}]},
 {type:'titre',texte:'Ce que la Centrale fait'},
 {type:'liste',items:[
   "Sélectionner les produits inscrits à la liste nationale des médicaments essentiels",
   "Acheter par appel d'offres ouvert, dans des conditions de concurrence et de traçabilité",
   "Contrôler la qualité de chaque lot avant sa mise en stock",
   "Conserver les produits dans des conditions maîtrisées, chaîne du froid comprise",
   "Distribuer vers les structures sanitaires selon un calendrier connu à l'avance"]},
 {type:'liens',titre:'Aller plus loin',items:[
   {libelle:'Notre histoire',chemin:'qui-sommes-nous/histoire'},{libelle:'Nos missions',chemin:'qui-sommes-nous/missions'},
   {libelle:'Organisation et gouvernance',chemin:'qui-sommes-nous/gouvernance'},{libelle:'Chiffres clés',chemin:'qui-sommes-nous/chiffres-cles'}]}],

'activites': [
 {type:'texte',texte:"Les activités de la Centrale forment une chaîne continue : ce qui est acheté doit être contrôlé, ce qui est contrôlé doit être conservé, et ce qui est conservé doit arriver à temps. Une rupture à n'importe quel maillon se voit au comptoir d'une pharmacie de district."},
 {type:'etapes',titre:'La chaîne, du besoin au patient',items:[
   {titre:"Expression des besoins",texte:"Les structures remontent leurs consommations ; la Centrale consolide et projette."},
   {titre:"Achat",texte:"Appel d'offres ouvert, évaluation technique puis financière, attribution publiée."},
   {titre:"Contrôle qualité",texte:"Vérification documentaire et analyse des lots avant acceptation."},
   {titre:"Stockage",texte:"Mise en stock sous conditions maîtrisées, chaîne du froid séparée."},
   {titre:"Distribution",texte:"Préparation des commandes et livraison selon le calendrier régional."}]},
 {type:'liens',titre:'Le détail de chaque activité',items:[
   {libelle:'Approvisionnement et achats',chemin:'activites/approvisionnement'},{libelle:'Assurance qualité',chemin:'activites/qualite'},
   {libelle:'Stockage et conservation',chemin:'activites/stockage'},{libelle:'Distribution et logistique',chemin:'activites/distribution'},
   {libelle:'Programmes de santé publique',chemin:'activites/programmes'}]}],

'catalogue': [
 {type:'texte',texte:"Le catalogue rassemble les produits que la Centrale met à disposition des structures sanitaires agréées. Il suit la liste nationale des médicaments essentiels et il est révisé à chaque campagne d'achat."},
 {type:'tableau',titre:'Les grandes familles',entetes:['Famille','Exemples','Conditionnement'],lignes:[
   ['Médicaments essentiels','Antipaludiques, antibiotiques, antalgiques','Boîte, flacon'],
   ['Produits de la chaîne du froid','Vaccins, insulines','Flacon, portoir isotherme'],
   ['Dispositifs médicaux','Seringues, gants, sondes','Carton, sachet'],
   ['Consommables de laboratoire','Réactifs, tubes, lames','Coffret'],
   ['Solutés et perfusions','Sérum physiologique, Ringer','Poche, flacon']],
   note:"Le catalogue détaillé, avec références et conditionnements, est remis aux structures agréées."},
 {type:'encadre',titre:'Qui peut commander',texte:"Les commandes sont réservées aux structures sanitaires agréées. Une structure non référencée doit d'abord se faire enregistrer auprès de la direction des achats."},
 {type:'appel',libelle:'Passer une commande',chemin:'catalogue/commander',texte:"La marche à suivre, les pièces à joindre et les délais de traitement."}],

'fournisseurs': [
 {type:'texte',texte:"La Centrale achète par mise en concurrence. Tout fournisseur qui remplit les conditions techniques et réglementaires peut se porter candidat aux consultations publiées."},
 {type:'etapes',titre:'Devenir fournisseur',items:[
   {titre:"Constituer son dossier",texte:"Pièces administratives, fiscales et techniques à jour."},
   {titre:"Déposer la demande d'enregistrement",texte:"Auprès de la direction des achats, qui en accuse réception."},
   {titre:"Instruction du dossier",texte:"Vérification de la conformité réglementaire des produits proposés."},
   {titre:"Répondre aux consultations",texte:"Un fournisseur enregistré est informé des appels d'offres de son domaine."}]},
 {type:'liens',titre:'Les pages utiles',items:[
   {libelle:'Devenir fournisseur',chemin:'fournisseurs/enregistrement'},{libelle:"Conditions générales d'achat",chemin:'fournisseurs/conditions'},
   {libelle:'Documents à télécharger',chemin:'fournisseurs/documents'},{libelle:'Questions fréquentes',chemin:'fournisseurs/faq'}]},
 {type:'appel',libelle:"Voir les appels d'offres en cours",chemin:'appels-offres'}],

'qui-sommes-nous/histoire': [
 {type:'texte',texte:"La Centrale s'est construite autour d'une idée simple : un pays n'achète pas bien ses médicaments en ordre dispersé. Regrouper la demande, c'est obtenir de meilleurs prix et surtout une qualité contrôlée une seule fois, pour tous."},
 {type:'frise',titre:'Les grandes étapes',items:[
   {date:'Années 1990',titre:'La création',texte:"Mise en place d'un opérateur public d'achat groupé pour les structures sanitaires."},
   {date:'Années 2000',titre:"L'extension du réseau",texte:"Ouverture d'entrepôts régionaux pour rapprocher le stock des districts."},
   {date:'Années 2010',titre:"La qualité formalisée",texte:"Contrôle systématique des lots et traçabilité documentaire à l'entrée."},
   {date:"Aujourd'hui",titre:"La transparence des achats",texte:"Publication des consultations et des attributions sur le site de la Centrale."}]},
 {type:'encadre',ton:'info',texte:"Les repères ci-dessus décrivent la trajectoire de la Centrale. Les dates précises sont à confirmer par la direction générale."}],

'qui-sommes-nous/chiffres-cles': [
 {type:'texte',texte:"Les chiffres ci-dessous résument l'activité de la Centrale sur le dernier exercice connu. Ils sont mis à jour à chaque clôture."},
 {type:'chiffres',items:[
   {valeur:'1 200+',libelle:'références au catalogue'},{valeur:'23',libelle:'districts sanitaires desservis'},
   {valeur:'4',libelle:'entrepôts régionaux'},{valeur:'100 %',libelle:'des lots contrôlés avant stock'},
   {valeur:'12',libelle:"appels d'offres publiés dans l'année"},{valeur:'6',libelle:'programmes nationaux appuyés'}]},
 {type:'tableau',titre:"Répartition de l'activité",entetes:['Domaine','Part des volumes'],lignes:[
   ['Médicaments essentiels','58 %'],['Dispositifs médicaux','19 %'],['Solutés et perfusions','12 %'],
   ['Chaîne du froid','7 %'],['Consommables de laboratoire','4 %']],
   note:"Chiffres indicatifs, à remplacer par les données validées de la direction."}],
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
if (!site) { console.log('🔴 site CPA introuvable'); process.exit(1) }
// GARDE — un lien vers un chemin inexistant est un lien mort servi au public.
// La première version de ce script en portait SIX, et seul le hasard d'une
// page manquante me les a montrés. On vérifie donc avant d'écrire.
const { data: reelles } = await srv.from('site_pages').select('chemin').eq('site_id', site.id)
const EXISTE = new Set((reelles || []).map((r) => r.chemin))
const HORS_PAGES = new Set(['appels-offres', 'contact'])   // routes du moteur, pas des pages déclarées
const morts = []
for (const [depuis, blocs] of Object.entries(P))
  for (const b of blocs)
    for (const c of b.type === 'appel' ? [b.chemin] : (b.type === 'liens' ? b.items.map((i) => i.chemin) : []))
      if (!EXISTE.has(c) && !HORS_PAGES.has(c)) morts.push(`/${depuis} → /${c}`)
if (morts.length) { console.log('🔴 LIENS MORTS, rien n’a été écrit :'); morts.forEach((m) => console.log('   ' + m)); process.exit(1) }
console.log(`🟢 tous les liens désignent une page réelle (${EXISTE.size} pages en base)\n`)

let ok = 0, ko = 0
for (const [chemin, blocs] of Object.entries(P)) {
  const { data, error } = await srv.from('site_pages')
    .update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('chemin,blocs')
  if (error) { ko++; console.log(`  🔴 /${chemin} — ${error.code} ${error.message}`); continue }
  if (!data?.length) { ko++; console.log(`  🔴 /${chemin} — AUCUNE ligne touchée (la page existe-t-elle ?)`); continue }
  const n = data[0].blocs?.length ?? 0
  if (n !== blocs.length) { ko++; console.log(`  🔴 /${chemin} — ${blocs.length} posés, ${n} relus`); continue }
  ok++; console.log(`  🟢 /${chemin} — ${n} blocs, relus en base`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${ok + ko}`)
process.exit(ko === 0 ? 0 : 1)
