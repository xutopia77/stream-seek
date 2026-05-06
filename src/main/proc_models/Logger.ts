import * as fs from 'fs'
import * as path from 'path'
class Logger {
    log_dir: string = ''
    make_log_file_path = (): string => {
        return path.join(this.log_dir, `app.log`)
    }
    // Get caller info from call stack
    // getCallerInfo() {
    //   const error = new Error();
    //   const stackLines = error.stack?.split('\n');
    //   // Usually line 3 is where the log method was called
    //   const callerLine = stackLines?.[3]?.trim();
    //   const match = callerLine?.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
    //   if (match) {
    //     const [, , filePath, lineNumber] = match;
    //     const fileName = filePath.split(path.sep).pop();
    //     return `${fileName}:${lineNumber}`;
    //   }
    //   return 'unknown';
    // }

    // Generate formatted timestamp
    getTimestamp(): string {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hour = String(now.getHours()).padStart(2, '0')
        const minute = String(now.getMinutes()).padStart(2, '0')
        const second = String(now.getSeconds()).padStart(2, '0')
        const millisecond = String(now.getMilliseconds()).padStart(3, '0')
        return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`
    }

    // Wrap console.log method
    log(...args: unknown[]): string {
        const timestamp = this.getTimestamp()
        // const callerInfo = this.getCallerInfo();
        // console.log(`[${timestamp}] [${callerInfo}]`, ...args);
        console.log(`[L][${timestamp}]`, ...args)
        const logMessage = `[L][${timestamp}] ${args.join(' ')}\n`
        fs.appendFileSync(this.make_log_file_path(), logMessage)
        return `${args.join(' ')}`
    }

    // Wrap console.info method
    info(...args: unknown[]): string {
        const timestamp = this.getTimestamp()
        console.info(`[I][${timestamp}]`, ...args)
        const logMessage = `[I][${timestamp}] ${args.join(' ')}\n`
        fs.appendFileSync(this.make_log_file_path(), logMessage)
        return `${args.join(' ')}`
    }

    // Wrap console.warn method
    warn(...args: unknown[]): string {
        const timestamp = this.getTimestamp()
        console.warn(`[W][${timestamp}]`, ...args)
        const logMessage = `[W][${timestamp}] ${args.join(' ')}\n`
        fs.appendFileSync(this.make_log_file_path(), logMessage)
        return `${args.join(' ')}`
    }

    // Wrap console.error method
    error(...args: unknown[]): string {
        const timestamp = this.getTimestamp()
        console.error(`[E][${timestamp}]`, ...args)
        const logMessage = `[E][${timestamp}] ${args.join(' ')}\n`
        fs.appendFileSync(this.make_log_file_path(), logMessage)
        return `${args.join(' ')}`
    }
    debug(...args: unknown[]): string {
        const timestamp = this.getTimestamp()
        console.debug(`[D][${timestamp}]`, ...args)
        const logMessage = `[D][${timestamp}] ${args.join(' ')}\n`
        fs.appendFileSync(this.make_log_file_path(), logMessage)
        return `${args.join(' ')}`
    }
}

const logger: Logger = new Logger()
export default logger
