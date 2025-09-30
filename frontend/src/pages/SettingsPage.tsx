import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleLanguageChange = (lang: 'en' | 'ne') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>{t('nav.settings')}</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>{t('nav.language')}</h2>
        <button
          onClick={() => handleLanguageChange('en')}
          style={{
            marginRight: '10px',
            padding: '10px 20px',
            background: i18n.language === 'en' ? '#007bff' : '#f0f0f0',
            color: i18n.language === 'en' ? 'white' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {t('nav.english')}
        </button>
        <button
          onClick={() => handleLanguageChange('ne')}
          style={{
            padding: '10px 20px',
            background: i18n.language === 'ne' ? '#007bff' : '#f0f0f0',
            color: i18n.language === 'ne' ? 'white' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {t('nav.nepali')}
        </button>
      </div>

      <div>
        <h2>{t('nav.mode')}</h2>
        <button
          onClick={toggleTheme}
          style={{
            padding: '10px 20px',
            background: theme === 'dark' ? '#333' : '#f0f0f0',
            color: theme === 'dark' ? 'white' : 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
