import { createI18n } from 'vue-i18n'
import zhCN from '../locales/zh-CN.json'
import enUS from '../locales/en-US.json'

// 类型定义
export type MessageSchema = typeof zhCN

// 获取浏览器语言
function getBrowserLocale(): string {
    const locale = navigator.language || 'zh-CN'
    // 只取语言代码部分，例如将 'zh-CN' 转为 'zh'
    const lang = locale.split('-')[0].toLowerCase()

    // 检查支持的语言
    if (lang === 'en') {
        return 'en-US'
    }
    // 默认返回中文
    return 'zh-CN'
}

// 创建 i18n 实例
const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en-US'>({
    legacy: false, // 使用 Composition API 模式
    locale: localStorage.getItem('locale') || getBrowserLocale(), // 优先使用本地存储的语言设置
    fallbackLocale: 'zh-CN', // 回退语言
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS
    }
})

export default i18n
