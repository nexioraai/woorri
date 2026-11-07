// Contenu généré — lot 3 : catalogue, fournisseurs, appels d'offres, actualités, pages légales.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const P = {
'catalogue/categories': [
 {type:'texte',texte:"Le catalogue est organisé en familles, puis en sous-familles. Cette organisation n'est pas décorative : elle suit la logique de la liste nationale des médicaments essentiels, pour qu'une structure retrouve un produit par son usage et non par son nom commercial."},
 {type:'tableau',titre:"Les familles et leurs sous-familles",entetes:['Famille','Sous-familles'],lignes:[
   ['Anti-infectieux','Antibiotiques · Antipaludiques · Antituberculeux · Antirétroviraux'],
   ['Antalgiques et anti-inflammatoires','Paliers 1 à 3 · Anti-inflammatoires non stéroïdiens'],
   ['Cardiovasculaire','Antihypertenseurs · Diurétiques · Antiarythmiques'],
   ['Chaîne du froid','Vaccins · Insulines · Dérivés sanguins'],
   ['Solutés et perfusions','Sérum physiologique · Ringer lactate · Glucosé'],
   ['Dispositifs médicaux','Seringues · Gants · Sondes · Pansements'],
   ['Laboratoire','Réactifs · Consommables de prélèvement']],
   note:"Le catalogue détaillé, avec références et conditionnements, est remis aux structures agréées."},
 {type:'encadre',titre:"Équivalences",texte:"Lorsqu'une référence est en rupture, la Centrale peut proposer une équivalence thérapeutique validée par un pharmacien. L'équivalence est toujours signalée sur le bordereau de livraison."}],

'catalogue/commander': [
 {type:'texte',texte:"Commander à la Centrale suppose deux choses : que la structure soit agréée, et que la commande soit transmise dans la fenêtre de son calendrier régional. Hors de cette fenêtre, la commande est reportée au cycle suivant — sauf urgence justifiée."},
 {type:'etapes',titre:"Passer une commande",items:[
   {titre:"Vérifier son agrément",texte:"Une structure non enregistrée doit d'abord se faire agréer."},
   {titre:"Établir le bon de commande",texte:"Références du catalogue, quantités, et signature du responsable habilité."},
   {titre:"Transmettre dans la fenêtre",texte:"Selon le calendrier de livraison de la région."},
   {titre:"Accusé de réception",texte:"La Centrale confirme la prise en compte et signale les éventuelles ruptures."},
   {titre:"Réception et contrôle",texte:"Vérifier quantités, lots, péremptions et indicateurs de température avant de signer."}]},
 {type:'liste',titre:"Pièces à joindre",items:[
   "Le bon de commande signé par le responsable habilité",
   "La référence de l'agrément de la structure",
   "Pour une demande urgente : la justification de l'urgence"]},
 {type:'encadre',ton:'attention',titre:"Signer, c'est accepter",texte:"L'accusé de réception signé engage la structure sur les quantités et l'état des produits reçus. Les réserves doivent être portées sur le document AU MOMENT de la remise, pas après."}],

'fournisseurs/enregistrement': [
 {type:'texte',texte:"Tout fournisseur qui remplit les conditions techniques et réglementaires peut se porter candidat aux consultations de la Centrale. L'enregistrement n'est pas un marché : il ouvre le droit de concourir, et permet d'être informé des consultations du domaine concerné."},
 {type:'etapes',titre:"La marche à suivre",items:[
   {titre:"Constituer le dossier",texte:"Pièces administratives, fiscales, et dossier technique des produits proposés."},
   {titre:"Déposer la demande",texte:"Auprès de la direction des achats, qui en accuse réception."},
   {titre:"Instruction",texte:"Vérification de l'existence légale, de la régularité fiscale et de la conformité réglementaire des produits."},
   {titre:"Notification",texte:"Le fournisseur est informé de son enregistrement ou des pièces manquantes."}]},
 {type:'liste',titre:"Pièces généralement demandées",items:[
   "Registre de commerce et pièce d'identification fiscale",
   "Attestation de régularité fiscale en cours de validité",
   "Autorisations d'exercice pour les produits de santé",
   "Autorisations de mise sur le marché des produits proposés",
   "Références de livraisons comparables"]},
 {type:'encadre',titre:"La liste exacte fait foi dans le dossier de consultation",texte:"Les pièces ci-dessus décrivent le cas général. Chaque consultation publie sa propre liste, et c'est elle qui s'applique."}],

'fournisseurs/conditions': [
 {type:'texte',texte:"Les conditions générales d'achat s'appliquent à toute commande passée par la Centrale, sauf stipulation contraire du marché. Elles portent sur la qualité attendue, les délais, l'emballage, la facturation et les conséquences d'un manquement."},
 {type:'liste',titre:"Les engagements du fournisseur",items:[
   "Livrer des produits conformes aux spécifications du marché",
   "Garantir une durée de validité restante suffisante à la réception",
   "Respecter les conditions de transport, chaîne du froid comprise",
   "Fournir le certificat d'analyse de chaque lot livré",
   "Respecter les délais, ou signaler tout retard dès qu'il est connu"]},
 {type:'liste',titre:"Les engagements de la Centrale",items:[
   "Publier des consultations claires et des critères d'évaluation connus à l'avance",
   "Examiner les offres dans des conditions identiques pour tous",
   "Notifier le résultat aux candidats",
   "Régler les factures conformes dans les délais convenus"]},
 {type:'encadre',ton:'attention',titre:"Non-conformité",texte:"Un lot non conforme est refusé et retourné aux frais du fournisseur. Des manquements répétés peuvent entraîner une suspension de l'enregistrement."}],

'fournisseurs/documents': [
 {type:'texte',texte:"Les documents utiles aux fournisseurs sont rassemblés ici : formulaires, modèles et guides. Ils sont mis à jour à chaque campagne d'achat."},
 {type:'documents',titre:"À télécharger",items:[
   {nom:"Formulaire de demande d'enregistrement",url:"/",format:'PDF'},
   {nom:"Conditions générales d'achat",url:"/",format:'PDF'},
   {nom:"Modèle de bordereau de prix",url:"/",format:'XLSX'},
   {nom:"Guide du soumissionnaire",url:"/",format:'PDF'}]},
 {type:'encadre',ton:'info',texte:"Les fichiers ci-dessus sont des emplacements : la Centrale y déposera ses documents réels depuis l'espace d'édition. Tant qu'un document n'est pas déposé, son lien ne mène nulle part."}],

'fournisseurs/faq': [
 {type:'texte',texte:"Les questions qui reviennent le plus souvent, et leurs réponses."},
 {type:'questions',items:[
   {question:"Faut-il être enregistré pour répondre à un appel d'offres ?",reponse:"L'enregistrement facilite le suivi et l'information, mais c'est le dossier de consultation qui fixe les conditions de participation."},
   {question:"Combien de temps dure l'instruction d'un dossier ?",reponse:"Elle dépend de la complétude du dossier déposé. Un dossier incomplet est signalé, et le délai repart à la réception des pièces manquantes."},
   {question:"Comment suis-je informé des consultations ?",reponse:"Les consultations sont publiées sur la page « Appels d'offres » de ce site. Les fournisseurs enregistrés sont en outre informés pour leur domaine."},
   {question:"Mon offre a été écartée, puis-je connaître le motif ?",reponse:"Oui. Les candidats non retenus sont informés, et le motif d'écartement peut être demandé à la direction des achats."},
   {question:"La Centrale achète-t-elle hors appel d'offres ?",reponse:"Les procédures exceptionnelles existent dans des cas encadrés, notamment l'urgence sanitaire. Elles restent l'exception."}]}],

'fournisseurs/contact': [
 {type:'texte',texte:"La direction des achats est l'interlocuteur des fournisseurs : enregistrement, consultations en cours, suivi des commandes et des factures."},
 {type:'liste',titre:"Ce qu'il faut préciser dans votre message",items:[
   "Le nom et l'identification de votre société",
   "L'objet exact : enregistrement, consultation, livraison ou facturation",
   "La référence de la consultation ou de la commande concernée",
   "Un contact direct : téléphone et adresse électronique"]},
 {type:'encadre',ton:'info',texte:"Les coordonnées précises de la direction des achats — adresse, téléphone, courriel — sont à fournir par la Centrale et seront affichées ici."}],

'appels-offres/calendrier': [
 {type:'texte',texte:"Le calendrier des consultations permet aux fournisseurs d'anticiper. Il indique, par domaine, la période prévisionnelle de publication. Une date prévisionnelle n'est pas un engagement : seule la publication du dossier fait foi."},
 {type:'tableau',titre:"Périodes prévisionnelles",entetes:['Domaine','Période prévisionnelle'],lignes:[
   ['Médicaments essentiels','Premier trimestre'],
   ['Dispositifs médicaux','Deuxième trimestre'],
   ['Solutés et perfusions','Deuxième trimestre'],
   ['Consommables de laboratoire','Troisième trimestre'],
   ['Chaîne du froid','Selon les campagnes de vaccination']],
   note:"Calendrier indicatif, à remplacer par le calendrier validé de la Centrale."},
 {type:'encadre',ton:'attention',texte:"Seule la publication d'un dossier de consultation ouvre un délai de réponse. Les périodes ci-dessus ne créent aucun droit."}],

'appels-offres/comment-repondre': [
 {type:'texte',texte:"Répondre à une consultation suppose de respecter exactement ce que le dossier demande : la forme autant que le fond. Une offre techniquement excellente mais hors délai, ou sans pli séparé, est écartée sans être lue."},
 {type:'etapes',titre:"Les étapes d'une réponse",items:[
   {titre:"Retirer le dossier de consultation",texte:"Il contient les spécifications, les critères et le calendrier."},
   {titre:"Préparer l'offre technique",texte:"Conformité des produits, autorisations, conditionnement, délais de livraison."},
   {titre:"Préparer l'offre financière",texte:"Bordereau de prix au modèle fourni, sans modification de la structure du bordereau."},
   {titre:"Déposer sous pli fermé",texte:"Offres technique et financière séparées, avant la date et l'heure limites."},
   {titre:"Assister à l'ouverture",texte:"L'ouverture des plis est publique, à la date annoncée."}]},
 {type:'liste',titre:"Les motifs d'écartement les plus fréquents",items:[
   "Dépôt après la date et l'heure limites",
   "Offres technique et financière dans le même pli",
   "Bordereau de prix modifié ou incomplet",
   "Autorisation de mise sur le marché absente ou expirée",
   "Durée de validité restante insuffisante"]},
 {type:'citation',texte:"La forme n'est pas un formalisme : c'est ce qui garantit que toutes les offres sont comparées dans les mêmes conditions.",auteur:"Commission des marchés"}],

'actualites/communiques': [
 {type:'texte',texte:"Les communiqués de la Centrale portent sur ce qui engage les structures et les fournisseurs : ouverture d'une consultation, rappel de lot, changement de calendrier, rupture signalée et solution proposée."},
 {type:'encadre',ton:'info',titre:"Cette page attend ses premiers communiqués",texte:"Les communiqués sont publiés par la Centrale depuis l'espace d'édition. Aucun n'est inventé ici : une annonce fausse sur un site d'établissement public est plus grave qu'une page vide."},
 {type:'liste',titre:"Ce qui est publié ici",items:[
   "Ouverture et clôture des consultations","Avis de rappel de lot",
   "Modifications du calendrier de livraison","Informations sur les ruptures et les équivalences"]}],

'actualites/evenements': [
 {type:'texte',texte:"Rencontres avec les fournisseurs, sessions d'information des structures, journées qualité : les événements de la Centrale sont annoncés ici, avec leur date, leur lieu et les conditions de participation."},
 {type:'encadre',ton:'info',titre:"Cette page attend ses premiers événements",texte:"Les événements sont publiés par la Centrale depuis l'espace d'édition."}],

'mentions-legales': [
 {type:'texte',texte:"Cette page identifie l'éditeur du site, son hébergeur et le régime applicable aux contenus publiés."},
 {type:'tableau',entetes:['Rubrique','Information'],lignes:[
   ["Éditeur du site","Centrale Pharmaceutique d'Achats"],
   ["Statut","Établissement public"],
   ["Directeur de la publication","À compléter par la Centrale"],
   ["Siège","À compléter par la Centrale"],
   ["Contact","À compléter par la Centrale"],
   ["Hébergement","Site hébergé sur l'infrastructure Deribfy"]]},
 {type:'encadre',ton:'attention',texte:"Les mentions marquées « à compléter » sont obligatoires et doivent être renseignées par la Centrale avant toute communication officielle sur ce site."}],

'confidentialite': [
 {type:'texte',texte:"Cette page décrit les données que le site collecte, pourquoi il les collecte, et combien de temps il les conserve. Elle ne décrit que le site : les données de santé des patients ne transitent pas par lui."},
 {type:'tableau',entetes:['Donnée','Pourquoi','Conservation'],lignes:[
   ["Message envoyé par un formulaire","Répondre à la demande","Le temps du traitement"],
   ["Coordonnées d'un fournisseur","Instruire une demande d'enregistrement","Durée de l'enregistrement"],
   ["Données techniques de connexion","Sécurité et disponibilité du site","Durée courte"]]},
 {type:'liste',titre:"Vos droits",items:[
   "Demander l'accès aux données vous concernant",
   "Demander leur rectification si elles sont inexactes",
   "Demander leur effacement lorsque la conservation n'est plus justifiée",
   "Vous opposer à un traitement pour un motif légitime"]},
 {type:'encadre',ton:'attention',texte:"Le responsable du traitement et l'adresse où exercer ces droits doivent être précisés par la Centrale."}],

'accessibilite': [
 {type:'texte',texte:"Ce site vise la conformité WCAG 2.2 niveau AA. Cette page dit l'objectif, ce qui est en place, ce qui ne l'est pas encore, et comment signaler un obstacle rencontré."},
 {type:'liste',titre:"Ce qui est en place",items:[
   "Chaque image publiée porte un texte de remplacement, et une image qui n'en a pas n'est pas affichée",
   "Les animations sont désactivées si votre système demande un mouvement réduit",
   "Les tailles de texte s'adaptent à la largeur de l'écran",
   "Le focus clavier est visible sur les liens et les images",
   "Les contenus dépliables fonctionnent sans JavaScript"]},
 {type:'encadre',ton:'attention',titre:"Ce qui n'est pas encore déclaré",texte:"Une déclaration de conformité n'a de valeur que si elle est MESURÉE. L'audit d'accessibilité complet n'a pas encore été réalisé : tant qu'il ne l'est pas, cette page ne revendique aucun taux de conformité."},
 {type:'texte',texte:"Si vous rencontrez un obstacle sur ce site — un contenu illisible, un formulaire impossible à remplir, une image sans description — signalez-le à la Centrale en indiquant la page concernée et ce que vous n'avez pas pu faire."}],
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
const { data: reelles } = await srv.from('site_pages').select('chemin').eq('site_id', site.id)
const EXISTE = new Set((reelles || []).map((r) => r.chemin)); const HORS = new Set(['appels-offres','contact'])
const pb = []
for (const [d, blocs] of Object.entries(P))
  for (const b of blocs)
    for (const c of b.type === 'appel' ? [b.chemin] : (b.type === 'liens' ? b.items.map((i) => i.chemin) : [])) {
      if (!EXISTE.has(c) && !HORS.has(c)) pb.push(`lien mort /${d} → /${c}`)
      if (c.startsWith(d + '/') && !c.slice(d.length + 1).includes('/')) pb.push(`doublon /${d} → /${c}`)
    }
if (pb.length) { pb.forEach((x) => console.log('🔴 ' + x)); process.exit(1) }
console.log('🟢 aucun lien mort, aucun doublon\n')
let ok = 0, ko = 0
for (const [chemin, blocs] of Object.entries(P)) {
  const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('chemin,blocs')
  if (error || !data?.length || (data[0].blocs?.length ?? 0) !== blocs.length) {
    ko++; console.log(`  🔴 /${chemin} — ${error ? error.code + ' ' + error.message : (data?.length ? 'relecture discordante' : 'aucune ligne touchée')}`); continue
  }
  ok++; console.log(`  🟢 /${chemin} — ${blocs.length} blocs`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${ok + ko}`)
process.exit(ko === 0 ? 0 : 1)
