import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
    interface Window {
        electron: ElectronAPI
        api: unknown
        electronAPI: {
            onSystemNotify: (callback: (data: string) => void) => void
            onTaskNotify: (callback: (data: string) => void) => void
            getPathForFile: (file: File) => string
        }
    }
}
