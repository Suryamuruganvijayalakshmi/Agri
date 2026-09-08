import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

// Helper to set Google Translate cookies
function setGoogleTranslateCookie(targetLang) {
  try {
    const domain = window.location.hostname;
    if (!targetLang || targetLang === 'en') {
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      document.cookie = 'googtrans=/en/en; path=/;';
      document.cookie = `googtrans=/en/en; path=/; domain=${domain};`;
    } else {
      const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
      document.cookie = `googtrans=/en/${targetLang}; path=/; expires=${expires};`;
      document.cookie = `googtrans=/en/${targetLang}; path=/; domain=${domain}; expires=${expires};`;
    }
  } catch (e) {
    console.warn('[AGRIFlow i18n] Cookie update failed:', e);
  }
}

// Helper to trigger Google Translate's hidden select combo
function triggerGoogleTranslateElement(targetLang) {
  try {
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      const val = targetLang === 'en' ? '' : targetLang;
      if (combo.value !== val) {
        combo.value = val;
        combo.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }
  } catch (e) {
    console.warn('[AGRIFlow i18n] Combo trigger failed:', e);
  }
  return false;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('agriflow_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((newLang) => {
    if (!translations[newLang]) newLang = 'en';
    setLangState(newLang);

    try {
      localStorage.setItem('agriflow_lang', newLang);
      document.documentElement.lang = newLang;

      // 1. Set Google Translate cookie
      setGoogleTranslateCookie(newLang);

      // 2. Trigger Google Translate dropdown
      const triggered = triggerGoogleTranslateElement(newLang);

      // If Google Translate is still initializing, retry smoothly
      if (!triggered) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (triggerGoogleTranslateElement(newLang) || attempts > 15) {
            clearInterval(interval);
          }
        }, 300);
      }
    } catch (e) {
      console.warn('Failed to set language:', e);
    }
  }, []);

  // Sync Google Translate with current language on mount & updates
  useEffect(() => {
    document.documentElement.lang = lang;
    setGoogleTranslateCookie(lang);

    if (lang !== 'en') {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (triggerGoogleTranslateElement(lang) || attempts > 15) {
          clearInterval(interval);
        }
      }, 350);
      return () => clearInterval(interval);
    } else {
      triggerGoogleTranslateElement('en');
    }
  }, [lang]);

  // Robust translation accessor with automatic fallback to English
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
