/// <reference types="vite/client" />

// Internationalization type definition
declare module '@intlify/core-base' {
    // Used for type inference
    interface VueI18n {
        t(key: string, ...args: unknown[]): string
    }
}
