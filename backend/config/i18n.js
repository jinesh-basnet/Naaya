const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,

    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
    },

    interpolation: {
      escapeValue: false
    },

    ns: ['common', 'auth', 'posts', 'stories', 'reels', 'messages', 'notifications', 'admin', 'passwordReset', 'errors'],
    defaultNS: 'common',

    detection: {
      order: ['header', 'query', 'cookie'],
      caches: ['cookie']
    }
  });

module.exports = i18next;
