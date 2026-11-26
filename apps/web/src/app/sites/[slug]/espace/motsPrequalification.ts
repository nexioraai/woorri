import type { MotsPrequalification } from './MaPrequalification'
import { accorder, type Institution } from '@/lib/sites/institution'

// ============================================================================
// LOT 12.3 — LES MOTS DE L'EXAMEN, DANS LES QUATRE LANGUES.
//
// CHAQUE VERDICT PORTE SON EXPLICATION. « Rejeté » seul laisse quelqu'un
// sans recours ; « rejeté — la Centrale vous écrira » dit quoi attendre.
// Et « non examiné » est l'état le plus fréquent : le taire ferait croire à
// une panne.
// ============================================================================

const FR: MotsPrequalification & { titre: string; phrase: string } = {
  titre: 'Ma préqualification',
  phrase: 'Où en est l’examen de votre dossier par {{la}}.',
  chargement: 'Chargement…',
  refus: 'Connectez-vous pour consulter votre préqualification.',
  verdict: 'Décision {{de}}', prononceLe: 'Prononcée le',
  dossier: 'Votre dossier',
  dossierComplet: 'Toutes les pièces demandées ont été remises.',
  dossierIncomplet: 'Il manque {n} pièce(s) obligatoire(s).',
  aucuneExigence: '{{La}} n’a pas encore publié la liste des pièces à fournir.',
  versLeDossier: 'Voir mon dossier',
  etats: {
    non_examinee: 'Pas encore examinée',
    prequalifie: 'Préqualifié',
    qualifie: 'Qualifié',
    rejete: 'Rejeté',
  },
  explications: {
    non_examinee: '{{La}} n’a pas encore rendu de décision. Complétez votre dossier : c’est sur lui qu’elle se prononcera.',
    prequalifie: 'Votre dossier a passé le premier examen. {{La}} peut vous consulter pour ses marchés.',
    qualifie: 'Vous êtes qualifié. Vous pouvez répondre aux consultations qui vous sont adressées.',
    rejete: '{{La}} n’a pas retenu votre dossier. Elle vous écrira pour en indiquer les motifs.',
  },
}

const EN: MotsPrequalification & { titre: string; phrase: string } = {
  titre: 'My prequalification',
  phrase: 'Where {{the}} stands on reviewing your file.',
  chargement: 'Loading…', refus: 'Sign in to view your prequalification.',
  verdict: '{{The}}’s decision', prononceLe: 'Issued on',
  dossier: 'Your file',
  dossierComplet: 'Every requested document has been provided.',
  dossierIncomplet: '{n} required document(s) missing.',
  aucuneExigence: '{{The}} has not yet published the list of required documents.',
  versLeDossier: 'See my file',
  etats: { non_examinee: 'Not yet reviewed', prequalifie: 'Prequalified', qualifie: 'Qualified', rejete: 'Rejected' },
  explications: {
    non_examinee: '{{The}} has not issued a decision yet. Complete your file: that is what it will rule on.',
    prequalifie: 'Your file passed the first review. {{The}} may consult you for its contracts.',
    qualifie: 'You are qualified. You may answer the consultations addressed to you.',
    rejete: '{{The}} did not accept your file. It will write to you with the reasons.',
  },
}

const AR: MotsPrequalification & { titre: string; phrase: string } = {
  titre: 'تأهيلي المسبق',
  phrase: 'أين وصلت دراسة ملفك لدى {{al}}.',
  chargement: 'جارٍ التحميل…', refus: 'سجّل الدخول للاطلاع على تأهيلك المسبق.',
  verdict: 'قرار {{al}}', prononceLe: 'صدر في',
  dossier: 'ملفك',
  dossierComplet: 'تم تقديم جميع الوثائق المطلوبة.',
  dossierIncomplet: 'تنقص {n} وثيقة إلزامية.',
  aucuneExigence: 'لم تنشر {{al}} بعد قائمة الوثائق المطلوبة.',
  versLeDossier: 'عرض ملفي',
  etats: { non_examinee: 'لم تُدرس بعد', prequalifie: 'مؤهَّل مسبقاً', qualifie: 'مؤهَّل', rejete: 'مرفوض' },
  explications: {
    non_examinee: 'لم تصدر {{al}} قراراً بعد. أكمل ملفك: عليه سيُبنى القرار.',
    prequalifie: 'اجتاز ملفك الدراسة الأولى. يمكن للمركزية استشارتك في صفقاتها.',
    qualifie: 'أنت مؤهَّل. يمكنك الرد على الاستشارات الموجَّهة إليك.',
    rejete: 'لم تقبل {{al}} ملفك. ستكتب إليك ببيان الأسباب.',
  },
}

const ES: MotsPrequalification & { titre: string; phrase: string } = {
  titre: 'Mi homologación previa',
  phrase: 'En qué punto está el examen de su expediente por {{la}}.',
  chargement: 'Cargando…', refus: 'Inicie sesión para consultar su homologación.',
  verdict: 'Decisión {{de}}', prononceLe: 'Dictada el',
  dossier: 'Su expediente',
  dossierComplet: 'Se han entregado todos los documentos solicitados.',
  dossierIncomplet: 'Faltan {n} documento(s) obligatorio(s).',
  aucuneExigence: '{{La}} aún no ha publicado la lista de documentos exigidos.',
  versLeDossier: 'Ver mi expediente',
  etats: { non_examinee: 'Aún sin examinar', prequalifie: 'Prehomologado', qualifie: 'Homologado', rejete: 'Rechazado' },
  explications: {
    non_examinee: '{{La}} aún no ha dictado una decisión. Complete su expediente: es sobre él que se pronunciará.',
    prequalifie: 'Su expediente ha superado el primer examen. {{La}} puede consultarle para sus contratos.',
    qualifie: 'Está homologado. Puede responder a las consultas que se le dirijan.',
    rejete: '{{La}} no ha aceptado su expediente. Le escribirá indicando los motivos.',
  },
}

const PAR_LANGUE: Record<string, MotsPrequalification & { titre: string; phrase: string }> = { fr: FR, en: EN, ar: AR, es: ES }

function motsPrequalificationBrut(lang: string | null | undefined) {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Les quatre verdicts. Exportée pour que le cliquet énumère au lieu de supposer. */
export const VERDICTS = ['non_examinee', 'prequalifie', 'qualifie', 'rejete'] as const
export const LANGUES_PREQUALIFICATION = Object.keys(PAR_LANGUE)

/**
 * Les mots, avec le nom de l'institution DU SITE (lot 2 « textes neutres »,
 * 2026-11-26) : les jetons {{la}}, {{de}}… deviennent « la Centrale » pour la
 * CPA, la désignation du site ailleurs. Voir `@/lib/sites/institution`.
 */
export function motsPrequalification(lang: string | null | undefined, inst: Institution): ReturnType<typeof motsPrequalificationBrut> {
  return accorder(motsPrequalificationBrut(lang), inst)
}
