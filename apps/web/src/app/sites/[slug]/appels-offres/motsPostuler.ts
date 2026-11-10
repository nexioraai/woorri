import type { MotsPostuler } from './Postuler'

// ============================================================================
// LOT 13.1 — LES MOTS DU DÉPÔT D'OFFRE, DANS LES QUATRE LANGUES.
//
// CHAQUE REFUS DIT QUOI FAIRE. « Vous ne pouvez pas postuler » laisse
// quelqu'un devant un mur ; « demandez votre rattachement, voici où » le
// fait avancer. Un marché public se perd aussi par une phrase qui bloque.
// ============================================================================

const FR: MotsPostuler = {
  titre: 'Déposer une offre',
  chargement: 'Chargement…',
  connectezVous: 'Pour déposer une offre, il faut un compte : la Centrale doit savoir qui soumet. Créez le vôtre en une minute, ou connectez-vous si vous en avez déjà un.',
  creerCompte: 'Créer un compte',
  seConnecter: 'Se connecter',
  demandezAcces: 'Vous êtes connecté, mais vous n’êtes pas encore rattaché à la Centrale. Demandez votre rattachement depuis votre espace.',
  versEspace: 'Aller à mon espace',
  enAttente: 'Votre demande de rattachement est en cours d’examen par la Centrale. Vous pourrez déposer une offre dès qu’elle sera acceptée.',
  suspendu: 'Votre accès est suspendu. Prenez contact avec la Centrale avant de déposer une offre.',
  ferme: 'Cet avis n’est pas ouvert aux offres. Consultez la date limite de remise ci-dessus.',
  nom: 'Votre nom', nomAide: 'La personne à joindre pour CETTE offre — ce n’est pas forcément le titulaire du compte.',
  contact: 'Contact', contactAide: 'Téléphone ou adresse électronique.',
  prix: 'Montant proposé', prixAide: 'Facultatif. Si votre prix figure dans le dossier joint, laissez vide.',
  devise: 'Devise',
  fichier: 'Votre offre', fichierAide: 'PDF, Word, Excel ou ZIP. 25 Mo au maximum.',
  envoyer: 'Déposer mon offre', envoi: 'Dépôt en cours…',
  deposee: 'Votre offre a été déposée.',
  deposeeDetail: 'La Centrale l’examinera après la date d’ouverture des plis et vous répondra. Vous retrouvez vos dépôts dans votre espace.',
  erreur: 'Service momentanément indisponible. Réessayez plus tard.',
}

const EN: MotsPostuler = {
  titre: 'Submit a bid', chargement: 'Loading…',
  connectezVous: 'To submit a bid you need an account: the Centrale must know who is bidding. Create yours in a minute, or sign in if you already have one.',
  creerCompte: 'Create an account',
  seConnecter: 'Sign in',
  demandezAcces: 'You are signed in, but not yet attached to the Centrale. Request attachment from your space.',
  versEspace: 'Go to my space',
  enAttente: 'Your attachment request is being reviewed. You will be able to bid as soon as it is accepted.',
  suspendu: 'Your access is suspended. Contact the Centrale before bidding.',
  ferme: 'This notice is not open for bids. See the submission deadline above.',
  nom: 'Your name', nomAide: 'The person to contact about THIS bid — not necessarily the account holder.',
  contact: 'Contact', contactAide: 'Phone or email address.',
  prix: 'Amount offered', prixAide: 'Optional. If your price is in the attached file, leave blank.',
  devise: 'Currency',
  fichier: 'Your bid', fichierAide: 'PDF, Word, Excel or ZIP. 25 MB maximum.',
  envoyer: 'Submit my bid', envoi: 'Submitting…',
  deposee: 'Your bid has been submitted.',
  deposeeDetail: 'The Centrale will review it after the opening date and reply. You can find your submissions in your space.',
  erreur: 'Service temporarily unavailable. Try again later.',
}

const AR: MotsPostuler = {
  titre: 'تقديم عرض', chargement: 'جارٍ التحميل…',
  connectezVous: 'لتقديم عرض يلزمك حساب: يجب أن تعرف المركزية من يقدّم. أنشئ حسابك في دقيقة، أو سجّل الدخول إن كان لديك حساب.',
  creerCompte: 'إنشاء حساب',
  seConnecter: 'تسجيل الدخول',
  demandezAcces: 'أنت متصل، لكنك غير مرتبط بالمركزية بعد. اطلب الربط من مساحتك.',
  versEspace: 'الذهاب إلى مساحتي',
  enAttente: 'طلب ربطك قيد الدراسة. ستتمكن من تقديم عرض بمجرد قبوله.',
  suspendu: 'وصولك موقوف. اتصل بالمركزية قبل تقديم عرض.',
  ferme: 'هذا الإعلان غير مفتوح للعروض. راجع أجل التسليم أعلاه.',
  nom: 'اسمك', nomAide: 'الشخص الذي يُتصل به بخصوص هذا العرض — ليس بالضرورة صاحب الحساب.',
  contact: 'جهة الاتصال', contactAide: 'هاتف أو عنوان إلكتروني.',
  prix: 'المبلغ المقترح', prixAide: 'اختياري. إذا كان سعرك في الملف المرفق فاتركه فارغاً.',
  devise: 'العملة',
  fichier: 'عرضك', fichierAide: 'PDF أو Word أو Excel أو ZIP. 25 ميغابايت كحد أقصى.',
  envoyer: 'إيداع عرضي', envoi: 'جارٍ الإيداع…',
  deposee: 'تم إيداع عرضك.',
  deposeeDetail: 'ستدرسه المركزية بعد موعد فتح الأظرفة وتردّ عليك. تجد إيداعاتك في مساحتك.',
  erreur: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.',
}

const ES: MotsPostuler = {
  titre: 'Presentar una oferta', chargement: 'Cargando…',
  connectezVous: 'Para presentar una oferta necesita una cuenta: la Central debe saber quién oferta. Cree la suya en un minuto, o inicie sesión si ya tiene una.',
  creerCompte: 'Crear una cuenta',
  seConnecter: 'Iniciar sesión',
  demandezAcces: 'Ha iniciado sesión, pero aún no está vinculado a la Central. Solicite la vinculación desde su espacio.',
  versEspace: 'Ir a mi espacio',
  enAttente: 'Su solicitud de vinculación está en examen. Podrá ofertar en cuanto sea aceptada.',
  suspendu: 'Su acceso está suspendido. Contacte con la Central antes de ofertar.',
  ferme: 'Este anuncio no está abierto a ofertas. Consulte el plazo de entrega más arriba.',
  nom: 'Su nombre', nomAide: 'La persona de contacto para ESTA oferta — no necesariamente el titular de la cuenta.',
  contact: 'Contacto', contactAide: 'Teléfono o dirección electrónica.',
  prix: 'Importe propuesto', prixAide: 'Opcional. Si su precio figura en el archivo adjunto, déjelo vacío.',
  devise: 'Moneda',
  fichier: 'Su oferta', fichierAide: 'PDF, Word, Excel o ZIP. 25 MB como máximo.',
  envoyer: 'Presentar mi oferta', envoi: 'Enviando…',
  deposee: 'Su oferta ha sido presentada.',
  deposeeDetail: 'La Central la examinará tras la fecha de apertura y le responderá. Encontrará sus envíos en su espacio.',
  erreur: 'Servicio no disponible momentáneamente. Inténtelo más tarde.',
}

const PAR_LANGUE: Record<string, MotsPostuler> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsPostuler(lang: string | null | undefined): MotsPostuler {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_POSTULER = Object.keys(PAR_LANGUE)
