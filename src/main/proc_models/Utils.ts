import * as path from 'path'
import * as fs from 'fs'
import logger from './Logger'

// 定义解析文件名后的返回类型
interface ParsedFilename {
  sequence: string
  startTime: string
  endTime: string
}

// 解析文件名，提取序号、开始时间和结束时间
const parse_filename_mi = (title: string | null): ParsedFilename | null => {
  if (title === null) {
    return null
  }
  const [sequence, startTime, endTimeWithExtension] = title.split('_')
  if (endTimeWithExtension === undefined) {
    logger.log(`parse_filename_mi err: ${title}`)
    return null
  }
  const endTime = endTimeWithExtension.replace('.mp4', '')
  return {
    sequence,
    startTime,
    endTime
  }
}

// 将时间字符串转换为秒数
const parse_timestr_2_seconds = (timeStr: string): number => {
  const year = parseInt(timeStr.slice(0, 4), 10)
  const month = parseInt(timeStr.slice(4, 6), 10) - 1 // 月份从0开始
  const day = parseInt(timeStr.slice(6, 8), 10)
  const hour = parseInt(timeStr.slice(8, 10), 10)
  const minute = parseInt(timeStr.slice(10, 12), 10)
  const second = parseInt(timeStr.slice(12, 14), 10)
  return new Date(year, month, day, hour, minute, second).getTime() / 1000
}

// 将秒数转换为时间字符串
function parse_seconds_2_timestr(seconds: number): string {
  const date = new Date(seconds * 1000) // 将秒转换为毫秒
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const secs = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}${hours}${minutes}${secs}`
}

// 工具类，包含解析文件名、时间字符串和秒数的方法
class Util {
  parse_filename_mi = parse_filename_mi
  parse_timestr_2_seconds = parse_timestr_2_seconds
  parse_seconds_2_timestr = parse_seconds_2_timestr
}

// 定义遍历文件夹返回结果的类型
interface TraversalResult {
  code: number
  status: string | Error
  data: {
    folder: string
    files: {
      title: string
      src: string
      size: number
      birthtime: string
      mtime: string
    }[]
  }
}

// 遍历文件夹类
class TraversalFolder {
  type: string | null = null // search时才遍历子文件夹
  folder: string | null = null

  // 递归遍历文件夹
  async traversal_folder(): Promise<TraversalResult> {
    const folderPath = this.folder
    if (!folderPath) {
      return { code: 1, status: 'folder is null', data: { folder: '', files: [] } }
    }
    try {
      const fileInfo: {
        title: string
        src: string
        size: number
        birthtime: string
        mtime: string
      }[] = []
      const traverseRecursive = async (currentPath: string) => {
        const currentFiles = await fs.promises.readdir(currentPath)
        for (const file of currentFiles) {
          const filePath = path.join(currentPath, file)
          const stats = await fs.promises.stat(filePath)
          if (stats.isDirectory()) {
            // 判断目录的名称，如果目录的名称是trash，则跳过
            if (file === '.trash') {
              logger.log(`traversal skip: ${filePath}`)
              continue
            }
            await traverseRecursive(filePath)
          } else {
            fileInfo.push({
              title: file,
              src: filePath,
              size: stats.size,
              birthtime: `${stats.birthtime}`,
              mtime: `${stats.mtime}`
            })
          }
        }
      }
      await traverseRecursive(folderPath)
      return { code: 0, status: 'success', data: { folder: folderPath, files: fileInfo } }
    } catch (error) {
      console.error('遍历文件夹时出错:', error)
      return { code: 1, status: error, data: { folder: '', files: [] } }
    }
  }

  // 启动文件夹遍历
  async start(): Promise<TraversalResult> {
    if (this.folder === null) {
      return { code: 1, status: 'folder is null', data: { folder: '', files: [] } }
    }
    return this.traversal_folder()
  }
}

// 定义工作队列请求类型
interface WorkQueueRequest {
  cmd: string
  // 可以根据实际情况添加更多属性
}

// 定义工作队列响应类型
interface WorkQueueResponse {
  cmd: string
  data: any
}

// 工作队列类
class WorkQueue {
  processing = false
  curReq: WorkQueueRequest | null = null
  resps: WorkQueueResponse[] = []

  // 判断队列是否忙碌
  isBusy = (): boolean => {
    return this.curReq !== null
  }

  // 生成忙碌响应
  makeBusyResponse = (): { code: number; status: string } => {
    return { code: 1, status: 'busy' }
  }

  // 添加任务到队列
  addTask(req: WorkQueueRequest): void {
    this.curReq = req
  }

  // 添加响应到队列
  async addResp(resp: WorkQueueResponse): Promise<void> {
    if (this.curReq !== null) {
      if (resp.cmd !== this.curReq.cmd) {
        logger.warn('resp cmd not equal to req cmd', resp.cmd, this.curReq.cmd)
      }
    }
    while (this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    this.processing = true
    this.resps.push(resp)
    this.processing = false
  }
}

const workQueue = new WorkQueue()
const util = new Util()

export { util, workQueue }
export { TraversalFolder }
