const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

// Initialize i18next
i18next
  .use(Backend)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
    },
    
    interpolation: {
      escapeValue: false 
    },
    
    // Namespaces for different parts of the app
    ns: ['common', 'auth', 'posts', 'stories', 'reels', 'messages', 'notifications', 'admin', 'passwordReset', 'errors'],
    defaultNS: 'common',
    
    // Language detection
    detection: {
      order: ['header', 'query', 'cookie'],
      caches: ['cookie']
    }
  });

module.exports = i18next;
