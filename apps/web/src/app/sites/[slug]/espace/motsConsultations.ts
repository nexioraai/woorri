import type { MotsConsultations } from './MesConsultations'
import { accorder, type Institution } from '@/lib/sites/institution'

const PAR_LANGUE: Record<string, MotsConsultations> = {
  fr: { titre: 'Mes consultations', phrase: 'Les appels d’offres ouverts, et où vous en êtes sur chacun.',
    chargement: 'Chargement…', aucune: 'Aucun appel d’offres ouvert pour l’instant.',
    repondre: 'Voir l’avis et répondre', dejaRepondu: 'Offre déposée', limite: 'date limite',
    nonQualifie: 'Votre dossier n’est pas encore qualifié par {{la}} : vous pouvez lire les avis, mais pas encore y répondre.',
    versDossier: 'Compléter mon dossier', refus: 'Votre compte doit être actif pour voir vos consultations.' },
  en: { titre: 'My consultations', phrase: 'Open tenders, and where you stand on each.',
    chargement: 'Loading…', aucune: 'No open tender at the moment.',
    repondre: 'See the notice and respond', dejaRepondu: 'Offer submitted', limite: 'deadline',
    nonQualifie: 'Your file has not been qualified by {{the}} yet: you can read notices but cannot respond yet.',
    versDossier: 'Complete my file', refus: 'Your account must be active to see your consultations.' },
  ar: { titre: 'استشاراتي', phrase: 'طلبات العروض المفتوحة، وموقفك من كل منها.',
    chargement: 'جارٍ التحميل…', aucune: 'لا يوجد طلب عروض مفتوح حالياً.',
    repondre: 'عرض الإعلان والرد', dejaRepondu: 'تم إيداع العرض', limite: 'آخر أجل',
    nonQualifie: 'لم تؤهّل {{al}} ملفك بعد: يمكنك قراءة الإعلانات دون الرد عليها.',
    versDossier: 'إكمال ملفي', refus: 'يجب أن يكون حسابك نشطاً لعرض استشاراتك.' },
  es: { titre: 'Mis consultas', phrase: 'Las licitaciones abiertas y su situación en cada una.',
    chargement: 'Cargando…', aucune: 'No hay licitaciones abiertas por ahora.',
    repondre: 'Ver el anuncio y responder', dejaRepondu: 'Oferta presentada', limite: 'plazo',
    nonQualifie: '{{La}} aún no ha homologado su expediente: puede leer los anuncios pero aún no responder.',
    versDossier: 'Completar mi expediente', refus: 'Su cuenta debe estar activa para ver sus consultas.' },
}

function motsConsultationsBrut(lang: string | null | undefined): MotsConsultations {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? PAR_LANGUE.fr
}
export const LANGUES_CONSULTATIONS = Object.keys(PAR_LANGUE)

/**
 * Les mots, avec le nom de l'institution DU SITE (lot 2 « textes neutres »,
 * 2026-11-26) : les jetons {{la}}, {{de}}… deviennent « la Centrale » pour la
 * CPA, la désignation du site ailleurs. Voir `@/lib/sites/institution`.
 */
export function motsConsultations(lang: string | null | undefined, inst: Institution): ReturnType<typeof motsConsultationsBrut> {
  return accorder(motsConsultationsBrut(lang), inst)
}
