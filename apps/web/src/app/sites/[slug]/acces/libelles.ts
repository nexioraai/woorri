import type { LibellesAcces, ChampsInscription } from './FormulaireAcces'

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
  inscription: { titre: string; phrase: string; libelles: LibellesAcces; champs: ChampsInscription; dejaInscrit: string; seConnecter: string }
  oubli: { titre: string; phrase: string; libelles: LibellesAcces; retour: string }
  accueil: string
  /** L'œil du mot de passe (LOT 18). */
  voir: { afficher: string; masquer: string }
}

const REFUS_FR = 'Ces informations ne permettent pas d’entrer. Vérifiez l’adresse et le mot de passe.'
const REFUS_EN = 'These details do not allow access. Check the address and password.'
const REFUS_AR = 'لا تسمح هذه المعلومات بالدخول. تحقّق من العنوان وكلمة المرور.'
const REFUS_ES = 'Estos datos no permiten el acceso. Compruebe la dirección y la contraseña.'

const FR: MotsAcces = {
  accueil: '← Accueil',
  voir: { afficher: 'Afficher le mot de passe', masquer: 'Masquer le mot de passe' },
  connexion: {
    titre: 'Se connecter',
    phrase: 'Entrez avec l’adresse électronique que vous avez enregistrée.',
    pasDeCompte: 'Pas encore de compte ?', creer: 'Créer un compte',
    oublie: 'Mot de passe oublié',
    libelles: {
      courriel: 'Adresse électronique', motDePasse: 'Mot de passe',
      envoyer: 'Se connecter', envoi: 'Connexion…',
      succes: 'Vous êtes connecté.', refus: REFUS_FR,
      minimum: 'Huit caractères au minimum.',
    },
  },
  inscription: {
    titre: 'Créer un compte',
    phrase: 'Remplissez ce formulaire : votre compte est créé tout de suite, sans attente.',
    champs: { nom: 'Nom complet', organisation: 'Organisation ou entreprise', role: 'Vous êtes', fournisseur: 'Fournisseur', structure: 'Structure sanitaire', telephone: 'Téléphone', deja: 'Un compte existe déjà avec cette adresse. Connectez-vous.' },
    dejaInscrit: 'Vous avez déjà un accès ?', seConnecter: 'Se connecter',
    libelles: {
      courriel: 'Adresse électronique', motDePasse: 'Mot de passe',
      envoyer: 'Créer mon compte', envoi: 'Création…',
      succes: 'Votre compte est créé.',
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
  voir: { afficher: 'Show password', masquer: 'Hide password' },
  connexion: {
    titre: 'Sign in', phrase: 'Sign in with the address you registered.',
    pasDeCompte: 'No access yet?', creer: 'Create access', oublie: 'Forgotten password',
    libelles: { courriel: 'Email address', motDePasse: 'Password', envoyer: 'Sign in', envoi: 'Signing in…', succes: 'You are signed in.', refus: REFUS_EN, minimum: 'Eight characters minimum.' },
  },
  inscription: {
    titre: 'Create an account',
    phrase: 'Fill in this form: your account is created straight away, with no waiting.',
    champs: { nom: 'Full name', organisation: 'Organisation or company', role: 'You are', fournisseur: 'Supplier', structure: 'Health facility', telephone: 'Phone', deja: 'An account already exists with this address. Please sign in.' },
    dejaInscrit: 'Already have access?', seConnecter: 'Sign in',
    libelles: { courriel: 'Email address', motDePasse: 'Password', envoyer: 'Create my account', envoi: 'Creating…', succes: 'Your account is created.', refus: REFUS_EN, minimum: 'Eight characters minimum.' },
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
  voir: { afficher: 'إظهار كلمة المرور', masquer: 'إخفاء كلمة المرور' },
  connexion: {
    titre: 'تسجيل الدخول', phrase: 'ادخل بالعنوان الإلكتروني الذي سجّلته.',
    pasDeCompte: 'ليس لديك وصول بعد؟', creer: 'إنشاء وصول', oublie: 'نسيت كلمة المرور',
    libelles: { courriel: 'العنوان الإلكتروني', motDePasse: 'كلمة المرور', envoyer: 'تسجيل الدخول', envoi: 'جارٍ الدخول…', succes: 'تم تسجيل دخولك.', refus: REFUS_AR, minimum: 'ثمانية أحرف على الأقل.' },
  },
  inscription: {
    titre: 'إنشاء حساب',
    phrase: 'املأ هذا النموذج: يُنشأ حسابك فوراً، دون انتظار.',
    champs: { nom: 'الاسم الكامل', organisation: 'الهيئة أو الشركة', role: 'أنت', fournisseur: 'مورّد', structure: 'مؤسسة صحية', telephone: 'الهاتف', deja: 'يوجد حساب بهذا العنوان بالفعل. سجّل الدخول.' },
    dejaInscrit: 'لديك وصول بالفعل؟', seConnecter: 'تسجيل الدخول',
    libelles: { courriel: 'العنوان الإلكتروني', motDePasse: 'كلمة المرور', envoyer: 'إنشاء حسابي', envoi: 'جارٍ الإنشاء…', succes: 'تم إنشاء حسابك.', refus: REFUS_AR, minimum: 'ثمانية أحرف على الأقل.' },
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
  voir: { afficher: 'Mostrar la contraseña', masquer: 'Ocultar la contraseña' },
  connexion: {
    titre: 'Iniciar sesión', phrase: 'Entre con la dirección que registró.',
    pasDeCompte: '¿Aún no tiene acceso?', creer: 'Crear acceso', oublie: 'Contraseña olvidada',
    libelles: { courriel: 'Dirección electrónica', motDePasse: 'Contraseña', envoyer: 'Iniciar sesión', envoi: 'Entrando…', succes: 'Ha iniciado sesión.', refus: REFUS_ES, minimum: 'Ocho caracteres como mínimo.' },
  },
  inscription: {
    titre: 'Crear una cuenta',
    phrase: 'Rellene este formulario: su cuenta se crea al instante, sin espera.',
    champs: { nom: 'Nombre completo', organisation: 'Organización o empresa', role: 'Usted es', fournisseur: 'Proveedor', structure: 'Centro sanitario', telephone: 'Teléfono', deja: 'Ya existe una cuenta con esta dirección. Inicie sesión.' },
    dejaInscrit: '¿Ya tiene acceso?', seConnecter: 'Iniciar sesión',
    libelles: { courriel: 'Dirección electrónica', motDePasse: 'Contraseña', envoyer: 'Crear mi cuenta', envoi: 'Creando…', succes: 'Su cuenta está creada.', refus: REFUS_ES, minimum: 'Ocho caracteres como mínimo.' },
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
