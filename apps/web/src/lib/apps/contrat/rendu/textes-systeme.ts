/**
 * V3 — LES TEXTES DU MOTEUR LUI-MÊME (états, garde, barre), écrits par Deribfy
 * et traduits par Deribfy. Une langue lue sans entrée ici retombe sur l'anglais.
 */
export type CleSysteme =
  | 'chargement' | 'erreur' | 'reessayer' | 'vide' | 'partiel' | 'quiEtesVous' | 'entrerComme' | 'accueil' | 'compte'
  | 'actualise' | 'transmis' | 'partage' | 'connecte' | 'deconnecte' | 'enregistre' | 'navigation' | 'langue'

export const TEXTES_SYSTEME: Readonly<Record<string, Readonly<Record<CleSysteme, string>>>> = {
  fr: {
    chargement: 'Chargement…', erreur: 'Ces informations n’ont pas pu être chargées.', reessayer: 'Réessayer', vide: 'Rien à afficher pour l’instant.',
    partiel: 'Une partie des informations n’est pas encore arrivée.', quiEtesVous: 'Qui êtes-vous ?', entrerComme: 'Entrer comme', accueil: 'Accueil',
    compte: 'Compte', actualise: 'Informations actualisées.', transmis: 'Votre demande est transmise.', partage: 'Lien prêt à partager.',
    connecte: 'Vous êtes connecté.', deconnecte: 'Vous êtes déconnecté.', enregistre: 'Enregistré.', navigation: 'Navigation', langue: 'Langue',
  },
  en: {
    chargement: 'Loading…', erreur: 'This information could not be loaded.', reessayer: 'Try again', vide: 'Nothing to show yet.',
    partiel: 'Some information has not arrived yet.', quiEtesVous: 'Who are you?', entrerComme: 'Enter as', accueil: 'Home',
    compte: 'Account', actualise: 'Information refreshed.', transmis: 'Your request has been sent.', partage: 'Link ready to share.',
    connecte: 'You are signed in.', deconnecte: 'You are signed out.', enregistre: 'Saved.', navigation: 'Navigation', langue: 'Language',
  },
  ar: {
    chargement: 'جارٍ التحميل…', erreur: 'تعذّر تحميل هذه المعلومات.', reessayer: 'إعادة المحاولة', vide: 'لا يوجد ما يُعرض حاليًا.',
    partiel: 'لم يصل جزء من المعلومات بعد.', quiEtesVous: 'من أنت؟', entrerComme: 'الدخول بصفة', accueil: 'الرئيسية',
    compte: 'الحساب', actualise: 'تم تحديث المعلومات.', transmis: 'تم إرسال طلبك.', partage: 'الرابط جاهز للمشاركة.',
    connecte: 'تم تسجيل دخولك.', deconnecte: 'تم تسجيل خروجك.', enregistre: 'تم الحفظ.', navigation: 'التنقل', langue: 'اللغة',
  },
}

export function texteSysteme(langue: string, cle: CleSysteme): string {
  return (TEXTES_SYSTEME[langue] ?? TEXTES_SYSTEME.en!)[cle]
}
