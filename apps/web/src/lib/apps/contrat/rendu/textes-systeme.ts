/**
 * V3 — LES TEXTES DU MOTEUR LUI-MÊME (états, garde, barre), écrits par Deribfy
 * et traduits par Deribfy. Une langue lue sans entrée ici retombe sur l'anglais.
 */
export type CleSysteme =
  | 'chargement' | 'erreur' | 'reessayer' | 'vide' | 'partiel' | 'quiEtesVous' | 'entrerComme' | 'accueil' | 'compte'
  | 'actualise' | 'transmis' | 'partage' | 'connecte' | 'deconnecte' | 'enregistre' | 'navigation' | 'langue'
  | 'garde' | 'visiteur' | 'pasEncore' | 'ces30' | 'profil' | 'autres'
  | 'reglages' | 'theme' | 'clair' | 'sombre' | 'espace' | 'menu' | 'gestion' | 'voirTout' | 'ceMois' | 'vsMois' | 'apercu' | 'seConnecter'
  | 'prendrePhoto' | 'choisirImage' | 'filmer' | 'choisirVideo' | 'joindre' | 'maPosition' | 'retirer' | 'positionIndisponible' | 'tropLourd' | 'ouvrirFichier' | 'connecterPourEnvoyer' | 'reprendre' | 'valider' | 'verifierPrise'

export const TEXTES_SYSTEME: Readonly<Record<string, Readonly<Record<CleSysteme, string>>>> = {
  fr: {
    chargement: 'Chargement…', erreur: 'Ces informations n’ont pas pu être chargées.', reessayer: 'Réessayer', vide: 'Rien à afficher pour l’instant.',
    partiel: 'Une partie des informations n’est pas encore arrivée.', quiEtesVous: 'Qui êtes-vous ?', entrerComme: 'Entrer comme', accueil: 'Accueil',
    compte: 'Compte', actualise: 'Informations actualisées.', transmis: 'Votre demande est transmise.', partage: 'Lien prêt à partager.',
    connecte: 'Vous êtes connecté.', deconnecte: 'Vous êtes déconnecté.', enregistre: 'Enregistré.', navigation: 'Navigation', langue: 'Langue',
    garde: 'Cet espace est réservé au profil « {r} ». Choisissez-le pour continuer.', visiteur: 'Visiteur', pasEncore: 'Pas encore de données', ces30: 'ces 30 derniers jours', profil: 'Profil', autres: 'Autres',
    seConnecter: 'Se connecter', prendrePhoto: 'Prendre une photo', choisirImage: 'Choisir une image', filmer: 'Filmer', choisirVideo: 'Choisir une vidéo', joindre: 'Joindre un fichier', maPosition: 'Utiliser ma position', retirer: 'Retirer', positionIndisponible: 'Position indisponible : autorisez la localisation, ou saisissez-la.', tropLourd: 'Fichier trop lourd (au plus {n} Mo).', ouvrirFichier: 'Ouvrir le fichier', connecterPourEnvoyer: 'Connectez-vous pour envoyer un fichier.', reprendre: 'Reprendre', valider: 'Valider', verifierPrise: 'Vérifiez la prise : reprenez-la, ou validez-la pour la garder.', reglages: 'Réglages', theme: 'Apparence', clair: 'Clair', sombre: 'Sombre', espace: 'Espace {r}', menu: 'Menu', gestion: 'Gestion', voirTout: 'Voir tout', ceMois: 'Ce mois-ci', vsMois: 'vs mois précédent', apercu: 'Aperçu · données d’essai',
  },
  en: {
    chargement: 'Loading…', erreur: 'This information could not be loaded.', reessayer: 'Try again', vide: 'Nothing to show yet.',
    partiel: 'Some information has not arrived yet.', quiEtesVous: 'Who are you?', entrerComme: 'Enter as', accueil: 'Home',
    compte: 'Account', actualise: 'Information refreshed.', transmis: 'Your request has been sent.', partage: 'Link ready to share.',
    connecte: 'You are signed in.', deconnecte: 'You are signed out.', enregistre: 'Saved.', navigation: 'Navigation', langue: 'Language',
    garde: 'This area is for the « {r} » profile. Choose it to continue.', visiteur: 'Visitor', pasEncore: 'No data yet', ces30: 'in the last 30 days', profil: 'Profile', autres: 'Other',
    seConnecter: 'Sign in', prendrePhoto: 'Take a photo', choisirImage: 'Choose an image', filmer: 'Record', choisirVideo: 'Choose a video', joindre: 'Attach a file', maPosition: 'Use my location', retirer: 'Remove', positionIndisponible: 'Location unavailable: allow location access, or type it.', tropLourd: 'File too large (at most {n} MB).', ouvrirFichier: 'Open the file', connecterPourEnvoyer: 'Sign in to send a file.', reprendre: 'Retake', valider: 'Confirm', verifierPrise: 'Check it: retake it, or confirm to keep it.', reglages: 'Settings', theme: 'Appearance', clair: 'Light', sombre: 'Dark', espace: '{r} area', menu: 'Menu', gestion: 'Management', voirTout: 'View all', ceMois: 'This month', vsMois: 'vs last month', apercu: 'Preview · sample data',
  },
  ar: {
    chargement: 'جارٍ التحميل…', erreur: 'تعذّر تحميل هذه المعلومات.', reessayer: 'إعادة المحاولة', vide: 'لا يوجد ما يُعرض حاليًا.',
    partiel: 'لم يصل جزء من المعلومات بعد.', quiEtesVous: 'من أنت؟', entrerComme: 'الدخول بصفة', accueil: 'الرئيسية',
    compte: 'الحساب', actualise: 'تم تحديث المعلومات.', transmis: 'تم إرسال طلبك.', partage: 'الرابط جاهز للمشاركة.',
    connecte: 'تم تسجيل دخولك.', deconnecte: 'تم تسجيل خروجك.', enregistre: 'تم الحفظ.', navigation: 'التنقل', langue: 'اللغة',
    garde: 'هذا القسم مخصص لملف « {r} ». اختره للمتابعة.', visiteur: 'زائر', pasEncore: 'لا توجد بيانات بعد', ces30: 'خلال آخر 30 يومًا', profil: 'الملف', autres: 'أخرى',
    seConnecter: 'تسجيل الدخول', prendrePhoto: 'التقاط صورة', choisirImage: 'اختيار صورة', filmer: 'تصوير فيديو', choisirVideo: 'اختيار فيديو', joindre: 'إرفاق ملف', maPosition: 'استخدام موقعي', retirer: 'إزالة', positionIndisponible: 'الموقع غير متاح: اسمح بتحديد الموقع أو اكتبه.', tropLourd: 'الملف كبير جدًا (الحد {n} ميغابايت).', ouvrirFichier: 'فتح الملف', connecterPourEnvoyer: 'سجّل الدخول لإرسال ملف.', reprendre: 'إعادة الالتقاط', valider: 'تأكيد', verifierPrise: 'تحقق منها: أعد الالتقاط أو أكّد للاحتفاظ بها.', reglages: 'الإعدادات', theme: 'المظهر', clair: 'فاتح', sombre: 'داكن', espace: 'مساحة {r}', menu: 'القائمة', gestion: 'الإدارة', voirTout: 'عرض الكل', ceMois: 'هذا الشهر', vsMois: 'مقارنة بالشهر السابق', apercu: 'معاينة · بيانات تجريبية',
  },
}

export function texteSysteme(langue: string, cle: CleSysteme): string {
  return (TEXTES_SYSTEME[langue] ?? TEXTES_SYSTEME.en!)[cle]
}
