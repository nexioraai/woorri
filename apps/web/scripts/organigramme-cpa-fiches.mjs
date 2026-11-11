// CPA — remplit les 9 fiches de l'organigramme (demande du 2026-11-11) :
// portrait + mot + missions, comme la page « Mot de la DG » d'anie.td.
//
// CONTENU D'EXEMPLE, assumé : photos de banque d'images (Pexels, déjà la source
// des photos du site) et textes rédigés pour la fonction. L'informaticien de la
// CPA les remplace dans /edit par les vraies photos et les vrais mots. Aucun
// NOM de personne n'est inventé : chaque mot est signé par la fonction. Les
// sigles DDM, GPP et SG ne sont pas développés : on ne sait pas encore ce
// qu'ils recouvrent.
//
// GARDE : une fiche n'est remplacée que si elle contient ENCORE le contenu
// provisoire posé par organigramme-cpa-publier.mjs. Une fiche déjà retouchée
// dans /edit n'est jamais écrasée.
//
//   node --env-file=.env.local scripts/organigramme-cpa-fiches.mjs
import { createClient } from '@supabase/supabase-js'
const srv = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const PARENT = 'qui-sommes-nous/direction'
const portrait = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop`
const large = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop`
const CPA = "Centrale Pharmaceutique d'Achats"
const retour = { type: 'appel', libelle: "Retour à l'organigramme", chemin: PARENT }
const mot = (photo, titre, auteur, texte) => ({ type: 'citation', photo: portrait(photo), titre, auteur, fonction: CPA, texte })
const missions = (items) => [{ type: 'titre', texte: 'Ses missions' }, { type: 'liste', items }]

const FICHES = {
  'conseil-d-administration': [
    { type: 'image', url: large(30688596), alt: "Réunion du conseil d'administration" },
    { type: 'texte', texte: "Le conseil d'administration est l'instance délibérante de la Centrale. Il fixe les grandes orientations, adopte le budget et les comptes, et veille à ce que la Centrale remplisse sa mission de service public : rendre les médicaments essentiels disponibles, de qualité et au juste prix, dans les structures sanitaires du pays." },
    { type: 'titre', texte: 'Composition' },
    { type: 'tableau', entetes: ['Fonction', 'Représentation'], lignes: [
      ['Président du conseil', 'Désigné par les textes de la Centrale'],
      ['Administrateur', 'Ministère chargé de la Santé publique'],
      ['Administrateur', 'Ministère chargé des Finances'],
      ['Administrateur', 'Partenaires techniques et financiers'],
      ['Administrateur', 'Représentant du personnel'],
    ], note: 'La composition exacte est fixée par les textes qui régissent la Centrale.' },
    ...missions([
      'Fixer les orientations stratégiques de la Centrale',
      'Adopter le budget et approuver les comptes',
      'Valider les décisions engageant durablement la Centrale',
      "Contrôler l'action de la direction générale",
    ]),
    retour,
  ],
  'directeur-general': [
    mot(5060805, 'Mot du Directeur général', 'Le Directeur général',
      "Bienvenue sur le site de la Centrale Pharmaceutique d'Achats. Notre mission est simple à énoncer et exigeante à tenir : mettre à la disposition des structures sanitaires publiques des médicaments essentiels de qualité, au bon moment et au juste prix.\n\nChaque achat que nous engageons est publié, chaque lot que nous recevons est contrôlé, chaque livraison est suivie. Cette transparence est notre engagement envers les patients, les structures de santé et nos partenaires.\n\nCe site est une porte ouverte : fournisseurs, structures sanitaires et partenaires y trouveront l'information dont ils ont besoin pour travailler avec nous."),
    ...missions([
      "Diriger la Centrale et mettre en œuvre les décisions du conseil d'administration",
      "Engager les procédures d'achat et en garantir la transparence",
      "Assurer la continuité de l'approvisionnement des structures sanitaires",
      'Représenter la Centrale auprès des autorités et des partenaires',
    ]),
    retour,
  ],
  'assurance-qualite': [
    mot(3894384, "Mot du responsable de l'assurance qualité", "Responsable de l'assurance qualité",
      "Un médicament n'a de valeur que s'il est sûr et efficace. Notre rôle est de le garantir, lot après lot, depuis la réception jusqu'à la sortie de nos magasins.\n\nAucun produit n'est mis à la disposition des structures sans avoir été contrôlé et documenté. Cette exigence protège les patients, et elle protège la confiance que l'on accorde à la Centrale."),
    ...missions([
      'Contrôler chaque lot à sa réception',
      'Tenir à jour les dossiers de lot et la traçabilité',
      'Gérer la quarantaine et les produits non conformes',
      'Suivre les réclamations qualité et leurs suites',
    ]),
    retour,
  ],
  'division-appro': [
    mot(32064778, 'Mot du chef de la division Appro', 'Chef de la division Appro',
      "Approvisionner, c'est anticiper. Nous recensons les besoins des structures, nous les consolidons et nous planifions les achats pour que les produits arrivent avant que le manque ne se fasse sentir.\n\nNotre équipe travaille en lien étroit avec les fournisseurs et avec les magasins de la Centrale, pour que chaque commande soit passée au bon moment et livrée dans les délais."),
    ...missions([
      'Recenser et consolider les besoins des structures sanitaires',
      "Préparer et suivre les plans d'approvisionnement",
      'Suivre les commandes et les délais des fournisseurs',
      "Coordonner la logistique d'entrée avec les logisticiens",
    ]),
    retour,
  ],
  'division-ddm': [
    mot(5669603, 'Mot du chef de la division DDM', 'Chef de la division DDM',
      "Notre division fait le lien entre la Centrale et les structures qu'elle sert. Nous recevons les commandes, nous les traitons et nous veillons à ce que chaque livraison arrive complète et à temps.\n\nÀ l'écoute des structures, nous suivons chaque commande jusqu'à sa livraison et nous signalons sans attendre tout écart."),
    ...missions([
      'Recevoir et traiter les commandes des structures',
      'Organiser et contrôler les livraisons',
      'Assurer le suivi commercial avec les structures clientes',
      'Signaler et traiter les écarts de livraison',
    ]),
    retour,
  ],
  gpp: [
    mot(33844626, 'Mot du responsable de GPP', 'Responsable de GPP',
      "Notre service veille sur des produits qui demandent une attention particulière, du magasin jusqu'à leur sortie. Rigueur des entrées et des sorties, suivi des quantités, traçabilité : c'est ce qui permet de rendre compte à tout moment.\n\nAvec nos magasiniers, nous garantissons que ce qui est confié à la Centrale est conservé dans les règles et disponible quand on en a besoin."),
    ...missions([
      'Organiser la gestion des stocks confiés au service',
      'Encadrer le magasinier chef et les magasiniers',
      'Assurer la traçabilité des entrées et des sorties',
      'Rendre compte régulièrement des niveaux de stock',
    ]),
    retour,
  ],
  'division-gestion-de-stock': [
    mot(5467565, 'Mot du chef de la division gestion de stock', 'Chef de la division gestion de stock',
      "Un stock bien tenu est un stock qui se compte, se range et se surveille. Nos magasins conservent les produits dans les conditions qu'ils exigent, et chaque mouvement y est enregistré.\n\nNotre objectif : que le bon produit soit disponible, au bon endroit, en bon état, au moment où une structure en a besoin."),
    ...missions([
      'Organiser la réception, le rangement et la conservation des produits',
      'Encadrer les magasins et leurs équipes',
      'Tenir les inventaires et suivre les dates de péremption',
      'Préparer les sorties de stock pour les livraisons',
    ]),
    retour,
  ],
  'division-administrative-et-financiere': [
    mot(9304685, 'Mot du chef de la division administrative et financière', 'Chef de la division administrative et financière',
      "Une centrale d'achats bien gérée est une centrale qui peut rendre compte de chaque franc. Notre division tient la comptabilité, suit le budget, règle les fournisseurs et assure le recouvrement.\n\nElle veille aussi aux femmes et aux hommes de la Centrale, à ses moyens matériels et à ses outils informatiques, sans lesquels rien ne fonctionne."),
    ...missions([
      'Tenir la comptabilité et suivre l’exécution du budget',
      'Régler les fournisseurs et assurer le recouvrement',
      'Gérer les ressources humaines',
      'Gérer le matériel et les moyens informatiques',
    ]),
    retour,
  ],
  'controleur-interne-de-gestion': [
    mot(20209020, 'Mot du contrôleur interne de gestion', 'Contrôleur interne de gestion',
      "Le contrôle interne n'est pas une sanction : c'est une assurance. Nous vérifions que les procédures sont appliquées, que les risques sont connus et que les décisions laissent une trace.\n\nC'est cette discipline qui permet à la Centrale de rendre compte à son conseil, à ses partenaires et au public."),
    ...missions([
      "Vérifier l'application des procédures internes",
      'Identifier et évaluer les risques',
      'Conduire des missions de contrôle',
      'Formuler des recommandations et en suivre la mise en œuvre',
    ]),
    retour,
  ],
}

const { data: site } = await srv.from('sites').select('id').like('slug', 'centrale-pharmaceutique%').maybeSingle()
let ok = 0, ko = 0
for (const [slug, blocs] of Object.entries(FICHES)) {
  const chemin = `${PARENT}/${slug}`
  const { data: page } = await srv.from('site_pages').select('blocs').eq('site_id', site.id).eq('chemin', chemin).maybeSingle()
  if (!page) { ko++; console.log(`  🔴 /${chemin} absente`); continue }
  const provisoire = page.blocs.length === 2 && page.blocs[0].type === 'encadre' && /ser(a|ont) publiée?s? ici/.test(page.blocs[0].texte) && page.blocs[1].type === 'appel'
  if (!provisoire) { console.log(`  ⚪ /${chemin} déjà retouchée : non écrasée`); continue }
  const { data, error } = await srv.from('site_pages').update({ blocs, maj_le: new Date().toISOString() })
    .eq('site_id', site.id).eq('chemin', chemin).select('blocs')
  if (error || data?.[0]?.blocs?.length !== blocs.length) { ko++; console.log(`  🔴 /${chemin} — ${error?.message ?? 'relecture différente'}`); continue }
  ok++; console.log(`  🟢 /${chemin} — ${blocs.length} blocs`)
}
console.log(`\n${ko === 0 ? '🟢' : '🔴'} ${ok} fiche(s) remplie(s), ${ko} échec(s)`)
process.exit(ko ? 1 : 0)
