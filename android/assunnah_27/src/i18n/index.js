import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import bn from './translations/bn.json';
import en from './translations/en.json';
import ar from './translations/ar.json';

const resources = {
  bn: { translation: bn },
  en: { translation: en },
  ar: { translation: ar },
};

// ডিভাইসের ডিফল্ট ভাষা থেকে ল্যাঙ্গুয়েজ ডিটেক্ট করবে (ডিফল্ট বাংলা থাকবে)
const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'bn';

i18n.use(initReactI18next).init({
  resources,
  lng: resources[deviceLanguage] ? deviceLanguage : 'bn',
  fallbackLng: 'bn',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;