'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fr, type TranslationKey } from './fr';
import { en } from './en';
import { ar } from './ar';
import { es } from './es';

export type Lang = 'fr' | 'en' | 'ar' | 'es';

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { fr, en, ar, es };

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children, langueImposee }: {
  children: ReactNode
  /**
   * LOT 18 — LA LANGUE D'UN SITE GÉNÉRÉ, IMPOSÉE.
   *
   * MESURÉ le 2026-11-10 : avec un navigateur réglé en anglais, le site
   * FRANÇAIS de la CPA réécrivait `<html lang="fr">` en `lang="en"` après
   * le chargement, et son bandeau de témoins s'affichait en anglais. Ce
   * fournisseur choisissait la langue du VISITEUR — juste pour la
   * plateforme, faux pour un site, qui n'a qu'UNE langue : la sienne.
   * Quand elle est imposée, ni le navigateur ni le stockage ne la changent.
   */
  langueImposee?: Lang | null
}) {
  const [lang, setLangState] = useState<Lang>(langueImposee ?? 'fr');

  // EXCEPTION NOMMEE, AU SITE EXACT. Ni `localStorage` ni `navigator.language`
  // n'existent sur le serveur : la langue du visiteur ne PEUT pas etre connue
  // au premier rendu.
  //
  // CE QUE L'EXCEPTION NE REGLE PAS : la page s'affiche en francais une
  // image, puis bascule. C'est visible, et c'est le defaut que le drapeau
  // signalait. Aucun hook ne le corrige — le serveur ne sait pas. Le remede
  // est un COOKIE de langue, lu avant le rendu ; il n'est pas fait.
  useEffect(() => {
    if (langueImposee) return;
    const stored = localStorage.getItem('nexiora-lang') as Lang | null;
    if (stored === 'fr' || stored === 'en' || stored === 'ar' || stored === 'es') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(stored);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('fr')) setLangState('fr');
      else if (browserLang.startsWith('es')) setLangState('es');
      else if (browserLang.startsWith('ar')) setLangState('ar');
      else setLangState('en');
    }
  }, [langueImposee]);

  useEffect(() => {
    // Un site généré a reçu `lang` et `dir` DU SERVEUR, pour SA langue — qui
    // peut n'être aucune des quatre de l'interface. On n'y touche pas.
    if (langueImposee) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang, langueImposee]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('nexiora-lang', newLang);
  };

  const t = (key: TranslationKey): string => {
    return dictionaries[lang][key] || dictionaries.fr[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return ctx;
}
