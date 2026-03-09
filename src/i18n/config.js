import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import csTranslation from './locales/cs.json';

const resources = {
  en: { translation: enTranslation },
  cs: { translation: csTranslation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'cs',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
