import { estPrevisionnel } from './cycleDeVie'

// Intitules fabriques par les pages elles-memes. Ils suivent la langue DU
// SITE, jamais une langue en dur -- meme regle que `getBlogLabels` et
// `getLlmsTxtLabels`. Aucun contenu de l'acheteur n'est traduit ici : seuls
// les intitules de rubriques le sont.
//
// L'ARABE N'EST PAS DECORATIF. Le Tchad a deux langues officielles, le
// francais et l'arabe. Un portail de marches publics tchadien qui ne saurait
// pas se rendre en arabe exclurait une partie des soumissionnaires auxquels
// il s'adresse.

export type AvisLabels = {
  titre: string
  sousTitre: string
  /** LOT 5 — les cases du filtre. Une langue qui en manque une rougit a la
   *  compilation : un filtre non traduit paraitrait en francais sur un
   *  site anglophone, et c'est le genre de defaut que personne ne signale. */
  filtres: { tous: string; ouvert: string; clos: string; attribue: string; preparation: string }
  vide: string
  videSuite: string
  retour: string
  accueil: string
  /** Dit pourquoi une rubrique ne figure pas -- voir le detail. */
  nonRenseigne: string
  publieLe: string
  /** Les quatre entetes de la liste -- loi du lot A2 ①. */
  colReference: string
  colObjet: string
  colRemise: string
  colEtat: string
  /** Les QUATRE etats VISIBLES. Jamais la valeur brute de la base a l'ecran.
   *  `clos` n'existe PAS en base : il se derive de l'echeance (lot A2 b). */
  etats: Record<string, string>
  /** Les deux sections de la liste -- en cours, puis clotures. */
  sectionEnCours: string
  sectionClotures: string
  /** Dit pourquoi un avis cloture reste affiche. */
  noteClotures: string
  /** Accole a une date PREVISIONNELLE. Lot A2 b1, condition ② du proprietaire. */
  previsionnel: string
  /** Dit qu'un avis en preparation n'accepte encore aucune offre. Condition ①. */
  pasEncoreRecevable: string
  /** Le libelle de `remise_le` QUAND la date n'est pas ferme. */
  rRemisePrevue: string
  /** Les dix-neuf rubriques du detail. */
  r: Record<string, string>
}

const RUB_FR: Record<string, string> = {
  attributaire: 'Attributaire',
  montant_attribue: 'Montant attribué',
  attribue_le: "Date d'attribution",
  reference: 'Référence', objet: 'Objet du marché', etat: 'État',
  description: 'Description', methode: 'Méthode de passation',
  methode_detail: 'Précisions sur la méthode', valeur: 'Valeur estimée',
  remise_le: 'Date et heure limite de remise',
  questions_avant: 'Date limite des questions',
  ouverture_plis: 'Ouverture des plis',
  criteres_elim: 'Critères éliminatoires', criteres_notes: 'Critères de notation',
  soumission: 'Modalités de soumission', allotissement: 'Allotissement',
  local_prix_dossier: 'Prix du dossier', local_caution: 'Caution de soumission',
  local_validite_jours: 'Durée de validité des offres',
  canal_officiel_url: 'Publication officielle', document_url: "Dossier d'appel d'offres",
}
const RUB_EN: Record<string, string> = {
  attributaire: 'Awarded to',
  montant_attribue: 'Awarded amount',
  attribue_le: 'Award date',
  reference: 'Reference', objet: 'Subject of the contract', etat: 'Status',
  description: 'Description', methode: 'Procurement method',
  methode_detail: 'Method details', valeur: 'Estimated value',
  remise_le: 'Submission deadline (date and time)',
  questions_avant: 'Deadline for questions', ouverture_plis: 'Bid opening',
  criteres_elim: 'Eliminatory criteria', criteres_notes: 'Scoring criteria',
  soumission: 'How to submit', allotissement: 'Lots',
  local_prix_dossier: 'Price of the tender file', local_caution: 'Bid bond',
  local_validite_jours: 'Bid validity period',
  canal_officiel_url: 'Official publication', document_url: 'Tender documents',
}
const RUB_ES: Record<string, string> = {
  attributaire: 'Adjudicatario',
  montant_attribue: 'Importe adjudicado',
  attribue_le: 'Fecha de adjudicación',
  reference: 'Referencia', objet: 'Objeto del contrato', etat: 'Estado',
  description: 'Descripción', methode: 'Método de contratación',
  methode_detail: 'Detalles del método', valeur: 'Valor estimado',
  remise_le: 'Fecha y hora límite de presentación',
  questions_avant: 'Fecha límite para preguntas', ouverture_plis: 'Apertura de ofertas',
  criteres_elim: 'Criterios eliminatorios', criteres_notes: 'Criterios de puntuación',
  soumission: 'Modalidades de presentación', allotissement: 'Lotes',
  local_prix_dossier: 'Precio del pliego', local_caution: 'Garantía de oferta',
  local_validite_jours: 'Periodo de validez de las ofertas',
  canal_officiel_url: 'Publicación oficial', document_url: 'Pliego de condiciones',
}
const RUB_AR: Record<string, string> = {
  attributaire: 'الجهة الفائزة',
  montant_attribue: 'قيمة الإسناد',
  attribue_le: 'تاريخ الإسناد',
  reference: 'المرجع', objet: 'موضوع الصفقة', etat: 'الحالة',
  description: 'الوصف', methode: 'طريقة الإبرام',
  methode_detail: 'تفاصيل الطريقة', valeur: 'القيمة التقديرية',
  remise_le: 'تاريخ وساعة آخر أجل للإيداع',
  questions_avant: 'آخر أجل لطرح الأسئلة', ouverture_plis: 'فتح العروض',
  criteres_elim: 'معايير الإقصاء', criteres_notes: 'معايير التنقيط',
  soumission: 'كيفية الإيداع', allotissement: 'التقسيم إلى حصص',
  local_prix_dossier: 'ثمن ملف الاستشارة', local_caution: 'ضمان العرض',
  local_validite_jours: 'مدة صلاحية العروض',
  canal_officiel_url: 'النشر الرسمي', document_url: 'ملف طلب العروض',
}

const COPY: Record<string, AvisLabels> = {
  fr: {
    titre: "Appels d'offres",
    sousTitre: 'Avis de marché publiés',
    filtres: { tous: 'Tous', ouvert: 'En cours', clos: 'Clos', attribue: 'Attribués', preparation: 'En préparation' },
    vide: "Aucun avis d'appel d'offres n'est publié actuellement.",
    videSuite: 'Les avis paraissent sur cette page dès leur publication.',
    retour: '← Tous les avis', accueil: "← Retour à l'accueil",
    nonRenseigne: 'Les rubriques qui ne figurent pas ci-dessus n’ont pas été renseignées par l’acheteur.',
    publieLe: 'Publié le',
    colReference: 'Référence', colObjet: 'Objet',
    colRemise: 'Date et heure limite', colEtat: 'État',
    etats: { preparation: 'En préparation', ouvert: 'Ouvert', clos: 'Clôturé', attribue: 'Attribué' },
    sectionEnCours: 'Avis en cours', sectionClotures: 'Avis clôturés',
    noteClotures: 'Ces avis ne sont plus ouverts aux offres. Ils restent publiés.',
    previsionnel: '(prévisionnelle)',
    pasEncoreRecevable: 'Avis en préparation — aucune offre n’est encore recevable.',
    rRemisePrevue: 'Date de remise prévisionnelle',
    r: RUB_FR,
  },
  en: {
    filtres: { tous: 'All', ouvert: 'Open', clos: 'Closed', attribue: 'Awarded', preparation: 'In preparation' },
    titre: 'Tenders', sousTitre: 'Published contract notices',
    vide: 'No tender notice is currently published.',
    videSuite: 'Notices appear on this page as soon as they are published.',
    retour: '← All notices', accueil: '← Back to home',
    nonRenseigne: 'Sections not listed above were not specified by the buyer.',
    publieLe: 'Published on',
    colReference: 'Reference', colObjet: 'Subject',
    colRemise: 'Deadline (date and time)', colEtat: 'Status',
    etats: { preparation: 'In preparation', ouvert: 'Open', clos: 'Closed', attribue: 'Awarded' },
    sectionEnCours: 'Open notices', sectionClotures: 'Closed notices',
    noteClotures: 'These notices no longer accept bids. They remain published.',
    previsionnel: '(provisional)',
    pasEncoreRecevable: 'Notice in preparation — no bid can be submitted yet.',
    rRemisePrevue: 'Expected submission date',
    r: RUB_EN,
  },
  es: {
    filtres: { tous: 'Todos', ouvert: 'Abiertos', clos: 'Cerrados', attribue: 'Adjudicados', preparation: 'En preparación' },
    titre: 'Licitaciones', sousTitre: 'Anuncios de contratos publicados',
    vide: 'No hay ningún anuncio de licitación publicado actualmente.',
    videSuite: 'Los anuncios aparecen en esta página en cuanto se publican.',
    retour: '← Todos los anuncios', accueil: '← Volver al inicio',
    nonRenseigne: 'Las rúbricas que no figuran arriba no fueron especificadas por el comprador.',
    publieLe: 'Publicado el',
    colReference: 'Referencia', colObjet: 'Objeto',
    colRemise: 'Fecha y hora límite', colEtat: 'Estado',
    etats: { preparation: 'En preparación', ouvert: 'Abierta', clos: 'Cerrada', attribue: 'Adjudicada' },
    sectionEnCours: 'Anuncios en curso', sectionClotures: 'Anuncios cerrados',
    noteClotures: 'Estos anuncios ya no admiten ofertas. Siguen publicados.',
    previsionnel: '(provisional)',
    pasEncoreRecevable: 'Anuncio en preparación — todavía no se admite ninguna oferta.',
    rRemisePrevue: 'Fecha de presentación prevista',
    r: RUB_ES,
  },
  ar: {
    filtres: { tous: 'الكل', ouvert: 'مفتوحة', clos: 'مغلقة', attribue: 'تم إسنادها', preparation: 'قيد الإعداد' },
    titre: 'المناقصات', sousTitre: 'إعلانات الصفقات المنشورة',
    vide: 'لا يوجد حاليا أي إعلان عن مناقصة منشور.',
    videSuite: 'تُنشر الإعلانات في هذه الصفحة فور صدورها.',
    retour: '← جميع الإعلانات', accueil: '← العودة إلى الصفحة الرئيسية',
    nonRenseigne: 'البنود غير الواردة أعلاه لم يحددها المشتري.',
    publieLe: 'نُشر في',
    colReference: 'المرجع', colObjet: 'الموضوع',
    colRemise: 'تاريخ وساعة آخر أجل', colEtat: 'الحالة',
    etats: { preparation: 'قيد الإعداد', ouvert: 'مفتوحة', clos: 'مغلقة', attribue: 'مُسندة' },
    sectionEnCours: 'الإعلانات الجارية', sectionClotures: 'الإعلانات المغلقة',
    noteClotures: 'لم تعد هذه الإعلانات تقبل العروض. وتبقى منشورة.',
    previsionnel: '(تقديري)',
    pasEncoreRecevable: 'إعلان قيد الإعداد — لا يمكن تقديم أي عرض بعد.',
    rRemisePrevue: 'تاريخ الإيداع المتوقع',
    r: RUB_AR,
  },
}

export function getAvisLabels(lang: string | null | undefined): AvisLabels {
  return COPY[(lang ?? 'fr').slice(0, 2)] ?? COPY.fr
}

/**
 * L'ETAT, RENDU LISIBLE. Jamais la valeur brute de la base a l'ecran : un
 * visiteur n'a pas a lire `attribue` sans accent parce que c'est ainsi qu'une
 * contrainte CHECK l'ecrit.
 *
 * Un etat INCONNU se rend tel quel plutot que d'etre masque : si la base
 * gagnait un quatrieme etat, l'ecran le montrerait au lieu de l'avaler.
 */
export function libelleEtat(etat: string, lang: string | null | undefined): string {
  return getAvisLabels(lang).etats[etat] ?? etat
}

/**
 * DATE **ET HEURE**, ET C'EST LA LOI DU LOT A2 ①.
 *
 * `formatDate` du blog ne rend que la date, et il sert deja trois surfaces :
 * ce fichier ecrit sa propre fonction plutot que d'elargir celle-la. Un
 * soumissionnaire qui depose a 15 h sur une echeance fixee a 10 h perd son
 * marche -- l'heure n'est pas un ornement.
 *
 * `timeZoneName: 'short'` EST OBLIGATOIRE. Une heure limite sans fuseau est
 * ambigue de plusieurs heures, et le visiteur d'un appel d'offres tchadien
 * peut lire la page depuis n'importe ou.
 */
export function formatDateHeure(iso: string | null, lang: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  try {
    return d.toLocaleString((lang ?? 'fr').slice(0, 2), {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
  }
}

/**
 * L'ÉCHÉANCE TELLE QU'ELLE DOIT PARAÎTRE — texte, et si elle est ferme.
 *
 * ── POURQUOI UNE FONCTION, ET PAS DEUX BOUTS DE JSX.
 *
 * La règle vivait dans les pages : `{prevu && <span>{t.previsionnel}</span>}`.
 * MESURÉ le 2026-11-06 en la mutant en `{false && …}` — **49 tests verts**.
 * Mes assertions vérifiaient que `t.previsionnel` FIGURE dans le fichier, pas
 * qu'il S'AFFICHE. Une ancre de forme qui ne couvre pas la perte qu'elle
 * prétend garder : le marqueur pouvait disparaître de l'écran sans qu'aucun
 * cliquet ne bouge.
 *
 * La règle est donc ici, où un test la tient par son COMPORTEMENT. Et elle
 * est UNE : la liste et le détail ne peuvent plus diverger sur ce que
 * « prévisionnelle » veut dire.
 *
 * Rend `null` quand il n'y a pas de date — jamais « — », jamais une chaîne
 * vide : l'écran décide comment rendre une absence, pas cette fonction.
 */
export function echeanceAffichee(
  remiseLe: string | null,
  etatVis: string,
  lang: string | null | undefined
): { texte: string; previsionnelle: boolean; marque: string | null } | null {
  const texte = formatDateHeure(remiseLe, lang)
  if (texte === null) return null
  const previsionnelle = estPrevisionnel(etatVis)
  return {
    texte,
    previsionnelle,
    marque: previsionnelle ? getAvisLabels(lang).previsionnel : null,
  }
}

/** Tronque a la longueur utile d'un extrait de resultat -- meme borne que le blog. */
export function tronquer(texte: string | null | undefined): string | undefined {
  const t = (texte ?? '').trim()
  if (!t) return undefined
  return t.length > 160 ? t.slice(0, 157).trimEnd() + '…' : t
}

/**
 * La valeur estimee, avec sa devise. Rend `null` si la valeur est absente --
 * JAMAIS « 0 » ni « — » : une valeur non communiquee et une valeur nulle sont
 * deux faits differents, et les confondre sur un avis de marche change le
 * sens de l'avis.
 */
export function formatValeur(
  valeur: number | null, devise: string | null, lang: string | null | undefined
): string | null {
  if (valeur === null || valeur === undefined) return null
  const l = (lang ?? 'fr').slice(0, 2)
  try {
    return devise
      ? new Intl.NumberFormat(l, { style: 'currency', currency: devise }).format(valeur)
      : new Intl.NumberFormat(l).format(valeur)
  } catch {
    return devise ? `${valeur} ${devise}` : String(valeur)
  }
}
