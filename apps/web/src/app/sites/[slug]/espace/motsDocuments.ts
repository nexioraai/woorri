import type { MotsDocuments } from './DocumentsDuCompte'

// ============================================================================
// LOT 12.1 — LES MOTS DU DOSSIER, DANS LES QUATRE LANGUES.
//
// « REÇUS » ET « REMIS » NE SE CONFONDENT PAS. L'un vient de la Centrale,
// l'autre part vers elle. Les nommer pareil ferait chercher longtemps une
// pièce qu'on a soi-même envoyée.
// ============================================================================

const FR: MotsDocuments & { titre: string; phrase: string } = {
  titre: 'Mes documents',
  phrase: 'Les pièces que la Centrale vous a adressées, et celles que vous lui avez remises.',
  chargement: 'Chargement…',
  refus: 'Votre compte doit être actif pour consulter vos documents.',
  vide: 'Aucun document pour l’instant.',
  recus: 'Reçus de la Centrale', remis: 'Remis à la Centrale',
  deposer: 'Déposer une pièce', depot: 'Dépôt en cours…',
  telecharger: 'Télécharger', retirer: 'Retirer',
  retireLe: 'retiré le', depuis: 'déposé le',
  erreur: 'Service momentanément indisponible. Réessayez plus tard.',
  expire: 'Le lien a expiré. Redemandez-le.',
}

const EN: MotsDocuments & { titre: string; phrase: string } = {
  titre: 'My documents',
  phrase: 'The files the Centrale sent you, and those you handed over.',
  chargement: 'Loading…', refus: 'Your account must be active to view your documents.',
  vide: 'No document yet.',
  recus: 'Received from the Centrale', remis: 'Handed to the Centrale',
  deposer: 'Upload a file', depot: 'Uploading…',
  telecharger: 'Download', retirer: 'Withdraw',
  retireLe: 'withdrawn on', depuis: 'filed on',
  erreur: 'Service temporarily unavailable. Try again later.',
  expire: 'The link has expired. Ask for a new one.',
}

const AR: MotsDocuments & { titre: string; phrase: string } = {
  titre: 'مستنداتي',
  phrase: 'الوثائق التي أرسلتها إليك المركزية، وتلك التي سلّمتها إليها.',
  chargement: 'جارٍ التحميل…', refus: 'يجب أن يكون حسابك نشطاً للاطلاع على مستنداتك.',
  vide: 'لا يوجد مستند حتى الآن.',
  recus: 'واردة من المركزية', remis: 'مسلّمة إلى المركزية',
  deposer: 'إيداع وثيقة', depot: 'جارٍ الإيداع…',
  telecharger: 'تنزيل', retirer: 'سحب',
  retireLe: 'سُحبت في', depuis: 'أُودعت في',
  erreur: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.',
  expire: 'انتهت صلاحية الرابط. اطلب رابطاً جديداً.',
}

const ES: MotsDocuments & { titre: string; phrase: string } = {
  titre: 'Mis documentos',
  phrase: 'Los documentos que la Central le ha enviado, y los que usted le ha entregado.',
  chargement: 'Cargando…', refus: 'Su cuenta debe estar activa para consultar sus documentos.',
  vide: 'Ningún documento por ahora.',
  recus: 'Recibidos de la Central', remis: 'Entregados a la Central',
  deposer: 'Subir un documento', depot: 'Subiendo…',
  telecharger: 'Descargar', retirer: 'Retirar',
  retireLe: 'retirado el', depuis: 'presentado el',
  erreur: 'Servicio no disponible momentáneamente. Inténtelo más tarde.',
  expire: 'El enlace ha caducado. Pida uno nuevo.',
}

const PAR_LANGUE: Record<string, MotsDocuments & { titre: string; phrase: string }> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsDocuments(lang: string | null | undefined) {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_DOCUMENTS = Object.keys(PAR_LANGUE)
