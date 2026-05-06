import { createI18n } from 'vue-i18n'
import zhCN from '../locales/zh-CN.json'
import enUS from '../locales/en-US.json'

// Type definition
export type MessageSchema = typeof zhCN

// Get browser language (not used, always default to English)
function getBrowserLocale(): string {
    // Always default to English
    return 'en-US'
}

// Get stored locale or default
function getStoredLocale(): string {
    const stored = localStorage.getItem('locale')
    console.log('[i18n] Stored locale:', stored)
    if (stored) {
        return stored
    }
    return getBrowserLocale()
}

// Create i18n instance
const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en-US'>({
    legacy: false,
    locale: getStoredLocale(),
    fallbackLocale: 'en-US',
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS
    }
})

console.log('[i18n] Initialized with locale:', i18n.mode === 'legacy' ? i18n.global.locale : i18n.global.locale.value)

export default i18n
