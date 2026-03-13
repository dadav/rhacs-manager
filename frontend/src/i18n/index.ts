import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import de from './de.json'

const savedLang = localStorage.getItem('app-language')
const browserLang = navigator.language.startsWith('de') ? 'de' : 'en'
const defaultLang = savedLang || browserLang

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('app-language', lng)
})

export default i18n
