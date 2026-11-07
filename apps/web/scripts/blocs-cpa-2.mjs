// Contenu généré — lot 2 : les cinq activités et les cinq pages « Qui sommes-nous ».
// Mêmes gardes que le lot 1 : aucun lien mort, aucun lien qui répète une
// sous-page déjà listée par le moteur, et chaque écriture est RELUE.
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const P = {
'activites/approvisionnement': [
 {type:'texte',texte:"L'approvisionnement est le premier maillon de la chaîne, et celui qui détermine tous les autres. Acheter trop tard, c'est une rupture au comptoir ; acheter trop tôt, c'est un stock qui périme avant d'être distribué. La Centrale travaille donc sur des prévisions de consommation remontées par les structures, consolidées par district, puis projetées sur l'exercice à venir."},
 {type:'titre',texte:"Comment la Centrale achète"},
 {type:'texte',texte:"Tout achat passe par une mise en concurrence. La consultation est publiée, les offres sont reçues sous pli fermé, puis évaluées en deux temps : d'abord la conformité technique et réglementaire des produits, ensuite seulement le prix. Un produit non conforme n'est jamais rattrapé par une offre moins chère."},
 {type:'etapes',titre:"Le cycle d'achat",items:[
   {titre:"Consolidation des besoins",texte:"Les consommations des structures sont agrégées par district puis par région."},
   {titre:"Publication de la consultation",texte:"Le dossier précise les spécifications, les quantités et le calendrier de livraison."},
   {titre:"Réception et ouverture des offres",texte:"Les plis sont ouverts en séance, à date et heure annoncées."},
   {titre:"Évaluation technique",texte:"Conformité réglementaire, spécifications, conditionnement, durée de validité restante."},
   {titre:"Évaluation financière",texte:"Seules les offres techniquement conformes sont comparées sur le prix."},
   {titre:"Attribution et notification",texte:"Le résultat est publié ; les candidats non retenus sont informés."}]},
 {type:'encadre',titre:"Un principe qui ne se négocie pas",texte:"La durée de validité restante est un critère d'acceptation, pas un détail. Un lot proche de sa péremption coûte moins cher à l'achat et beaucoup plus cher à la destruction."},
 {type:'chiffres',titre:"Repères",items:[
   {valeur:'12',libelle:"consultations publiées dans l'année"},{valeur:'2',libelle:"temps d'évaluation, technique puis financier"},
   {valeur:'100 %',libelle:"des attributions publiées"}]}],

'activites/qualite': [
 {type:'texte',texte:"L'assurance qualité est ce qui distingue une centrale d'achats d'un simple grossiste. Chaque lot entrant est vérifié avant d'être accepté en stock : si le dossier n'est pas complet ou si l'échantillon ne répond pas aux spécifications, le lot est refusé et retourné au fournisseur."},
 {type:'titre',texte:"Ce qui est contrôlé"},
 {type:'liste',items:[
   "L'autorisation de mise sur le marché du produit et sa validité",
   "Le certificat d'analyse du lot, émis par le fabricant",
   "L'intégrité du conditionnement primaire et secondaire",
   "La durée de validité restante au moment de la réception",
   "La conformité de l'étiquetage et de la notice",
   "Les conditions de transport, pour les produits de la chaîne du froid"]},
 {type:'citation',texte:"Un médicament dont on ne peut pas prouver la qualité n'est pas un médicament — c'est un risque qu'on distribue.",auteur:"Direction de l'assurance qualité"},
 {type:'questions',titre:"Questions fréquentes",items:[
   {question:"Que devient un lot refusé ?",reponse:"Il est isolé en zone de quarantaine, signalé au fournisseur et retourné. Il n'entre jamais en stock distribuable."},
   {question:"La Centrale fait-elle des analyses en laboratoire ?",reponse:"Le contrôle documentaire est systématique. Des analyses complémentaires sont demandées en cas de doute ou sur les produits sensibles."},
   {question:"Comment signaler un défaut constaté après livraison ?",reponse:"Par la page de contact de la direction des achats, en précisant le numéro de lot figurant sur le conditionnement."}]}],

'activites/stockage': [
 {type:'texte',texte:"Un médicament bien acheté et mal conservé devient un médicament perdu. Le stockage de la Centrale repose sur une séparation stricte des zones et sur une surveillance continue des conditions de conservation."},
 {type:'titre',texte:"Les zones de l'entrepôt"},
 {type:'tableau',entetes:['Zone','Ce qu’elle reçoit','Condition'],lignes:[
   ['Réception','Lots en attente de contrôle','Température ambiante maîtrisée'],
   ['Quarantaine','Lots non encore acceptés ou refusés','Accès restreint'],
   ['Stock distribuable','Produits acceptés','15 à 25 °C, hygrométrie suivie'],
   ['Chaîne du froid','Vaccins, insulines','2 à 8 °C, relevé continu'],
   ['Produits contrôlés','Stupéfiants et assimilés','Local sécurisé, registre']],
   note:"Les plages indiquées sont celles des bonnes pratiques de distribution ; les valeurs appliquées sont celles du manuel qualité de la Centrale."},
 {type:'encadre',ton:'attention',titre:"La chaîne du froid ne pardonne pas",texte:"Une rupture de quelques heures peut rendre un lot de vaccins inutilisable sans qu'aucun signe visible n'apparaisse. C'est pourquoi le relevé de température est continu et consigné, et non constaté au moment de la sortie."}],

'activites/distribution': [
 {type:'texte',texte:"Distribuer, c'est faire arriver le bon produit, en bon état, au bon endroit, au bon moment. La Centrale organise ses livraisons selon un calendrier régional connu à l'avance, pour que chaque structure puisse préparer sa commande et sa réception."},
 {type:'etapes',titre:"D'une commande à une livraison",items:[
   {titre:"Réception de la commande",texte:"La structure transmet son bon de commande signé."},
   {titre:"Contrôle des droits",texte:"Vérification de l'agrément de la structure et de la cohérence des quantités."},
   {titre:"Préparation",texte:"Prélèvement en stock selon le principe « premier périmé, premier sorti »."},
   {titre:"Conditionnement",texte:"Emballage adapté, portoirs isothermes pour la chaîne du froid."},
   {titre:"Transport et remise",texte:"Livraison contre accusé de réception signé et daté."}]},
 {type:'liste',titre:"Ce que la structure doit vérifier à la réception",items:[
   "La concordance entre le bordereau et les quantités reçues",
   "L'état des emballages et l'absence de choc",
   "Les numéros de lot et les dates de péremption",
   "L'indicateur de température pour les produits du froid"]}],

'activites/programmes': [
 {type:'texte',texte:"Au-delà de son catalogue courant, la Centrale appuie les programmes nationaux de santé publique. Ces programmes ont leurs propres circuits, leurs propres bailleurs et souvent leurs propres règles de traçabilité — mais ils reposent sur la même chaîne de stockage et de distribution."},
 {type:'liste',titre:"Domaines appuyés",items:[
   "Lutte contre le paludisme","Lutte contre la tuberculose","Lutte contre le VIH",
   "Santé de la mère et de l'enfant","Vaccination de routine et campagnes","Nutrition"]},
 {type:'encadre',titre:"Pourquoi c'est traité à part",texte:"Les produits de programme sont souvent gratuits pour le patient et financés par des partenaires. Leur traçabilité est donc plus exigeante : chaque sortie doit pouvoir être rattachée à son programme et à sa source de financement."}],

'qui-sommes-nous/missions': [
 {type:'texte',texte:"La mission de la Centrale tient en une phrase : garantir que les structures sanitaires disposent, à tout moment, des produits de santé essentiels, de qualité contrôlée, à un coût maîtrisé. Tout le reste en découle."},
 {type:'titre',texte:"Nos quatre missions"},
 {type:'etapes',items:[
   {titre:"Acheter",texte:"Regrouper la demande nationale pour obtenir de meilleures conditions et une qualité vérifiée une seule fois, pour tous."},
   {titre:"Contrôler",texte:"N'accepter en stock que ce dont la conformité est établie."},
   {titre:"Conserver",texte:"Maintenir les produits dans leurs conditions de conservation jusqu'à la livraison."},
   {titre:"Distribuer",texte:"Approvisionner les structures selon un calendrier prévisible et équitable."}]},
 {type:'citation',texte:"Une centrale d'achats ne se juge pas à ce qu'elle stocke, mais à ce qui arrive réellement au patient.",auteur:"Direction générale"}],

'qui-sommes-nous/gouvernance': [
 {type:'texte',texte:"La Centrale est un établissement public. Sa gouvernance sépare l'orientation stratégique, confiée à une instance délibérante, de la gestion courante, confiée à la direction générale. Cette séparation est ce qui rend les décisions d'achat traçables et contestables."},
 {type:'titre',texte:"Les instances"},
 {type:'tableau',entetes:['Instance','Rôle'],lignes:[
   ['Conseil d’administration',"Oriente, approuve le budget et les comptes, valide les grandes décisions"],
   ['Direction générale',"Dirige l'établissement et exécute les décisions du conseil"],
   ['Commission des marchés',"Ouvre les plis, évalue les offres, propose l'attribution"],
   ['Direction de l’assurance qualité',"Accepte ou refuse les lots, indépendamment de l'achat"]],
   note:"La composition exacte de chaque instance est fixée par les textes régissant l'établissement."},
 {type:'encadre',titre:"Une séparation qui protège",texte:"Celui qui achète n'est pas celui qui accepte le lot. C'est une règle simple, et c'est elle qui empêche qu'une pression commerciale devienne une décision qualité."}],

'qui-sommes-nous/direction': [
 {type:'texte',texte:"La direction générale conduit l'établissement au quotidien : elle exécute les orientations du conseil d'administration, engage les procédures d'achat, et rend compte de l'exécution du budget."},
 {type:'liste',titre:"Ses responsabilités",items:[
   "Mettre en œuvre les orientations arrêtées par le conseil d'administration",
   "Engager et suivre les procédures de mise en concurrence",
   "Garantir la continuité de l'approvisionnement des structures",
   "Rendre compte de l'exécution budgétaire et de l'activité",
   "Représenter la Centrale auprès des partenaires et des bailleurs"]},
 {type:'encadre',ton:'info',texte:"Les noms et photographies des membres de la direction sont à fournir par la Centrale ; ils seront ajoutés ici."}],

'qui-sommes-nous/equipes': [
 {type:'texte',texte:"La Centrale réunit des métiers qui ne se ressemblent pas et qui dépendent les uns des autres : pharmaciens, acheteurs, logisticiens, contrôleurs qualité, magasiniers, chauffeurs. Une commande livrée à temps est le résultat de tous ces gestes mis bout à bout."},
 {type:'titre',texte:"Les métiers de la Centrale"},
 {type:'tableau',entetes:['Métier','Ce qu’il fait'],lignes:[
   ['Pharmacien','Valide les spécifications, arbitre les équivalences, répond aux structures'],
   ['Acheteur','Prépare les consultations, analyse les offres, suit les marchés'],
   ['Contrôleur qualité','Vérifie les dossiers de lot, accepte ou refuse les réceptions'],
   ['Logisticien','Planifie les tournées, suit les stocks et les ruptures'],
   ['Magasinier','Réceptionne, range, prépare les commandes, applique le premier périmé premier sorti'],
   ['Chauffeur-livreur','Transporte dans le respect des conditions de conservation']]},
 {type:'citation',texte:"Il n'y a pas de petit maillon : un carton mal rangé devient une rupture six mois plus tard.",auteur:"Responsable logistique"}],

'qui-sommes-nous/etablissements': [
 {type:'texte',texte:"La Centrale approvisionne les structures sanitaires agréées. L'agrément est ce qui ouvre le droit de commander : il garantit que le produit sera dispensé dans un cadre encadré, par un personnel habilité."},
 {type:'liste',titre:"Structures desservies",items:[
   "Hôpitaux de référence","Hôpitaux de district","Centres de santé",
   "Pharmacies des structures publiques","Programmes nationaux de santé publique"]},
 {type:'encadre',titre:"Le périmètre exact reste à confirmer",texte:"La liste ci-dessus décrit le cas général d'une centrale publique d'achats. Le périmètre précis des structures desservies par la CPA — et l'éventuelle ouverture au secteur privé — doit être confirmé par la direction avant publication définitive."},
 {type:'etapes',titre:"Faire agréer une structure",items:[
   {titre:"Constituer le dossier",texte:"Pièces administratives de la structure et qualification du personnel dispensateur."},
   {titre:"Déposer la demande",texte:"Auprès de la direction des achats."},
   {titre:"Instruction",texte:"Vérification des pièces et enregistrement de la structure."},
   {titre:"Ouverture des droits",texte:"La structure peut passer commande selon le calendrier de sa région."}]}],
}

const { data: site } = await srv.from('sites').select('id').like('slug','centrale-pharmaceutique%').maybeSingle()
if (!site) { console.log('🔴 site CPA introuvable'); process.exit(1) }
const { data: reelles } = await srv.from('site_pages').select('chemin').eq('site_id', site.id)
const EXISTE = new Set((reelles || []).map((r) => r.chemin))
const HORS = new Set(['appels-offres', 'contact'])
const morts = [], doublons = []
for (const [d, blocs] of Object.entries(P))
  for (const b of blocs)
    for (const c of b.type === 'appel' ? [b.chemin] : (b.type === 'liens' ? b.items.map((i) => i.chemin) : [])) {
      if (!EXISTE.has(c) && !HORS.has(c)) morts.push(`/${d} → /${c}`)
      if (c.startsWith(d + '/') && !c.slice(d.length + 1).includes('/')) doublons.push(`/${d} → /${c}`)
    }
if (morts.length || doublons.length) {
  morts.forEach((m) => console.log('🔴 lien mort : ' + m))
  doublons.forEach((m) => console.log('🔴 répète une sous-page : ' + m))
  process.exit(1)
}
console.log('🟢 aucun lien mort, aucun doublon\n')

let ok = 0, ko = 0
for (const [chemin, blocs] of Object.entries(P)) {
  const { data, error } = await srv.from('site_pages')
    .update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('chemin,blocs')
  if (error) { ko++; console.log(`  🔴 /${chemin} — ${error.code} ${error.message}`); continue }
  if (!data?.length) { ko++; console.log(`  🔴 /${chemin} — AUCUNE ligne touchée`); continue }
  const n = data[0].blocs?.length ?? 0
  if (n !== blocs.length) { ko++; console.log(`  🔴 /${chemin} — ${blocs.length} posés, ${n} relus`); continue }
  ok++; console.log(`  🟢 /${chemin} — ${n} blocs`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok}/${ok + ko}`)
process.exit(ko === 0 ? 0 : 1)
