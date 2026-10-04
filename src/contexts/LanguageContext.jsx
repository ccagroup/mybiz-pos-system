import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/db';

const LanguageContext = createContext();

// Translation Dictionary
const translations = {
  en: { home: 'Home', sales: 'Sales', stock: 'Stock', customer: 'Customer', reports: 'Reports', analytics: 'Analytics', debts: 'Debts' },
  sw: { home: 'Nyumbani', sales: 'Mauzo', stock: 'Hifadhi', customer: 'Mteja', reports: 'Ripoti', analytics: 'Uchambuzi', debts: 'Madeni' },
  ki: { home: 'Kwa Nyumba', sales: 'Mauzo', stock: 'Gĩtũũmba', customer: 'Mũndũ', reports: 'Rĩpoti', analytics: 'Wĩra', debts: 'Madeni' }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const loadLang = async () => {
      const l = await db.settings.get('language');
      if (l) setLanguage(l.value);
    };
    loadLang();
  }, []);

  const changeLanguage = async (lang) => {
    await db.settings.put({ key: 'language', value: lang });
    setLanguage(lang);
  };

  // Helper function to get translated text
  const t = (key) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);