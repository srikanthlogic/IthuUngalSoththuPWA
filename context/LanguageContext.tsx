import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define an initial state for translations to avoid errors on first render
const initialTranslations: Record<Language, Record<string, string>> = {
    en: {},
    ta: {}
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Get language from localStorage or default to 'en'
    return (localStorage.getItem('language') as Language) || 'en';
  });

  const [translations, setTranslations] = useState(initialTranslations);

  useEffect(() => {
    // Asynchronously fetch translation files
    const fetchTranslations = async () => {
        try {
            const [enResponse, taResponse] = await Promise.all([
                fetch('/en.json'),
                fetch('/ta.json')
            ]);

            if (!enResponse.ok || !taResponse.ok) {
                throw new Error(`HTTP error! status: ${enResponse.status}, ${taResponse.status}`);
            }
            
            const enData = await enResponse.json();
            const taData = await taResponse.json();
            
            setTranslations({ en: enData, ta: taData });
        } catch (error) {
            console.error("Failed to load translation files:", error);
            // App will continue to function with translation keys as fallback
        }
    };
    
    fetchTranslations();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Persist language choice to localStorage
    localStorage.setItem('language', language);
  }, [language]);
  
  const t = (key: string, options?: { [key: string]: string | number }): string => {
    // Get the translation string from the current language's dictionary, falling back to the key
    let translation = (translations[language] && translations[language][key]) || key;
    
    // Replace placeholders like {{variable}}
    if (options && translation !== key) {
        Object.keys(options).forEach(optionKey => {
            const regex = new RegExp(`{{${optionKey}}}`, 'g');
            translation = translation.replace(regex, String(options[optionKey]));
        });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
