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
  /** Les trois etats. Jamais la valeur brute de la base a l'ecran. */
  etats: Record<string, string>
  /** Les dix-neuf rubriques du detail. */
  r: Record<string, string>
}

const RUB_FR: Record<string, string> = {
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
    vide: "Aucun avis d'appel d'offres n'est publié actuellement.",
    videSuite: 'Les avis paraissent sur cette page dès leur publication.',
    retour: '← Tous les avis', accueil: "← Retour à l'accueil",
    nonRenseigne: 'Les rubriques qui ne figurent pas ci-dessus n’ont pas été renseignées par l’acheteur.',
    publieLe: 'Publié le',
    colReference: 'Référence', colObjet: 'Objet',
    colRemise: 'Date et heure limite', colEtat: 'État',
    etats: { preparation: 'En préparation', ouvert: 'Ouvert', attribue: 'Attribué' },
    r: RUB_FR,
  },
  en: {
    titre: 'Tenders', sousTitre: 'Published contract notices',
    vide: 'No tender notice is currently published.',
    videSuite: 'Notices appear on this page as soon as they are published.',
    retour: '← All notices', accueil: '← Back to home',
    nonRenseigne: 'Sections not listed above were not specified by the buyer.',
    publieLe: 'Published on',
    colReference: 'Reference', colObjet: 'Subject',
    colRemise: 'Deadline (date and time)', colEtat: 'Status',
    etats: { preparation: 'In preparation', ouvert: 'Open', attribue: 'Awarded' },
    r: RUB_EN,
  },
  es: {
    titre: 'Licitaciones', sousTitre: 'Anuncios de contratos publicados',
    vide: 'No hay ningún anuncio de licitación publicado actualmente.',
    videSuite: 'Los anuncios aparecen en esta página en cuanto se publican.',
    retour: '← Todos los anuncios', accueil: '← Volver al inicio',
    nonRenseigne: 'Las rúbricas que no figuran arriba no fueron especificadas por el comprador.',
    publieLe: 'Publicado el',
    colReference: 'Referencia', colObjet: 'Objeto',
    colRemise: 'Fecha y hora límite', colEtat: 'Estado',
    etats: { preparation: 'En preparación', ouvert: 'Abierta', attribue: 'Adjudicada' },
    r: RUB_ES,
  },
  ar: {
    titre: 'المناقصات', sousTitre: 'إعلانات الصفقات المنشورة',
    vide: 'لا يوجد حاليا أي إعلان عن مناقصة منشور.',
    videSuite: 'تُنشر الإعلانات في هذه الصفحة فور صدورها.',
    retour: '← جميع الإعلانات', accueil: '← العودة إلى الصفحة الرئيسية',
    nonRenseigne: 'البنود غير الواردة أعلاه لم يحددها المشتري.',
    publieLe: 'نُشر في',
    colReference: 'المرجع', colObjet: 'الموضوع',
    colRemise: 'تاريخ وساعة آخر أجل', colEtat: 'الحالة',
    etats: { preparation: 'قيد الإعداد', ouvert: 'مفتوحة', attribue: 'مُسندة' },
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
