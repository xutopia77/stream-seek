import * as path from 'path'
import * as DataTypes from '../../bridge/dataTypedef'
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
    static thumbFileDbPathGet(
        repo: DataTypes.DataRepo,
        filename: string,
        type: DataTypes.ThumbType
    ): string {
        if (type == DataTypes.ThumbType.Frame) {
            return path.join(repo.framePath, `${filename}.db`)
        }
        return path.join(repo.thumbnailPath, `${filename}_thumbnail.db`)
    }

    static thumbTrashFileDbPathGet(
        repo: DataTypes.DataRepo,
        filename: string,
        type: DataTypes.ThumbType
    ): string {
        if (type == DataTypes.ThumbType.Frame) {
            return path.join(repo.framePath, '.trash', `${filename}.db`)
        }
        return path.join(repo.thumbnailPath, '.trash', `${filename}_thumbnail.db`)
    }

    static thumbTrashPathMake(thumbPath: string): string {
        return path.join(thumbPath, '.trash')
    }

    static thumbPathGet(repo: DataTypes.DataRepo, type: DataTypes.ThumbType): string {
        if (type == DataTypes.ThumbType.Frame) {
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
}

export { Util }
