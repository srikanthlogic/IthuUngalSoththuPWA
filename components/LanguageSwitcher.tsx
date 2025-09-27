import React from 'react';
import { useTranslation } from '../context/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  const switchLanguage = (lang: 'en' | 'ta') => {
    setLanguage(lang);
  };

  return (
    <div className="flex bg-red-800 rounded-lg p-1 text-sm">
      <button
        onClick={() => switchLanguage('en')}
        className={`px-3 py-1 rounded-md transition-colors ${language === 'en' ? 'bg-white text-red-700 font-semibold' : 'text-white'}`}
        aria-pressed={language === 'en'}
      >
        English
      </button>
      <button
        onClick={() => {
          console.log('Tamil button clicked');
          switchLanguage('ta');
        }}
        className={`px-3 py-1 rounded-md transition-colors ${language === 'ta' ? 'bg-white text-red-700 font-semibold' : 'text-white'}`}
        aria-pressed={language === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  );
};

export default LanguageSwitcher;
