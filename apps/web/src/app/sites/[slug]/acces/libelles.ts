import type { LibellesAcces } from './FormulaireAcces'

// ============================================================================
// LOT 11 — LES MOTS DES ÉCRANS D'ACCÈS, EN UN SEUL ENDROIT.
//
// LES QUATRE LANGUES, comme partout ailleurs dans ce dossier. Un écran non
// traduit s'afficherait en français sur un site anglophone — et celui-ci
// est le premier qu'une personne voit avant d'entrer.
//
// LE REFUS NE DIT JAMAIS LAQUELLE DES CAUSES. « Adresse inconnue » et
// « mot de passe faux » distingués, c'est un testeur d'adresses offert à
// qui veut savoir qui travaille avec la Centrale.
// ============================================================================

export type MotsAcces = {
  connexion: { titre: string; phrase: string; libelles: LibellesAcces; pasDeCompte: string; creer: string; oublie: string }
  inscription: { titre: string; phrase: string; libelles: LibellesAcces; dejaInscrit: string; seConnecter: string }
  oubli: { titre: string; phrase: string; libelles: LibellesAcces; retour: string }
  accueil: string
}

const REFUS_FR = 'Ces informations ne permettent pas d’entrer. Vérifiez l’adresse et le mot de passe.'
const REFUS_EN = 'These details do not allow access. Check the address and password.'
const REFUS_AR = 'لا تسمح هذه المعلومات بالدخول. تحقّق من العنوان وكلمة المرور.'
const REFUS_ES = 'Estos datos no permiten el acceso. Compruebe la dirección y la contraseña.'

const FR: MotsAcces = {
  accueil: '← Accueil',
  connexion: {
    titre: 'Se connecter',
    phrase: 'Entrez avec l’adresse électronique que vous avez enregistrée.',
    pasDeCompte: 'Pas encore d’accès ?', creer: 'Créer un accès',
    oublie: 'Mot de passe oublié',
    libelles: {
      courriel: 'Adresse électronique', motDePasse: 'Mot de passe',
      envoyer: 'Se connecter', envoi: 'Connexion…',
      succes: 'Vous êtes connecté.', refus: REFUS_FR,
      minimum: 'Huit caractères au minimum.',
    },
  },
  inscription: {
    titre: 'Créer un accès',
    phrase: 'Créez d’abord votre accès. Vous demanderez ensuite votre rattachement à la Centrale — s’inscrire ne donne aucun droit.',
    dejaInscrit: 'Vous avez déjà un accès ?', seConnecter: 'Se connecter',
    libelles: {
      courriel: 'Adresse électronique', motDePasse: 'Mot de passe',
      envoyer: 'Créer mon accès', envoi: 'Création…',
      succes: 'Un courriel de confirmation vous a été envoyé. Ouvrez-le pour activer votre accès, puis revenez demander votre rattachement.',
      refus: REFUS_FR, minimum: 'Huit caractères au minimum.',
    },
  },
  oubli: {
    titre: 'Mot de passe oublié',
    phrase: 'Indiquez votre adresse électronique. Si un accès y est enregistré, vous recevrez un lien pour choisir un nouveau mot de passe.',
    retour: 'Revenir à la connexion',
    libelles: {
      courriel: 'Adresse électronique', motDePasse: '',
      envoyer: 'Envoyer le lien', envoi: 'Envoi…',
      // LE MÊME MESSAGE QUE L'ADRESSE SOIT CONNUE OU NON. C'est écrit au
      // conditionnel exprès : « si un accès y est enregistré ».
      succes: 'Si un accès est enregistré à cette adresse, un lien vient d’y être envoyé.',
      refus: 'Service momentanément indisponible. Réessayez plus tard.',
      minimum: '',
    },
  },
}

const EN: MotsAcces = {
  accueil: '← Home',
  connexion: {
    titre: 'Sign in', phrase: 'Sign in with the address you registered.',
    pasDeCompte: 'No access yet?', creer: 'Create access', oublie: 'Forgotten password',
    libelles: { courriel: 'Email address', motDePasse: 'Password', envoyer: 'Sign in', envoi: 'Signing in…', succes: 'You are signed in.', refus: REFUS_EN, minimum: 'Eight characters minimum.' },
  },
  inscription: {
    titre: 'Create access',
    phrase: 'Create your access first. You will then request to be attached to the Centrale — registering grants no rights.',
    dejaInscrit: 'Already have access?', seConnecter: 'Sign in',
    libelles: { courriel: 'Email address', motDePasse: 'Password', envoyer: 'Create my access', envoi: 'Creating…', succes: 'A confirmation email has been sent. Open it to activate your access, then come back to request attachment.', refus: REFUS_EN, minimum: 'Eight characters minimum.' },
  },
  oubli: {
    titre: 'Forgotten password',
    phrase: 'Enter your email address. If access is registered there, you will receive a link to choose a new password.',
    retour: 'Back to sign in',
    libelles: { courriel: 'Email address', motDePasse: '', envoyer: 'Send the link', envoi: 'Sending…', succes: 'If access is registered at this address, a link has just been sent.', refus: 'Service temporarily unavailable. Try again later.', minimum: '' },
  },
}

const AR: MotsAcces = {
  accueil: '← الصفحة الرئيسية',
  connexion: {
    titre: 'تسجيل الدخول', phrase: 'ادخل بالعنوان الإلكتروني الذي سجّلته.',
    pasDeCompte: 'ليس لديك وصول بعد؟', creer: 'إنشاء وصول', oublie: 'نسيت كلمة المرور',
    libelles: { courriel: 'العنوان الإلكتروني', motDePasse: 'كلمة المرور', envoyer: 'تسجيل الدخول', envoi: 'جارٍ الدخول…', succes: 'تم تسجيل دخولك.', refus: REFUS_AR, minimum: 'ثمانية أحرف على الأقل.' },
  },
  inscription: {
    titre: 'إنشاء وصول',
    phrase: 'أنشئ وصولك أولاً. ثم اطلب ربطك بالمركزية — التسجيل لا يمنح أي حقوق.',
    dejaInscrit: 'لديك وصول بالفعل؟', seConnecter: 'تسجيل الدخول',
    libelles: { courriel: 'العنوان الإلكتروني', motDePasse: 'كلمة المرور', envoyer: 'إنشاء وصولي', envoi: 'جارٍ الإنشاء…', succes: 'أُرسلت رسالة تأكيد. افتحها لتفعيل وصولك ثم عد لطلب الربط.', refus: REFUS_AR, minimum: 'ثمانية أحرف على الأقل.' },
  },
  oubli: {
    titre: 'نسيت كلمة المرور',
    phrase: 'أدخل عنوانك الإلكتروني. إذا كان هناك وصول مسجّل به فستتلقى رابطاً لاختيار كلمة مرور جديدة.',
    retour: 'العودة إلى تسجيل الدخول',
    libelles: { courriel: 'العنوان الإلكتروني', motDePasse: '', envoyer: 'إرسال الرابط', envoi: 'جارٍ الإرسال…', succes: 'إذا كان هناك وصول مسجّل بهذا العنوان فقد أُرسل إليه رابط للتو.', refus: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.', minimum: '' },
  },
}

const ES: MotsAcces = {
  accueil: '← Inicio',
  connexion: {
    titre: 'Iniciar sesión', phrase: 'Entre con la dirección que registró.',
    pasDeCompte: '¿Aún no tiene acceso?', creer: 'Crear acceso', oublie: 'Contraseña olvidada',
    libelles: { courriel: 'Dirección electrónica', motDePasse: 'Contraseña', envoyer: 'Iniciar sesión', envoi: 'Entrando…', succes: 'Ha iniciado sesión.', refus: REFUS_ES, minimum: 'Ocho caracteres como mínimo.' },
  },
  inscription: {
    titre: 'Crear acceso',
    phrase: 'Cree primero su acceso. Después solicitará su vinculación a la Central — registrarse no otorga ningún derecho.',
    dejaInscrit: '¿Ya tiene acceso?', seConnecter: 'Iniciar sesión',
    libelles: { courriel: 'Dirección electrónica', motDePasse: 'Contraseña', envoyer: 'Crear mi acceso', envoi: 'Creando…', succes: 'Se le ha enviado un correo de confirmación. Ábralo para activar su acceso y vuelva a solicitar la vinculación.', refus: REFUS_ES, minimum: 'Ocho caracteres como mínimo.' },
  },
  oubli: {
    titre: 'Contraseña olvidada',
    phrase: 'Indique su dirección electrónica. Si hay un acceso registrado, recibirá un enlace para elegir una nueva contraseña.',
    retour: 'Volver a iniciar sesión',
    libelles: { courriel: 'Dirección electrónica', motDePasse: '', envoyer: 'Enviar el enlace', envoi: 'Enviando…', succes: 'Si hay un acceso registrado en esta dirección, se acaba de enviar un enlace.', refus: 'Servicio no disponible momentáneamente. Inténtelo más tarde.', minimum: '' },
  },
}

const PAR_LANGUE: Record<string, MotsAcces> = { fr: FR, en: EN, ar: AR, es: ES }

/** Les mots d'une langue. Le français est le repli — c'est la langue du site. */
export function motsAcces(lang: string | null | undefined): MotsAcces {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Les langues servies. Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_ACCES = Object.keys(PAR_LANGUE)
