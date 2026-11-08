// Lot 4 — ENRICHIR les sous-pages les plus maigres. On AJOUTE, on ne remplace
// pas : les blocs déjà posés restent, les photos aussi.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const AJOUTS = {
'qui-sommes-nous/direction': [
 {type:'titre',texte:"Ce que la direction décide, et ce qu'elle ne décide pas"},
 {type:'tableau',entetes:['Décision','Qui tranche'],lignes:[
   ["Orientations pluriannuelles et budget","Conseil d'administration"],
   ["Lancement d'une consultation","Direction générale"],
   ["Attribution d'un marché","Commission des marchés, sur proposition motivée"],
   ["Acceptation ou refus d'un lot","Direction de l'assurance qualité, seule"],
   ["Déblocage d'un stock d'urgence","Direction générale, avec compte rendu"]],
   note:"Celui qui achète ne décide pas de la qualité : c'est cette séparation qui protège l'établissement."},
 {type:'liste',titre:"Rendre compte",items:[
   "Un rapport d'activité annuel présenté au conseil d'administration",
   "L'exécution budgétaire suivie et présentée à chaque session",
   "Les attributions de marchés publiées sur ce site",
   "Les ruptures signalées aux structures avec la solution retenue"]}],

'activites/programmes': [
 {type:'titre',texte:"Ce qui change par rapport au circuit courant"},
 {type:'tableau',entetes:['Point','Circuit courant','Programme'],lignes:[
   ["Qui paie","La structure, sur son budget","Le programme et son bailleur"],
   ["Coût pour le patient","Tarif de cession","Souvent gratuit"],
   ["Traçabilité","Par bon de commande","Par programme ET par source de financement"],
   ["Calendrier","Fenêtre régionale","Rythme des campagnes"],
   ["Stock","Commun","Souvent fléché, non substituable"]]},
 {type:'encadre',ton:'attention',titre:"Un stock fléché ne se dépanne pas",texte:"Prélever sur un stock de programme pour dépanner le circuit courant casse la traçabilité due au bailleur et peut mettre en cause le financement. Un besoin urgent se signale, il ne se sert pas."},
 {type:'questions',items:[
   {question:"Une structure peut-elle commander des produits de programme comme les autres ?",reponse:"Non. Les produits de programme suivent leur propre circuit de commande et leurs propres pièces justificatives."},
   {question:"Que faire en cas de rupture sur un programme ?",reponse:"Signaler immédiatement à la Centrale, qui saisit le programme concerné. Aucune substitution n'est décidée au niveau de la structure."}]}],

'appels-offres/calendrier': [
 {type:'titre',texte:"Comment lire ce calendrier"},
 {type:'etapes',items:[
   {titre:"Période prévisionnelle",texte:"Le trimestre où la Centrale prévoit de publier. Aucun droit n'en découle."},
   {titre:"Publication du dossier",texte:"C'est elle qui ouvre le délai de réponse, et elle seule."},
   {titre:"Date limite de remise",texte:"Indiquée dans le dossier. Un dépôt après l'heure est écarté sans être lu."},
   {titre:"Ouverture des plis",texte:"Publique, à la date annoncée dans le dossier."},
   {titre:"Notification",texte:"Les candidats retenus et non retenus sont informés."}]},
 {type:'encadre',titre:"Se tenir informé",texte:"Les consultations sont publiées sur la page « Appels d'offres » de ce site. Les fournisseurs enregistrés sont en outre informés pour leur domaine — c'est l'intérêt principal de l'enregistrement."}],

'qui-sommes-nous/missions': [
 {type:'titre',texte:"Comment une mission se vérifie"},
 {type:'tableau',entetes:['Mission','Ce qui prouve qu’elle est tenue'],lignes:[
   ["Acheter","Des consultations publiées et des attributions notifiées"],
   ["Contrôler","Un dossier de lot complet pour chaque réception acceptée"],
   ["Conserver","Un relevé continu des conditions, pas un constat à la sortie"],
   ["Distribuer","Un calendrier tenu, et les écarts signalés aux structures"]],
   note:"Une mission qu'on ne peut pas prouver est une intention."},
 {type:'liste',titre:"Ce que la Centrale ne fait pas",items:[
   "Elle ne dispense pas au patient : cela reste le rôle des structures",
   "Elle ne fixe pas la liste nationale des médicaments essentiels, elle l'applique",
   "Elle ne se substitue pas aux programmes nationaux, elle les appuie",
   "Elle ne vend pas au public"]}],

'qui-sommes-nous/chiffres-cles': [
 {type:'titre',texte:"Ce que ces chiffres disent, et ce qu'ils ne disent pas"},
 {type:'encadre',ton:'attention',texte:"Un volume distribué n'est pas un besoin couvert. Une centrale peut livrer beaucoup et laisser des districts en rupture si la répartition est mauvaise. C'est pourquoi le taux de rupture par district compte plus que le volume total."},
 {type:'tableau',titre:"Les indicateurs qui comptent vraiment",entetes:['Indicateur','Pourquoi'],lignes:[
   ["Taux de disponibilité des produits traceurs","Mesure ce que la structure trouve réellement"],
   ["Taux de rupture par district","Révèle les déséquilibres que le volume total masque"],
   ["Délai moyen de livraison","Dit si le calendrier est tenu"],
   ["Taux de lots refusés au contrôle","Mesure la qualité des fournisseurs retenus"],
   ["Valeur des pertes par péremption","Mesure la justesse des prévisions d'achat"]],
   note:"Les valeurs de ces indicateurs sont à publier par la Centrale."}],

'fournisseurs/contact': [
 {type:'titre',texte:"À qui s'adresser, selon le sujet"},
 {type:'tableau',entetes:['Votre sujet','Interlocuteur'],lignes:[
   ["Enregistrement comme fournisseur","Direction des achats"],
   ["Question sur une consultation en cours","Direction des achats, avant la date limite des questions"],
   ["Livraison, réception, lot refusé","Direction des achats, avec le numéro de lot"],
   ["Facturation et règlement","Direction des achats, avec la référence de commande"],
   ["Signalement d'un défaut qualité","Direction de l'assurance qualité, via la direction des achats"]]},
 {type:'encadre',ton:'attention',titre:"Les questions sur une consultation ont une date limite",texte:"Passé la date de questions indiquée au dossier, aucune réponse ne peut être donnée — répondre à un seul candidat après cette date romprait l'égalité de traitement."}],

'actualites/communiques': [
 {type:'titre',texte:"Comment lire un communiqué"},
 {type:'liste',items:[
   "Un avis de rappel de lot indique TOUJOURS le numéro de lot et la conduite à tenir",
   "Une modification de calendrier précise la région et la nouvelle fenêtre",
   "Une rupture annoncée s'accompagne de l'équivalence retenue, ou de l'absence d'équivalence",
   "Un communiqué daté remplace le précédent sur le même sujet"]},
 {type:'encadre',ton:'attention',titre:"Un rappel de lot se traite immédiatement",texte:"À réception d'un avis de rappel, la structure isole le lot concerné et cesse toute dispensation, avant même d'avoir contacté la Centrale."}],

'actualites/evenements': [
 {type:'titre',texte:"Les rendez-vous habituels"},
 {type:'liste',items:[
   "Rencontres fournisseurs avant l'ouverture d'une campagne d'achat",
   "Sessions d'information des structures sur les commandes et les délais",
   "Journées qualité : bonnes pratiques de conservation et de dispensation",
   "Présentation du rapport d'activité annuel"]},
 {type:'encadre',titre:"Participer",texte:"Les conditions de participation, le lieu et l'inscription sont précisés dans chaque annonce. Les rencontres fournisseurs sont ouvertes aux fournisseurs enregistrés."}],

'mentions-legales': [
 {type:'titre',texte:"Contenus et responsabilité"},
 {type:'liste',items:[
   "Les contenus de ce site sont publiés par la Centrale, qui en répond",
   "Seuls les dossiers de consultation publiés font foi pour une procédure d'achat",
   "Les informations indicatives — calendriers prévisionnels, périodes — ne créent aucun droit",
   "La reproduction des documents officiels est autorisée à condition de ne pas les altérer"]},
 {type:'encadre',ton:'attention',titre:"En cas de contradiction",texte:"Si une page de ce site contredit un dossier de consultation, c'est le dossier qui s'applique. Signalez la contradiction à la direction des achats."}],

'confidentialite': [
 {type:'titre',texte:"Ce que ce site ne fait pas"},
 {type:'liste',items:[
   "Il ne traite aucune donnée de santé de patient",
   "Il ne revend ni ne cède aucune donnée à un tiers",
   "Il ne dépose aucun traceur publicitaire",
   "Il ne crée aucun profil à partir de votre navigation"]},
 {type:'encadre',titre:"Les fichiers déposés",texte:"Les documents téléversés par la Centrale sont publics par destination : ils sont accessibles à toute personne disposant de leur adresse. Aucun document contenant des données personnelles ne doit y être déposé."}],
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
let ok = 0, ko = 0
for (const [chemin, ajout] of Object.entries(AJOUTS)) {
  const { data: avant } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (!avant) { ko++; console.log(`  🔴 /${chemin} — page absente`); continue }
  const depart = avant.blocs || []
  const blocs = [...depart, ...ajout]
  const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('blocs')
  if (error || !data?.length) { ko++; console.log(`  🔴 /${chemin} — ${error ? error.code + ' ' + error.message : 'aucune ligne'}`); continue }
  const relu = data[0].blocs || []
  // On vérifie qu'on a AJOUTÉ, pas remplacé : les blocs de départ doivent
  // tous être encore là. Compter la hausse ne verrait pas une substitution.
  const perdus = depart.filter((b, i) => JSON.stringify(relu[i]) !== JSON.stringify(b)).length
  if (relu.length !== blocs.length || perdus > 0) {
    ko++; console.log(`  🔴 /${chemin} — ${relu.length}/${blocs.length} blocs, ${perdus} bloc(s) de départ altéré(s)`); continue
  }
  ok++; console.log(`  🟢 /${chemin} — ${depart.length} → ${relu.length} blocs (+${ajout.length})`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${ok + ko}`)
process.exit(ko === 0 ? 0 : 1)
