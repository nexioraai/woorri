/**
 * LES 29 PAGES DU SITE CPA — posées par le plan, pas à la main.
 *
 * ── POURQUOI UN SCRIPT ET PAS DES CLICS.
 *
 * Le propriétaire l'a dit et il a raison : ce n'est pas à lui de créer les
 * pages. L'arborescence vient de `docs/cpa/PLAN.md`, qui vient lui-même du
 * cahier des charges de la CPA et de l'analyse d'EPSS. Elle se pose d'un
 * geste, se rejoue, et se compare.
 *
 * ── LES TEXTES SONT DES AMORCES, ET ILS LE DISENT.
 *
 * Aucun FAIT n'est inventé : ni chiffre, ni date, ni nom, ni document. Chaque
 * page porte un chapeau qui décrit ce qu'elle CONTIENDRA, et un corps qui
 * nomme explicitement ce que la CPA doit y mettre. C'est la loi du produit :
 * rien ne s'affiche sans sa source.
 *
 * ── REJOUABLE. `upsert` sur (site_id, chemin) : relancer met à jour, ne
 * duplique pas. Et `publie` n'est JAMAIS écrasé sur une page existante —
 * sinon un passage du script dépublierait le travail de la CPA.
 */
import { clientAdmin } from './temoin-en-base.mjs'

const SLUG = 'centrale-pharmaceutique-d-achats-cpa-1793979506814'
const sb = clientAdmin('.')

const A = (chemin, titre, chapeau, parent = null, ordre = 0, menu = true, corps = null) =>
  ({ chemin, titre, chapeau, parent, ordre, menu, corps })

const AREMPLIR = (quoi) =>
  `À COMPLÉTER PAR LA CPA — ${quoi}\n\n` +
  `Cette page est en place et son adresse est publiée. Son contenu reste à ` +
  `fournir par la Centrale : rien n'est écrit ici à sa place, et aucun ` +
  `chiffre, date, nom ou document n'est inventé.`

const PAGES = [
  // 1 · QUI SOMMES-NOUS
  A('qui-sommes-nous', 'Qui sommes-nous', "La Centrale Pharmaceutique d'Achats, son mandat, son organisation et les structures qu'elle dessert.", null, 10),
  A('qui-sommes-nous/histoire', 'Notre histoire', "Les étapes de la Centrale depuis sa création.", 'qui-sommes-nous', 1, true, AREMPLIR("année de création, texte fondateur, statut juridique exact, jalons datés")),
  A('qui-sommes-nous/missions', 'Nos missions', "Rendre le médicament disponible, en garantir la qualité, en maîtriser le prix, servir tout le territoire aux mêmes conditions.", 'qui-sommes-nous', 2, true, AREMPLIR("formulation validée des missions et leurs indicateurs de suivi")),
  A('qui-sommes-nous/gouvernance', 'Organisation et gouvernance', "Qui décide, et sous quel contrôle : conseil d'administration, direction générale, commission des marchés, organes de contrôle.", 'qui-sommes-nous', 3, true, AREMPLIR("composition du conseil, organigramme, textes de référence — publication des noms après autorisation explicite de la Direction")),
  A('qui-sommes-nous/direction', 'Direction générale', "L'équipe dirigeante de la Centrale.", 'qui-sommes-nous', 4, true, AREMPLIR("noms et fonctions — après autorisation explicite de la Direction")),
  A('qui-sommes-nous/equipes', 'Les métiers de la Centrale', "Pharmacie et assurance qualité, achats et marchés, logistique et entrepôt, distribution, fonctions support.", 'qui-sommes-nous', 5, true, AREMPLIR("effectifs par direction et offres d'emploi s'il y en a")),
  A('qui-sommes-nous/etablissements', 'Les établissements desservis', "Hôpitaux nationaux et provinciaux, hôpitaux de district, centres de santé et programmes nationaux. La Centrale ne livre pas les officines privées.", 'qui-sommes-nous', 6, true, AREMPLIR("nombre de structures livrées par province et point de livraison de rattachement")),
  A('qui-sommes-nous/chiffres-cles', 'Chiffres clés', "L'activité de la Centrale en chiffres, chacun avec son année et sa source.", 'qui-sommes-nous', 7, true, AREMPLIR("établissements desservis, références au catalogue, fournisseurs référencés, provinces couvertes — un chiffre sans source ne s'affiche pas")),

  // 2 · NOS ACTIVITÉS
  A('activites', 'Nos activités', "Entre le laboratoire qui fabrique et le patient qui reçoit, il y a une chaîne de quatre maillons. La Centrale tient les quatre.", null, 20),
  A('activites/approvisionnement', 'Approvisionnement et achats', "Estimer les besoins, mettre en concurrence, contractualiser, suivre l'exécution lot par lot.", 'activites', 1, true, AREMPLIR("procédures réellement appliquées et calendrier de quantification")),
  A('activites/qualite', 'Assurance qualité', "Rien ne sort sans avoir été contrôlé : qualification des fournisseurs, quarantaine à la réception, libération ou refus, pharmacovigilance.", 'activites', 2, true, AREMPLIR("procédures de contrôle, laboratoire de référence, circuit de rappel de lot")),
  A('activites/stockage', 'Stockage et conservation', "Garder un médicament dans l'état où il a été fabriqué : zones séparées, chaîne du froid surveillée, péremptions suivies par lot.", 'activites', 3, true, AREMPLIR("surface de l'entrepôt, capacité froid, sites de stockage déconcentrés")),
  A('activites/distribution', 'Distribution et logistique', "De l'entrepôt au centre de santé : commande, préparation, contrôle, chargement, livraison contre bon de réception signé.", 'activites', 4, true, AREMPLIR("calendrier des tournées par province et modalités de suivi d'une livraison")),
  A('activites/programmes', 'Programmes de santé publique', "Les produits des programmes nationaux, avec un suivi séparé par programme et par bailleur.", 'activites', 5, true, AREMPLIR("liste exacte des programmes et de leurs bailleurs")),

  // 3 · CATALOGUE
  A('catalogue', 'Catalogue des produits', "Les références que la Centrale met à disposition des structures sanitaires publiques. Le catalogue ne remplace pas une prescription.", null, 30),
  A('catalogue/categories', 'Catégories et familles', "Les produits classés par forme, par classe thérapeutique et par programme.", 'catalogue', 1, true, AREMPLIR("arborescence des catégories retenue par la CPA")),
  A('catalogue/commander', 'Passer une commande', "Pour les structures sanitaires : circuit de commande, contrôle de la cotation, préparation et livraison.", 'catalogue', 2, true, AREMPLIR("procédure de commande en vigueur et pièces exigées")),

  // 4 · APPELS D'OFFRES — la liste et la fiche sont déjà servies par leur propre route
  A('appels-offres/comment-repondre', "Comment répondre à un appel d'offres", "Six étapes : lire l'avis en entier, retirer le dossier, vérifier son éligibilité, constituer l'offre, déposer avant l'heure, assister à l'ouverture des plis.", null, 41, false, AREMPLIR("adresse de retrait du dossier, montants, et modalités de dépôt en vigueur")),
  A('appels-offres/calendrier', 'Calendrier prévisionnel', "Les consultations envisagées par trimestre. Chaque ligne est prévisionnelle et non engageante : une date de calendrier n'est pas un avis publié.", null, 42, false, AREMPLIR("consultations envisagées, par trimestre")),

  // 5 · FOURNISSEURS
  A('fournisseurs', 'Espace fournisseurs', "Ce qu'un fournisseur doit savoir avant de soumissionner : conditions d'accès, documents, questions fréquentes et contact de la direction des achats.", null, 50),
  A('fournisseurs/enregistrement', 'Devenir fournisseur', "Il n'y a pas de référencement préalable obligatoire : tout appel d'offres est ouvert. Se faire connaître permet d'être averti des consultations de son domaine.", 'fournisseurs', 1, true, AREMPLIR("conditions d'accès applicables et pièces justificatives exigées")),
  A('fournisseurs/conditions', "Conditions générales d'achat", "Ce que la Centrale exige et ce à quoi elle s'engage : spécifications, conditionnement, réception, délais de paiement, pénalités, règlement des litiges.", 'fournisseurs', 2, true, AREMPLIR("conditions réellement applicables et lien vers le document officiel")),
  A('fournisseurs/documents', 'Documents à télécharger', "Modèles de soumission, conditions générales d'achat, formulaires de qualification, notices techniques.", 'fournisseurs', 3, true, AREMPLIR("les documents eux-mêmes — un document sans fichier ne s'affiche pas")),
  A('fournisseurs/faq', 'Questions fréquentes', "Avant de soumissionner, constituer l'offre, après l'ouverture des plis, exécution et paiement.", 'fournisseurs', 4, true, AREMPLIR("les réponses de la CPA à chacune des questions")),
  A('fournisseurs/contact', 'Contact de la direction des achats', "Toute question sur un avis en cours se pose par écrit, en citant la référence. Les réponses utiles à tous sont publiées sur la fiche de l'avis.", 'fournisseurs', 5, true, AREMPLIR("adresse et coordonnées de la direction des achats")),

  // 6 · ACTUALITÉS
  A('actualites/evenements', 'Agenda', "Réunions d'information aux fournisseurs, séances publiques d'ouverture des plis, journées techniques.", null, 61, false, AREMPLIR("les événements réels, avec date, heure et lieu")),
  A('actualites/communiques', 'Communiqués', "Les textes officiels de l'établissement : rappels de lots, mises au point, avis d'information aux structures sanitaires.", null, 62, false, AREMPLIR("les communiqués réels, signés de la direction générale")),

  // 7 · PAGES LÉGALES — hors menu, atteintes par le pied de page
  A('mentions-legales', 'Mentions légales', "Dénomination et statut juridique, autorité de tutelle, siège, directeur de la publication, hébergeur, propriété intellectuelle.", null, 90, false, AREMPLIR("les six rubriques — une mention légale inventée est plus grave qu'une mention absente")),
  A('confidentialite', 'Politique de confidentialité', "Ce que le site collecte, pourquoi, combien de temps il le garde, à qui il le transmet, et comment exercer ses droits.", null, 91, false, AREMPLIR("la politique réellement appliquée par la CPA")),
  A('accessibilite', 'Accessibilité', "Le site vise la conformité WCAG 2.2 niveau AA. Cette page dit l'objectif, l'état mesuré, ce qui n'est pas encore conforme, et comment signaler un obstacle.", null, 92, false, AREMPLIR("l'état mesuré — une déclaration de conformité totale non mesurée est un mensonge d'interface")),
]

const { data: site, error: eSite } = await sb.from('sites').select('id').eq('slug', SLUG).single()
if (eSite) { console.error('site introuvable :', eSite.code); process.exit(1) }

// `publie` n'est JAMAIS écrasé sur une page existante.
const { data: deja } = await sb.from('site_pages').select('chemin,publie').eq('site_id', site.id)
const etat = new Map((deja ?? []).map((p) => [p.chemin, p.publie]))

const lignes = PAGES.map((p) => ({ ...p, site_id: site.id, publie: etat.get(p.chemin) ?? true }))
const r = await sb.from('site_pages').upsert(lignes, { onConflict: 'site_id,chemin' }).select('chemin')
if (r.error) { console.error('🔴 POSE IMPOSSIBLE :', r.error.code, r.error.message.slice(0, 90)); process.exit(1) }

const n = await sb.from('site_pages').select('chemin', { count: 'exact', head: true }).eq('site_id', site.id)
console.log(`  posées/mises à jour : ${r.data.length}`)
console.log(`  pages du site CPA   : ${n.count}`)
console.log(`  racines de menu     : ${PAGES.filter((p) => !p.parent && p.menu).length}`)
