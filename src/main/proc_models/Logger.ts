class Logger {
  // 获取调用栈信息中的文件名和行号
  // getCallerInfo() {
  //   const error = new Error();
  //   const stackLines = error.stack?.split('\n');
  //   // 通常第 3 行是调用日志方法的位置
  //   const callerLine = stackLines?.[3]?.trim();
  //   const match = callerLine?.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
  //   if (match) {
  //     const [, , filePath, lineNumber] = match;
  //     const fileName = filePath.split(path.sep).pop();
  //     return `${fileName}:${lineNumber}`;
  //   }
  //   return 'unknown';
  // }

  // 生成格式化时间戳
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

  // 封装 console.log 方法
  log(...args: unknown[]): void {
    const timestamp = this.getTimestamp()
    // const callerInfo = this.getCallerInfo();
    // console.log(`[${timestamp}] [${callerInfo}]`, ...args);
    console.log(`[${timestamp}]`, ...args)
  }

  // 封装 console.info 方法
  info(...args: unknown[]): void {
    const timestamp = this.getTimestamp()
    console.info(`[${timestamp}]`, ...args)
  }

  // 封装 console.warn 方法
  warn(...args: unknown[]): void {
    const timestamp = this.getTimestamp()
    console.warn(`[${timestamp}]`, ...args)
  }

  // 封装 console.error 方法
  error(...args: unknown[]): void {
    const timestamp = this.getTimestamp()
    console.error(`[${timestamp}]`, ...args)
  }
}

const logger: Logger = new Logger()
export default logger
