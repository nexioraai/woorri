import type { MotsEspace } from './EspaceClient'
import { accorder, type Institution } from '@/lib/sites/institution'

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
  demanderPhrase: 'Votre accès est créé. Indiquez à quel titre vous travaillez avec {{la}} : votre demande sera examinée avant toute ouverture de droits.',
  jeSuis: 'Je représente', structure: 'Une structure sanitaire', fournisseur: 'Un fournisseur',
  organisation: 'Nom de l’organisation', envoyer: 'Envoyer ma demande', envoi: 'Envoi…',
  enAttente: 'Votre demande a bien été enregistrée. Elle est en cours d’examen par {{la}} ; vous n’avez rien d’autre à faire pour l’instant.',
  suspendu: 'Votre accès est suspendu. Prenez contact avec {{la}} pour connaître la suite à donner.',
  bienvenue: 'Bienvenue dans votre espace.',
  role: 'Qualité', deconnexion: 'Se déconnecter',
  erreur: 'Service momentanément indisponible. Réessayez plus tard.',
  suivreDemande: 'Suivre une demande par sa référence',
  mesCommandes: 'Mes commandes', agentDdm: 'Agent {{de}}', tableauDeBord: 'Tableau de bord', passerCommande: 'Passer une commande', navPrincipal: 'Principal', navGestion: 'Service clients', navFournisseur: 'Fournisseur', navEchanges: 'Échanges', navCompte: 'Mon compte', compteActif: 'Compte actif', membreDepuis: 'Membre depuis le', bonjour: 'Bonjour', accesRapides: 'Accès rapides', vueEnsemble: 'Vue d’ensemble de votre espace.', ong: 'ONG ou association', gestionCommandes: 'Commandes', comptesClients: 'Clients', messages: 'Messages', mesDemandes: 'Mes demandes', mesReclamations: 'Mes réclamations', mesDocuments: 'Mes documents', monDossier: 'Mon dossier', maPrequalification: 'Ma préqualification', mesConsultations: 'Mes consultations', monProfil: 'Mon profil',
}

const EN: MotsEspace = {
  titre: 'My space', chargement: 'Loading…',
  entrezDabord: 'Sign in to reach your space.', seConnecter: 'Sign in',
  demanderTitre: 'Request your attachment',
  demanderPhrase: 'Your access is created. State in what capacity you work with {{the}}: your request will be reviewed before any rights are opened.',
  jeSuis: 'I represent', structure: 'A health facility', fournisseur: 'A supplier',
  organisation: 'Organisation name', envoyer: 'Send my request', envoi: 'Sending…',
  enAttente: 'Your request has been recorded. It is being reviewed by {{the}}; there is nothing else to do for now.',
  suspendu: 'Your access is suspended. Please contact {{the}} to find out what happens next.',
  bienvenue: 'Welcome to your space.',
  role: 'Capacity', deconnexion: 'Sign out',
  erreur: 'Service temporarily unavailable. Try again later.',
  suivreDemande: 'Track a request by its reference',
  mesCommandes: 'My orders', agentDdm: '{{nu}} staff', tableauDeBord: 'Dashboard', passerCommande: 'Place an order', navPrincipal: 'Main', navGestion: 'Client service', navFournisseur: 'Supplier', navEchanges: 'Exchanges', navCompte: 'My account', compteActif: 'Active account', membreDepuis: 'Member since', bonjour: 'Hello', accesRapides: 'Quick access', vueEnsemble: 'An overview of your space.', ong: 'NGO or association', gestionCommandes: 'Orders', comptesClients: 'Clients', messages: 'Messages', mesDemandes: 'My requests', mesReclamations: 'My complaints', mesDocuments: 'My documents', monDossier: 'My file', maPrequalification: 'My prequalification', mesConsultations: 'My consultations', monProfil: 'My profile',
}

const AR: MotsEspace = {
  titre: 'مساحتي', chargement: 'جارٍ التحميل…',
  entrezDabord: 'سجّل الدخول للوصول إلى مساحتك.', seConnecter: 'تسجيل الدخول',
  demanderTitre: 'اطلب ربطك',
  demanderPhrase: 'تم إنشاء وصولك. بيّن بأي صفة تعمل مع {{al}}: ستُدرس طلبك قبل فتح أي حقوق.',
  jeSuis: 'أمثّل', structure: 'منشأة صحية', fournisseur: 'مورّداً',
  organisation: 'اسم المؤسسة', envoyer: 'إرسال طلبي', envoi: 'جارٍ الإرسال…',
  enAttente: 'تم تسجيل طلبك. تدرسه {{al}} حالياً؛ لا شيء آخر عليك فعله الآن.',
  suspendu: 'وصولك موقوف. يرجى الاتصال ب{{al}} لمعرفة الإجراء التالي.',
  bienvenue: 'مرحباً بك في مساحتك.',
  role: 'الصفة', deconnexion: 'تسجيل الخروج',
  erreur: 'الخدمة غير متاحة مؤقتاً. حاول لاحقاً.',
  suivreDemande: 'تتبّع طلباً بمرجعه',
  mesCommandes: 'طلبياتي', agentDdm: 'موظف المركز', tableauDeBord: 'لوحة القيادة', passerCommande: 'تقديم طلبية', navPrincipal: 'الرئيسية', navGestion: 'خدمة العملاء', navFournisseur: 'المورّد', navEchanges: 'المراسلات', navCompte: 'حسابي', compteActif: 'حساب نشط', membreDepuis: 'عضو منذ', bonjour: 'مرحباً', accesRapides: 'وصول سريع', vueEnsemble: 'نظرة عامة على فضائك.', ong: 'منظمة غير حكومية أو جمعية', gestionCommandes: 'الطلبيات', comptesClients: 'العملاء', messages: 'الرسائل', mesDemandes: 'طلباتي', mesReclamations: 'شكاواي', mesDocuments: 'مستنداتي', monDossier: 'ملف اعتمادي', maPrequalification: 'تأهيلي المسبق', mesConsultations: 'استشاراتي', monProfil: 'ملفي',
}

const ES: MotsEspace = {
  titre: 'Mi espacio', chargement: 'Cargando…',
  entrezDabord: 'Inicie sesión para acceder a su espacio.', seConnecter: 'Iniciar sesión',
  demanderTitre: 'Solicitar su vinculación',
  demanderPhrase: 'Su acceso está creado. Indique en qué calidad trabaja con {{la}}: su solicitud será examinada antes de abrir ningún derecho.',
  jeSuis: 'Represento a', structure: 'Un establecimiento sanitario', fournisseur: 'Un proveedor',
  organisation: 'Nombre de la organización', envoyer: 'Enviar mi solicitud', envoi: 'Enviando…',
  enAttente: 'Su solicitud ha quedado registrada. {{La}} la está examinando; por ahora no debe hacer nada más.',
  suspendu: 'Su acceso está suspendido. Póngase en contacto con {{la}} para conocer los pasos a seguir.',
  bienvenue: 'Bienvenido a su espacio.',
  role: 'Calidad', deconnexion: 'Cerrar sesión',
  erreur: 'Servicio no disponible momentáneamente. Inténtelo más tarde.',
  suivreDemande: 'Seguir una solicitud por su referencia',
  mesCommandes: 'Mis pedidos', agentDdm: 'Personal {{de}}', tableauDeBord: 'Panel', passerCommande: 'Realizar un pedido', navPrincipal: 'Principal', navGestion: 'Atención al cliente', navFournisseur: 'Proveedor', navEchanges: 'Intercambios', navCompte: 'Mi cuenta', compteActif: 'Cuenta activa', membreDepuis: 'Miembro desde el', bonjour: 'Hola', accesRapides: 'Accesos rápidos', vueEnsemble: 'Resumen de su espacio.', ong: 'ONG o asociación', gestionCommandes: 'Pedidos', comptesClients: 'Clientes', messages: 'Mensajes', mesDemandes: 'Mis solicitudes', mesReclamations: 'Mis reclamaciones', mesDocuments: 'Mis documentos', monDossier: 'Mi expediente', maPrequalification: 'Mi homologación previa', mesConsultations: 'Mis consultas', monProfil: 'Mi perfil',
}

const PAR_LANGUE: Record<string, MotsEspace> = { fr: FR, en: EN, ar: AR, es: ES }

function motsEspaceBrut(lang: string | null | undefined): MotsEspace {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_ESPACE = Object.keys(PAR_LANGUE)

/**
 * Les mots, avec le nom de l'institution DU SITE (lot 2 « textes neutres »,
 * 2026-11-26) : les jetons {{la}}, {{de}}… deviennent « la Centrale » pour la
 * CPA, la désignation du site ailleurs. Voir `@/lib/sites/institution`.
 */
export function motsEspace(lang: string | null | undefined, inst: Institution): ReturnType<typeof motsEspaceBrut> {
  return accorder(motsEspaceBrut(lang), inst)
}
