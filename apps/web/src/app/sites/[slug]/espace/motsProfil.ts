import type { MotsProfil } from './MonProfil'

// ============================================================================
// LOT 11 — LES MOTS DU PROFIL, DANS LES QUATRE LANGUES.
//
// `figee` EST LA PHRASE QUI COMPTE. Un champ qui disparaît sans explication
// se lit comme une panne ; celle-ci dit que c'est une décision, et ce qu'il
// faut faire à la place.
// ============================================================================

const ROLES_FR = { structure: 'Structure sanitaire', fournisseur: 'Fournisseur', agent: 'Agent de la Centrale' }
const ROLES_EN = { structure: 'Health facility', fournisseur: 'Supplier', agent: 'Centrale staff' }
const ROLES_AR = { structure: 'منشأة صحية', fournisseur: 'مورّد', agent: 'موظف المركزية' }
const ROLES_ES = { structure: 'Establecimiento sanitario', fournisseur: 'Proveedor', agent: 'Agente de la Central' }

const ETATS_FR = { en_attente: 'En attente d’examen', actif: 'Actif', suspendu: 'Suspendu' }
const ETATS_EN = { en_attente: 'Awaiting review', actif: 'Active', suspendu: 'Suspended' }
const ETATS_AR = { en_attente: 'في انتظار الدراسة', actif: 'نشط', suspendu: 'موقوف' }
const ETATS_ES = { en_attente: 'Pendiente de examen', actif: 'Activa', suspendu: 'Suspendida' }

const FR: MotsProfil & { titre: string; phrase: string } = {
  titre: 'Mon profil',
  phrase: 'Ce que la Centrale sait de vous, et ce que vous pouvez encore corriger.',
  chargement: 'Chargement…',
  refus: 'Connectez-vous pour voir votre profil.',
  identite: 'Votre compte', organisation: 'Organisation',
  role: 'Qualité', etat: 'État', reference: 'Référence',
  roles: ROLES_FR, etats: ETATS_FR,
  figee: 'Votre compte est suspendu : écrivez à la Centrale pour toute modification.',
  coordonnees: 'Vos coordonnées', nom: 'Nom complet', telephone: 'Téléphone',
  supprimerTitre: 'Supprimer mon compte', supprimerTexte: 'Votre compte et vos documents sur ce site seront supprimés. Cette action est définitive.',
  supprimerBouton: 'Supprimer mon compte', supprimerConfirmer: 'Supprimer définitivement votre compte sur ce site ?', supprime: 'Votre compte a été supprimé.',
  enregistrer: 'Enregistrer', enregistrement: 'Enregistrement…', enregistre: 'Enregistré.',
  motDePasse: 'Mot de passe', changerMotDePasse: 'Changer mon mot de passe',
  courrielEnvoye: 'Un courriel vient de vous être envoyé. Ouvrez-le pour choisir un nouveau mot de passe.',
}

const EN: MotsProfil & { titre: string; phrase: string } = {
  titre: 'My profile',
  phrase: 'What the Centrale knows about you, and what you can still correct.',
  chargement: 'Loading…', refus: 'Sign in to see your profile.',
  identite: 'Your account', organisation: 'Organisation',
  role: 'Capacity', etat: 'Status', reference: 'Reference',
  roles: ROLES_EN, etats: ETATS_EN,
  figee: 'Your account is suspended: write to the Centrale for any change.',
  coordonnees: 'Your details', nom: 'Full name', telephone: 'Phone',
  supprimerTitre: 'Delete my account', supprimerTexte: 'Your account and your documents on this site will be deleted. This cannot be undone.',
  supprimerBouton: 'Delete my account', supprimerConfirmer: 'Permanently delete your account on this site?', supprime: 'Your account has been deleted.',
  enregistrer: 'Save', enregistrement: 'Saving…', enregistre: 'Saved.',
  motDePasse: 'Password', changerMotDePasse: 'Change my password',
  courrielEnvoye: 'An email has just been sent to you. Open it to choose a new password.',
}

const AR: MotsProfil & { titre: string; phrase: string } = {
  titre: 'ملفي',
  phrase: 'ما تعرفه المركزية عنك، وما يمكنك تصحيحه بعد.',
  chargement: 'جارٍ التحميل…', refus: 'سجّل الدخول لعرض ملفك.',
  identite: 'حسابك', organisation: 'المؤسسة',
  role: 'الصفة', etat: 'الحالة', reference: 'المرجع',
  roles: ROLES_AR, etats: ETATS_AR,
  figee: 'حسابك موقوف: اكتب إلى المركزية لأي تعديل.',
  coordonnees: 'بياناتك', nom: 'الاسم الكامل', telephone: 'الهاتف',
  supprimerTitre: 'حذف حسابي', supprimerTexte: 'سيُحذف حسابك ووثائقك على هذا الموقع. لا يمكن التراجع عن ذلك.',
  supprimerBouton: 'حذف حسابي', supprimerConfirmer: 'حذف حسابك على هذا الموقع نهائياً؟', supprime: 'تم حذف حسابك.',
  enregistrer: 'حفظ', enregistrement: 'جارٍ الحفظ…', enregistre: 'تم الحفظ.',
  motDePasse: 'كلمة المرور', changerMotDePasse: 'تغيير كلمة المرور',
  courrielEnvoye: 'أُرسلت إليك رسالة للتو. افتحها لاختيار كلمة مرور جديدة.',
}

const ES: MotsProfil & { titre: string; phrase: string } = {
  titre: 'Mi perfil',
  phrase: 'Lo que la Central sabe de usted, y lo que aún puede corregir.',
  chargement: 'Cargando…', refus: 'Inicie sesión para ver su perfil.',
  identite: 'Su cuenta', organisation: 'Organización',
  role: 'Calidad', etat: 'Estado', reference: 'Referencia',
  roles: ROLES_ES, etats: ETATS_ES,
  figee: 'Su cuenta está suspendida: escriba a la Central para cualquier cambio.',
  coordonnees: 'Sus datos', nom: 'Nombre completo', telephone: 'Teléfono',
  supprimerTitre: 'Eliminar mi cuenta', supprimerTexte: 'Su cuenta y sus documentos en este sitio serán eliminados. Esta acción es definitiva.',
  supprimerBouton: 'Eliminar mi cuenta', supprimerConfirmer: '¿Eliminar definitivamente su cuenta en este sitio?', supprime: 'Su cuenta ha sido eliminada.',
  enregistrer: 'Guardar', enregistrement: 'Guardando…', enregistre: 'Guardado.',
  motDePasse: 'Contraseña', changerMotDePasse: 'Cambiar mi contraseña',
  courrielEnvoye: 'Acabamos de enviarle un correo. Ábralo para elegir una nueva contraseña.',
}

const PAR_LANGUE: Record<string, MotsProfil & { titre: string; phrase: string }> = { fr: FR, en: EN, ar: AR, es: ES }

export function motsProfil(lang: string | null | undefined) {
  return PAR_LANGUE[(lang ?? 'fr').slice(0, 2).toLowerCase()] ?? FR
}

/** Exportée pour que le cliquet énumère au lieu de supposer. */
export const LANGUES_PROFIL = Object.keys(PAR_LANGUE)
