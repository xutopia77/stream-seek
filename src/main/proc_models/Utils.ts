import * as path from 'path'

class Util {
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
}

export { Util }
