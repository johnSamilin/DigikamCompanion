import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as en from './en';
import * as fr from './fr';

const ns = Object.keys(en);
export const defaultNS = ns[0];
void i18n.use(initReactI18next).init({
	ns,
	defaultNS,
	resources: {
		en,
		fr,
	},
	lng: 'en',
	fallbackLng: 'en',
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	compatibilityJSON: 'v3',
});
export default i18n;
