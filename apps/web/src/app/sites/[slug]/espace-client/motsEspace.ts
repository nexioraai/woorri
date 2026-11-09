import type { MotsEspace } from './EspaceClient'

// ============================================================================
// LOT 11 — LES MOTS DE L'ESPACE, DANS LES QUATRE LANGUES.
//
// CHAQUE SITUATION SE NOMME. « En attente » et « suspendu » ne se
// confondent pas : la première demande de patienter, la seconde demande
// d'écrire à la Centrale. Les dire pareil ferait attendre pour rien
// quelqu'un dont l'accès a été retiré.
// ============================================================================

const FR: MotsEspace = {
  titre: 'Mon espace', chargement: 'Chargement…',
  entrezDabord: 'Connectez-vous pour accéder à votre espace.',
  seConnecter: 'Se connecter',
  demanderTitre: 'Demander votre rattachement',
  demanderPhrase: 'Votre accès est créé. Indiquez à quel titre vous travaillez avec la Centrale : votre demande sera examinée avant toute ouverture de droits.',
  jeSuis: 'Je représente', structure: 'Une structure sanitaire', fournisseur: 'Un fournisseur',
  organisation: 'Nom de l’organisation', envoyer: 'Envoyer ma demande', envoi: 'Envoi…',
  enAttente: 'Votre demande a bien été enregistrée. Elle est en cours d’examen par la Centrale ; vous n’avez rien d’autre à faire pour l’instant.',
  suspendu: 'Votre accès est suspendu. Prenez contact avec la Centrale pour connaître la suite à donner.',
  bienvenue: 'Bienvenue dans votre espace.',
  role: 'Qualité', deconnexion: 'Se déconnecter',
  erreur: 'Service momentanément indisponible. Réessayez plus tard.',
  suivreDemande: 'Suivre une demande par sa référence',
  mesDemandes: 'Mes demandes', mesReclamations: 'Mes réclamations', monProfil: 'Mon profil',
}

const EN: MotsEspace = {
  titre: 'My space', chargement: 'Loading…',
  entrezDabord: 'Sign in to reach your space.', seConnecter: 'Sign in',
  demanderTitre: 'Request your attachment',
  demanderPhrase: 'Your access is created. State in what capacity you work with the Centrale: your request will be reviewed before any rights are opened.',
  jeSuis: 'I represent', structure: 'A health facility', fournisseur: 'A supplier',
  organisation: 'Organisation name', envoyer: 'Send my request', envoi: 'Sending…',
  enAttente: 'Your request has been recorded. It is being reviewed by the Centrale; there is nothing else to do for now.',
  suspendu: 'Your access is suspended. Please contact the Centrale to find out what happens next.',
  bienvenue: 'Welcome to your space.',
  role: 'Capacity', deconnexion: 'Sign out',
  erreur: 'Service temporarily unavailable. Try again later.',
  suivreDemande: 'Track a request by its reference',
  mesDemandes: 'My requests', mesReclamations: 'My complaints', monProfil: 'My profile',
}

const AR: MotsEspace = {
  titre: 'مساحتي', chargement: 'جارٍ التحميل…',
  entrezDabord: 'سجّل الدخول للوصول إلى مساحتك.', seConnecter: 'تسجيل الدخول',
  demanderTitre: 'اطلب ربطك',
  demanderPhrase: 'تم إنشاء وصولك. بيّن بأي صفة تعمل مع المركزية: ستُدرس طلبك قبل فتح أي حقوق.',
  jeSuis: 'أمثّل', structure: 'منشأة صحية', fournisseur: 'مورّداً',
  organisation: 'اسم المؤسسة', envoyer: 'إرسال طلبي', envoi: 'جارٍ الإرسال…',
  enAttente: 'تم تسجيل طلبك. تدرسه المركزية حالياً؛ لا شيء آخر عليك فعله الآن.',
  suspendu: 'وصولك موقوف. يرجى الاتصال بالمركزية لمعرفة الإجراء التالي.',
  bienvenue: 'مرحباً بك في مساحتك.',
  role: 'الصفة', deconnexion: 'تسجيل الخروج',
  erreur: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.',
  suivreDemande: 'تتبّع طلباً بمرجعه',
  mesDemandes: 'طلباتي', mesReclamations: 'شكاواي', monProfil: 'ملفي',
}

const ES: MotsEspace = {
  titre: 'Mi espacio', chargement: 'Cargando…',
  entrezDabord: 'Inicie sesión para acceder a su espacio.', seConnecter: 'Iniciar sesión',
  demanderTitre: 'Solicitar su vinculación',
  demanderPhrase: 'Su acceso está creado. Indique en qué calidad trabaja con la Central: su solicitud será examinada antes de abrir ningún derecho.',
  jeSuis: 'Represento a', structure: 'Un establecimiento sanitario', fournisseur: 'Un proveedor',
  organisation: 'Nombre de la organización', envoyer: 'Enviar mi solicitud', envoi: 'Enviando…',
  enAttente: 'Su solicitud ha quedado registrada. La Central la está examinando; por ahora no debe hacer nada más.',
  suspendu: 'Su acceso está suspendido. Póngase en contacto con la Central para conocer los pasos a seguir.',
  bienvenue: 'Bienvenido a su espacio.',
  role: 'Calidad', deconnexion: 'Cerrar sesión',
  erreur: 'Servicio no disponible momentáneamente. Inténtelo más tarde.',
  suivreDemande: 'Seguir una solicitud por su referencia',
  mesDemandes: 'Mis solicitudes', mesReclamations: 'Mis reclamaciones', monProfil: 'Mi perfil',
}

const PAR_LANGUE: Record<string, MotsEspace> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsEspace(lang: string | null | undefined): MotsEspace {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_ESPACE = Object.keys(PAR_LANGUE)
