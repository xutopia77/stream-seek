import * as path from 'path'
import * as fs from 'fs'
import logger from './Logger'
import * as DataTypes from '../../bridge/dataTypedef'

// 遍历文件夹类
class TraversalFolder {
  type: string | null = null // search时才遍历子文件夹
  folder: string | null = null

  // 递归遍历文件夹
  async traversal_folder(): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
    const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
    const folderPath = this.folder
    if (!folderPath) {
      return resp.err('folder is null')
    }
    try {
      const fileInfo: DataTypes.FileInfo[] = []
      const traverseRecursive = async (currentPath: string): Promise<void> => {
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
              filePath: filePath,
              src: '',
              size: stats.size,
              birthtime: `${stats.birthtime}`,
              mtime: `${stats.mtime}`
            })
          }
        }
      }
      await traverseRecursive(folderPath)
      resp.success('success').data = { folder: folderPath, files: fileInfo }
      return resp
    } catch (error) {
      console.error('traversal folder err:', error)
      return resp.err(`traversal folder err: ${error}`)
    }
  }

  // 启动文件夹遍历
  async start(): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
    if (this.folder === null) {
      return new DataTypes.Resp<DataTypes.TraversalFolder>().err('folder is null')
    }
    return this.traversal_folder()
  }
}

// 定义工作队列请求类型
interface WorkQueueRequest {
  cmd: string
  // 可以根据实际情况添加更多属性
}

// 工作队列类
class WorkQueue {
  processing = false
  curReq: WorkQueueRequest | null = null
  resps: DataTypes.WorkResp[] = []

  // 判断队列是否忙碌
  isBusy = (): boolean => {
    return this.curReq !== null
  }

  // 生成忙碌响应
  makeBusyResponse = (): DataTypes.Resp => {
    const resp = new DataTypes.Resp()
    return resp.err('busy')
  }

  // 添加任务到队列
  addTask(req: WorkQueueRequest | null): void {
    this.curReq = req
  }

  // 添加响应到队列
  async addResp(resp: DataTypes.WorkResp): Promise<void> {
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

interface WorkResp<T> {
  cmd: string
  data: T
}

export { workQueue }
export { TraversalFolder }
export type { WorkResp }
