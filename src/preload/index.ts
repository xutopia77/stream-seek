import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
}

contextBridge.exposeInMainWorld('electronAPI', {
    onSystemNotify: (callback: (data: unknown) => void) => {
        ipcRenderer.on('msg-notify', (_event, data) => callback(data))
    },
    onTaskNotify: (callback: (data: unknown) => void) => {
        ipcRenderer.on('task-notify', (_event, data) => callback(data))
    },
    getPathForFile: (file: File): string => {
        return webUtils.getPathForFile(file)
    }
})
