import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import en from './en';
import ru from './ru';

const resources = {
  en,
  ru,
};

const fallback = { languageTag: 'en' };
const { languageTag } =
  RNLocalize.findBestLanguageTag(Object.keys(resources)) || fallback;

i18n.use(initReactI18next).init({
  resources,
  lng: languageTag,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;