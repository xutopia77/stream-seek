// import * as path from 'path'
// import * as fs from 'fs'
import logger from './Logger'
import * as Dty from '../../bridge/dataTypedef'
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
    resps: Dty.WorkResp[] = []
    status: string = ''

    // 判断队列是否忙碌
    isBusy = (): boolean => {
        return this.curReq !== null
    }

    statusSet(str: string): void {
        switch (str) {
            case Dty.CmdType.tags_get:
            case Dty.CmdType.filesGet:
            case Dty.CmdType.search_file:
            case Dty.CmdType.app_start:
                return
            default:
                break
        }
        // logger.info('======================', str)
        this.status = str
    }
    // 生成忙碌响应
    makeBusyResponse = (): Dty.Resp => {
        const resp = new Dty.Resp()
        return resp.err(`busy cur cmd is ${this.curReq?.cmd}`)
    }

    // 添加任务到队列
    addTask(req: WorkQueueRequest | null): void {
        if (req !== null) {
            if (appCfg.bPrtWorkQueue) {
                logger.info('add task to queue', req?.cmd)
            }
            this.statusSet(req.cmd)
        } else {
            if (this.curReq != null) {
                if (appCfg.bPrtWorkQueue) {
                    logger.info('clean task in queue', this.curReq?.cmd)
                }
            }
        }
        this.curReq = req
    }

    addResp(resp: Dty.WorkResp): void {
        this.resps.push(resp)
    }
}

const workQueue = new WorkQueue()

interface WorkResp<T> {
    cmd: string
    data: T
}

export { workQueue }
export type { WorkResp }
