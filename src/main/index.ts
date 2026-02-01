import { app, shell, BrowserWindow, ipcMain, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { IpcHandlers } from './proc_models/IpcHandlers'
import appProc from './proc_models/AppProc'
import recordsProc from './proc_models/RecordsProcess'
import { open, Database } from 'sqlite'
import sqlite3 from 'sqlite3'
import * as fs from 'fs/promises'
import * as path from 'path'

const handlers = new IpcHandlers()

function createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        autoHideMenuBar: false, // hidden menu bar
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            // 允许加载本地资源
            webSecurity: false
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    if (is.dev) {
        mainWindow.webContents.openDevTools()
    }
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    mainWindow.setMenu(null) // hide menu bar

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
        handlers.mainWindow = mainWindow
    }
}

// Register custom protocol to handle database thumbnail requests
function registerCustomProtocol(): void {
    protocol.registerBufferProtocol('db_thumb', async (request, callback) => {
        try {
            // 解析URL，提取数据库路径和时间戳
            const url = request.url
            // URL格式: db_thumb://encoded_db_path#timestamp
            const urlWithoutProtocol = url.replace('db_thumb://', '')
            const hashIndex = urlWithoutProtocol.lastIndexOf('#')

            if (hashIndex === -1) {
                callback({ statusCode: 400, data: Buffer.from('Invalid URL format') })
                return
            }

            const encodedDbPath = urlWithoutProtocol.substring(0, hashIndex)
            const timestamp = urlWithoutProtocol.substring(hashIndex + 1)
            const dbPath = decodeURIComponent(encodedDbPath)

            // 从数据库获取缩略图数据
            const thumbDb = await open({
                filename: dbPath,
                driver: sqlite3.Database
            })

            const row: any = await thumbDb.get(
                'SELECT thumbnail_data FROM thumbnails WHERE timestamp = ?',
                [timestamp]
            )

            await thumbDb.close()

            if (!row) {
                callback({ statusCode: 404, data: Buffer.from('Thumbnail not found') })
                return
            }

            // 返回缩略图数据
            callback({
                mimeType: 'image/jpeg',
                data: row.thumbnail_data as Buffer
            })
        } catch (error) {
            console.error('Error in db_thumb protocol handler:', error)
            callback({ statusCode: 500, data: Buffer.from('Internal server error') })
        }
    })
}

// app.disableHardwareAcceleration()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
    await appProc.initApp()

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Register the custom protocol
    registerCustomProtocol()

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))
    ipcMain.handle('render_event', handlers.handle_event)

    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('before-quit', async (event) => {
    console.log(event)
    console.log('app exit')
    // event.preventDefault()
    await appProc.quiteApp()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
