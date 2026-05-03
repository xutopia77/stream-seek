import * as path from 'path'
import * as Dty from '../../bridge/dataTypedef'
import appCfg from './AppCfg'

let mainWindow: Electron.BrowserWindow | null = null

class Util {
    static defaultVersionGet(): string {
        return '2.2.0'
    }

    static getCurTime(): string {
        // 获取当前的时间的字符串，精确到秒，格式为：YYYY-MM-DD hh:mm:ss
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hour = String(now.getHours()).padStart(2, '0')
        const minute = String(now.getMinutes()).padStart(2, '0')
        const second = String(now.getSeconds()).padStart(2, '0')
        const timeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`
        return timeStr
    }
    static pathToLinuxStyle(inputPath: string): string {
        const normalizedPath = path.normalize(inputPath)
        return normalizedPath.replace(/\\/g, '/')
    }
    static thumbDbPathGet(filename: string, type: Dty.ThumbType): string {
        const repo = appCfg.prj.dataRepo[0]
        if (type == Dty.ThumbType.Frame) {
            return path.join(repo.framePath, `${filename}.db`)
        }
        if (type == Dty.ThumbType.FnameThumb) {
            return `${filename}_thumbnail.db`
        }
        return path.join(repo.thumbnailPath, `${filename}_thumbnail.db`)
    }

    static thumbTrashDbPathGet(filename: string, type: Dty.ThumbType): string {
        const repo = appCfg.prj.dataRepo[0]
        if (type == Dty.ThumbType.Frame) {
            return path.join(repo.framePath, '.trash', `${filename}.db`)
        }
        return path.join(repo.thumbnailPath, '.trash', `${filename}_thumbnail.db`)
    }

    static thumbTrashPathGet(thumbPath: string): string {
        return path.join(thumbPath, '.trash')
    }

    static thumbPathGet(type: Dty.ThumbType): string {
        const repo = appCfg.prj.dataRepo[0]
        if (type == Dty.ThumbType.Frame) {
            return repo.framePath
        }
        return repo.thumbnailPath
    }

    static thumbDbCreateSqlGet(): string {
        return `
                CREATE TABLE IF NOT EXISTS files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    raw BLOB,
                    type INTEGER NOT NULL,
                    desc TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `
    }
    static thumbDbCreateSqlInfoGet(): string {
        return `
                CREATE TABLE IF NOT EXISTS infos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type INTEGER NOT NULL,
                    content TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `
    }

    static notifyRender(msg: string): void {
        if (!mainWindow) {
            console.log('main window err', mainWindow)
            return
        }
        mainWindow.webContents.send('msg-notify', msg)
    }

    static sendTaskNotify<T>(notify: Dty.TaskNotify<T>): void {
        if (!mainWindow) {
            console.log('main window err', mainWindow)
            return
        }
        mainWindow.webContents.send('task-notify', JSON.stringify(notify))
    }

    static mainWinSet(mainWin: Electron.BrowserWindow | null): void {
        mainWindow = mainWin
    }
}

export { Util }
