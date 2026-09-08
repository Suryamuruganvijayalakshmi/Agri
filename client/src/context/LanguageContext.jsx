import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('agriflow_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (newLang) => {
    if (!translations[newLang]) newLang = 'en';
    setLangState(newLang);
    try {
      localStorage.setItem('agriflow_lang', newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Create robust translation accessor with automatic fallback to English
  const currentTranslations = translations[lang] || translations.en;
  const englishFallback = translations.en;

  const t = new Proxy(currentTranslations, {
    get(target, prop) {
      if (prop in target && target[prop]) {
        return target[prop];
      }
      return englishFallback[prop] || String(prop);
    }
  });

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, supportedLanguages: Object.keys(translations) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    const fallbackT = translations.en;
    return {
      lang: 'en',
      setLang: () => {},
      t: fallbackT,
      supportedLanguages: ['en', 'hi', 'kn', 'ta', 'te']
    };
  }
  return context;
}
