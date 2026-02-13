/// <reference types="vite/client" />

// 国际化类型定义
declare module '@intlify/core-base' {
    // 用于类型推断
    interface VueI18n {
        t(key: string, ...args: unknown[]): string
    }
}
