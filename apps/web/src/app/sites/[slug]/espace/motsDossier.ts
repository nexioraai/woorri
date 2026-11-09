import type { MotsDossier } from './MonDossier'

// ============================================================================
// LOT 12.2 — LES MOTS DU DOSSIER, DANS LES QUATRE LANGUES.
//
// `incomplet` PORTE UN NOMBRE. « Il vous manque 2 pièces » agit ; « dossier
// incomplet » fait chercher. Le `{n}` est remplacé à l'affichage.
// ============================================================================

const FR: MotsDossier & { titre: string; phrase: string } = {
  titre: 'Mon dossier',
  phrase: 'Les pièces que la Centrale demande pour instruire votre agrément.',
  chargement: 'Chargement…',
  refus: 'Votre compte doit être actif pour accéder à votre dossier.',
  aucuneExigence: 'La Centrale n’a pas encore publié la liste des pièces à fournir. Vous pouvez tout de même lui remettre des documents depuis « Mes documents ».',
  complet: 'Votre dossier est complet. La Centrale dispose de toutes les pièces demandées.',
  incomplet: 'Il manque {n} pièce(s) obligatoire(s).',
  fournie: 'Fournie', manquante: 'Manquante', facultative: '(facultative)',
  deposer: 'Déposer cette pièce', depot: 'Dépôt en cours…', remplacer: 'Remplacer cette pièce',
  erreur: 'Service momentanément indisponible. Réessayez plus tard.',
}

const EN: MotsDossier & { titre: string; phrase: string } = {
  titre: 'My file',
  phrase: 'The documents the Centrale requires to review your accreditation.',
  chargement: 'Loading…',
  refus: 'Your account must be active to reach your file.',
  aucuneExigence: 'The Centrale has not yet published the list of required documents. You can still hand over files from “My documents”.',
  complet: 'Your file is complete. The Centrale has every requested document.',
  incomplet: '{n} required document(s) missing.',
  fournie: 'Provided', manquante: 'Missing', facultative: '(optional)',
  deposer: 'Upload this document', depot: 'Uploading…', remplacer: 'Replace this document',
  erreur: 'Service temporarily unavailable. Try again later.',
}

const AR: MotsDossier & { titre: string; phrase: string } = {
  titre: 'ملفي',
  phrase: 'الوثائق التي تطلبها المركزية لدراسة اعتمادك.',
  chargement: 'جارٍ التحميل…',
  refus: 'يجب أن يكون حسابك نشطاً للوصول إلى ملفك.',
  aucuneExigence: 'لم تنشر المركزية بعد قائمة الوثائق المطلوبة. يمكنك مع ذلك تسليم وثائق من «مستنداتي».',
  complet: 'ملفك مكتمل. لدى المركزية جميع الوثائق المطلوبة.',
  incomplet: 'تنقص {n} وثيقة إلزامية.',
  fournie: 'مُقدَّمة', manquante: 'ناقصة', facultative: '(اختيارية)',
  deposer: 'إيداع هذه الوثيقة', depot: 'جارٍ الإيداع…', remplacer: 'استبدال هذه الوثيقة',
  erreur: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.',
}

const ES: MotsDossier & { titre: string; phrase: string } = {
  titre: 'Mi expediente',
  phrase: 'Los documentos que la Central exige para instruir su homologación.',
  chargement: 'Cargando…',
  refus: 'Su cuenta debe estar activa para acceder a su expediente.',
  aucuneExigence: 'La Central aún no ha publicado la lista de documentos exigidos. Puede entregarle documentos desde «Mis documentos».',
  complet: 'Su expediente está completo. La Central tiene todos los documentos solicitados.',
  incomplet: 'Faltan {n} documento(s) obligatorio(s).',
  fournie: 'Aportado', manquante: 'Falta', facultative: '(opcional)',
  deposer: 'Subir este documento', depot: 'Subiendo…', remplacer: 'Sustituir este documento',
  erreur: 'Servicio no disponible momentáneamente. Inténtelo más tarde.',
}

const PAR_LANGUE: Record<string, MotsDossier & { titre: string; phrase: string }> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsDossier(lang: string | null | undefined) {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_DOSSIER = Object.keys(PAR_LANGUE)
