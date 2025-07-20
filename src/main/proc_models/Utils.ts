// import * as path from 'path'
// import * as fs from 'fs'
import logger from './Logger'
import * as DataTypes from '../../bridge/dataTypedef'
import appCfg from './AppCfg'

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
        return resp.err(`busy cur cmd is ${this.curReq?.cmd}`)
    }

    // 添加任务到队列
    addTask(req: WorkQueueRequest | null): void {
        if (req !== null) {
            if (appCfg.bPrtWorkQueue) {
                logger.info('add task to queue', req?.cmd)
            }
        } else {
            if (this.curReq != null) {
                if (appCfg.bPrtWorkQueue) {
                    logger.info('clean task in queue', this.curReq?.cmd)
                }
            }
        }
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
}

export { workQueue }
export { Util }
export type { WorkResp }
