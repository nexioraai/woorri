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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  // EXCEPTION NOMMEE, AU SITE EXACT. Ni `localStorage` ni `navigator.language`
  // n'existent sur le serveur : la langue du visiteur ne PEUT pas etre connue
  // au premier rendu.
  //
  // CE QUE L'EXCEPTION NE REGLE PAS : la page s'affiche en francais une
  // image, puis bascule. C'est visible, et c'est le defaut que le drapeau
  // signalait. Aucun hook ne le corrige — le serveur ne sait pas. Le remede
  // est un COOKIE de langue, lu avant le rendu ; il n'est pas fait.
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

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
