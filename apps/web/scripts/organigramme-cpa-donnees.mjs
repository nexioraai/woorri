// L'organigramme de la CPA, recopié de l'image fournie par l'informaticien de
// la CPA (« Organigramme-3-1024x620.png », reçue le 2026-11-11).
//
// RECOPIÉ, PAS RÉÉCRIT. Les intitulés sont ceux de l'image, mot pour mot, en
// capitales comme sur l'image. Trois retouches seulement, toutes des coupures
// de ligne de l'image, pas des mots : « TRAITEMENTC OMMANDE » → « TRAITEMENT
// COMMANDE », « MAGASINIERC HEF » → « MAGASINIER CHEF » (deux fois). Le double
// espace de « RESPONSABLE DE  GPP » est ramené à un seul.
//
// Ce qui n'est PAS reproduit : les deux traits pointillés qui relient le
// conseil d'administration à l'assurance qualité et au contrôleur interne de
// gestion. Ces deux postes sont placés sous la direction, comme leur trait
// plein sur l'image.
//
// Couleurs : celles de l'image (bleu, orange, vert ; sans couleur = blanc).

const F = 'qui-sommes-nous/direction'

/** Les pages-fiches : une par boîte cliquable. */
export const FICHES = [
  { cle: 'ca', slug: 'conseil-d-administration', titre: "Conseil d'administration", chapeau: "Les membres du conseil d'administration de la Centrale.",
    attente: "La liste des membres du conseil d'administration sera publiée ici dès qu'elle aura été transmise par la Centrale." },
  { cle: 'dir', slug: 'directeur-general', titre: 'Direction', chapeau: 'Le directeur général de la Centrale.' },
  { cle: 'aq', slug: 'assurance-qualite', titre: 'Assurance qualité', chapeau: "Le responsable de l'assurance qualité." },
  { cle: 'appro', slug: 'division-appro', titre: 'Chef division Appro', chapeau: 'Le chef de la division Appro.' },
  { cle: 'ddm', slug: 'division-ddm', titre: 'Chef division DDM', chapeau: 'Le chef de la division DDM.' },
  { cle: 'gpp', slug: 'gpp', titre: 'Responsable de GPP', chapeau: 'Le responsable de GPP.' },
  { cle: 'gs', slug: 'division-gestion-de-stock', titre: 'Chef division gestion de stock', chapeau: 'Le chef de la division gestion de stock.' },
  { cle: 'daf', slug: 'division-administrative-et-financiere', titre: 'Chef division administrative & financière', chapeau: 'Le chef de la division administrative et financière.' },
  { cle: 'cig', slug: 'controleur-interne-de-gestion', titre: 'Contrôleur interne de gestion', chapeau: 'Le contrôleur interne de gestion.' },
]
const lienDe = (cle) => { const f = FICHES.find((x) => x.cle === cle); return f ? `${F}/${f.slug}` : undefined }

const e = (cle, parent, fonction, couleur, extra = {}) => ({
  cle, ...(parent ? { parent } : {}), fonction, nom: '',
  ...(couleur ? { couleur } : {}), ...(lienDe(cle) ? { lien: lienDe(cle) } : {}), ...extra,
})

export const ITEMS = [
  e('ca', null, 'CONSEIL ADMINISTRATION'),
  e('dir', 'ca', 'DIRECTION'),
  e('ad', 'dir', 'ASSISTANCE DE DIRECTION', 'vert', { cote: 'lateral' }),

  e('aq', 'dir', 'ASSURANCE QUALITE', 'bleu'),
  e('appro', 'dir', 'CHEF DIVISION APPRO', 'bleu'),
  e('ddm', 'dir', 'CHEF DIVISION DDM', 'bleu'),
  e('gpp', 'dir', 'RESPONSABLE DE GPP', 'bleu'),
  e('gs', 'dir', 'CHEF DIVISION GESTION DE STOCK', 'bleu'),
  e('daf', 'dir', 'CHEF DIVISION ADMINISTRATIVE &FINANCIERE', 'bleu'),
  e('cig', 'dir', 'CONTROLEUR INTERNE DE GESTION', 'bleu'),

  e('csappro', 'appro', 'CHEF DE SERVICE APPRO', 'orange'),
  e('log', 'csappro', 'LOGISTICIENS', 'vert'),

  e('csddm', 'ddm', 'CHEF SERVICE DDM', 'orange'),
  e('rtc', 'csddm', 'RESPONSABLE TRAITEMENT COMMANDE', 'vert'),
  e('cl', 'rtc', 'CONTROLEUR DE LIVRAISON'),
  e('sc', 'ddm', 'SECRÉTAIRE COMMERCIAL', 'vert'),

  e('csgpp', 'gpp', 'CHEF DE SERVICE GPP', 'orange'),
  e('mcgpp', 'csgpp', 'MAGASINIER CHEF GPP', 'vert'),
  e('mpp', 'mcgpp', 'MAGASINIERS PP'),

  e('cssg', 'gs', 'CHEF DE SERVICE SG', 'orange'),
  e('mca', 'cssg', 'MAGASINIER CHEF A', 'vert'),
  e('ma', 'mca', 'MAGASINIERS A'),
  e('mcb', 'cssg', 'MAGASINIER CHEF B', 'vert'),
  e('mb', 'mcb', 'MAGASINIERS B'),
  e('mcc', 'cssg', 'MAGASINIER CHEF C', 'vert'),
  e('mc', 'mcc', 'MAGASINIERS C'),

  e('rh', 'daf', 'RESPONSABLE RH', 'orange'),
  e('mat', 'daf', 'RESPONSABLE MATERIEL', 'orange'),
  e('cc', 'daf', 'CHEF COMPTABLE', 'orange'),
  e('comp', 'cc', 'COMPTABLES', 'vert'),
  e('rec', 'cc', 'RESPONSABLE DE RECOUVREMENT', 'vert'),
  e('ri', 'daf', 'RESPONSABLE INFORMATIQUE', 'orange'),
]
