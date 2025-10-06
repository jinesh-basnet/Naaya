import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleLanguageChange = (lang: 'en' | 'ne') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div className="settings-container">
      <h1>{t('nav.settings')}</h1>

      <div className="language-section">
        <h2>{t('nav.language')}</h2>
        <button
          onClick={() => handleLanguageChange('en')}
          className={`language-button ${i18n.language === 'en' ? 'active' : ''}`}
        >
          {t('nav.english')}
        </button>
        <button
          onClick={() => handleLanguageChange('ne')}
          className={`language-button ${i18n.language === 'ne' ? 'active' : ''}`}
        >
          {t('nav.nepali')}
        </button>
      </div>

      <div>
        <h2>{t('nav.mode')}</h2>
        <button
          onClick={toggleTheme}
          className={`mode-button ${theme}`}
        >
          {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
