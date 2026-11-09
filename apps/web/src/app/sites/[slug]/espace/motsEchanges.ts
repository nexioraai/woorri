import type { MotsEchanges } from './MesEchanges'

// ============================================================================
// LOT 11 — LES MOTS DES ÉCHANGES, DANS LES QUATRE LANGUES.
//
// DEUX PHRASES COMPTENT PLUS QUE LES AUTRES :
//
// `autreAdresse` — elle dit que la liste ne montre QUE ce qui a été envoyé
// depuis cette adresse. Sans elle, quelqu'un croit sa demande perdue.
//
// `sansReference` — les 37 messages existants précèdent les références. Une
// case vide ferait croire à une donnée manquante ; on écrit ce qui s'est
// passé.
// ============================================================================

const ETATS_FR = { recu: 'Reçue', en_cours: 'En cours de traitement', repondu: 'Répondue', clos: 'Close' }
const ETATS_EN = { recu: 'Received', en_cours: 'Being processed', repondu: 'Answered', clos: 'Closed' }
const ETATS_AR = { recu: 'مُستلمة', en_cours: 'قيد المعالجة', repondu: 'تمت الإجابة', clos: 'مغلقة' }
const ETATS_ES = { recu: 'Recibida', en_cours: 'En tramitación', repondu: 'Respondida', clos: 'Cerrada' }

type Jeu = { demandes: MotsEchanges; reclamations: MotsEchanges; titreDemandes: string; titreReclamations: string; phraseDemandes: string; phraseReclamations: string }

const commun = (etats: Record<string, string>, t: Omit<MotsEchanges, 'etats'>): MotsEchanges => ({ ...t, etats })

const FR: Jeu = {
  titreDemandes: 'Mes demandes', titreReclamations: 'Mes réclamations',
  phraseDemandes: 'Les messages que vous avez adressés à la Centrale, et où ils en sont.',
  phraseReclamations: 'Les réclamations que vous avez déposées, et leur suivi.',
  demandes: commun(ETATS_FR, {
    chargement: 'Chargement…',
    refus: 'Votre compte doit être actif pour consulter vos échanges.',
    vide: 'Aucune demande pour l’instant.',
    autreAdresse: 'Cette liste montre les messages envoyés depuis {adresse}. Un message envoyé depuis une autre adresse ne s’y trouve pas : il n’est pas perdu, il est rattaché à l’autre adresse.',
    sansReference: 'sans référence',
    deposee: 'Déposée le', majLe: 'mise à jour le',
  }),
  reclamations: commun(ETATS_FR, {
    chargement: 'Chargement…',
    refus: 'Votre compte doit être actif pour consulter vos réclamations.',
    vide: 'Aucune réclamation pour l’instant.',
    autreAdresse: 'Cette liste montre les réclamations envoyées depuis {adresse}. Une réclamation envoyée depuis une autre adresse ne s’y trouve pas : elle n’est pas perdue, elle est rattachée à l’autre adresse.',
    sansReference: 'sans référence',
    deposee: 'Déposée le', majLe: 'mise à jour le',
  }),
}

const EN: Jeu = {
  titreDemandes: 'My requests', titreReclamations: 'My complaints',
  phraseDemandes: 'The messages you sent to the Centrale, and where they stand.',
  phraseReclamations: 'The complaints you filed, and how they are progressing.',
  demandes: commun(ETATS_EN, {
    chargement: 'Loading…', refus: 'Your account must be active to view your exchanges.',
    vide: 'No request yet.',
    autreAdresse: 'This list shows messages sent from {adresse}. A message sent from another address is not here: it is not lost, it belongs to that other address.',
    sansReference: 'no reference', deposee: 'Filed on', majLe: 'updated on',
  }),
  reclamations: commun(ETATS_EN, {
    chargement: 'Loading…', refus: 'Your account must be active to view your complaints.',
    vide: 'No complaint yet.',
    autreAdresse: 'This list shows complaints sent from {adresse}. A complaint sent from another address is not here: it is not lost, it belongs to that other address.',
    sansReference: 'no reference', deposee: 'Filed on', majLe: 'updated on',
  }),
}

const AR: Jeu = {
  titreDemandes: 'طلباتي', titreReclamations: 'شكاواي',
  phraseDemandes: 'الرسائل التي وجّهتها إلى المركزية، وأين وصلت.',
  phraseReclamations: 'الشكاوى التي قدّمتها، ومسار متابعتها.',
  demandes: commun(ETATS_AR, {
    chargement: 'جارٍ التحميل…', refus: 'يجب أن يكون حسابك نشطاً للاطلاع على مراسلاتك.',
    vide: 'لا يوجد طلب حتى الآن.',
    autreAdresse: 'تعرض هذه القائمة الرسائل المرسلة من {adresse}. الرسالة المرسلة من عنوان آخر ليست هنا: لم تضع، بل هي مرتبطة بذلك العنوان.',
    sansReference: 'بدون مرجع', deposee: 'أُودعت في', majLe: 'حُدّثت في',
  }),
  reclamations: commun(ETATS_AR, {
    chargement: 'جارٍ التحميل…', refus: 'يجب أن يكون حسابك نشطاً للاطلاع على شكاواك.',
    vide: 'لا توجد شكوى حتى الآن.',
    autreAdresse: 'تعرض هذه القائمة الشكاوى المرسلة من {adresse}. الشكوى المرسلة من عنوان آخر ليست هنا: لم تضع، بل هي مرتبطة بذلك العنوان.',
    sansReference: 'بدون مرجع', deposee: 'أُودعت في', majLe: 'حُدّثت في',
  }),
}

const ES: Jeu = {
  titreDemandes: 'Mis solicitudes', titreReclamations: 'Mis reclamaciones',
  phraseDemandes: 'Los mensajes que ha dirigido a la Central, y en qué punto están.',
  phraseReclamations: 'Las reclamaciones que ha presentado, y su seguimiento.',
  demandes: commun(ETATS_ES, {
    chargement: 'Cargando…', refus: 'Su cuenta debe estar activa para consultar sus intercambios.',
    vide: 'Ninguna solicitud por ahora.',
    autreAdresse: 'Esta lista muestra los mensajes enviados desde {adresse}. Un mensaje enviado desde otra dirección no aparece aquí: no se ha perdido, pertenece a esa otra dirección.',
    sansReference: 'sin referencia', deposee: 'Presentada el', majLe: 'actualizada el',
  }),
  reclamations: commun(ETATS_ES, {
    chargement: 'Cargando…', refus: 'Su cuenta debe estar activa para consultar sus reclamaciones.',
    vide: 'Ninguna reclamación por ahora.',
    autreAdresse: 'Esta lista muestra las reclamaciones enviadas desde {adresse}. Una reclamación enviada desde otra dirección no aparece aquí: no se ha perdido, pertenece a esa otra dirección.',
    sansReference: 'sin referencia', deposee: 'Presentada el', majLe: 'actualizada el',
  }),
}

const PAR_LANGUE: Record<string, Jeu> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsEchanges(lang: string | null | undefined): Jeu {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_ECHANGES = Object.keys(PAR_LANGUE)
