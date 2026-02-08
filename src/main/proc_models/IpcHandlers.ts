// import * as path from 'path'
// import * as fs from 'fs'
import { IpcMainInvokeEvent } from 'electron'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appProc from './AppProc'
// import recordsProc from './RecordsProcess.js'
// import { Util } from './Utils.js'
import { workQueue } from './TaskEvent'
// import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
// import appCfg from './AppCfg.js'

export class IpcHandlers {
    mainWindow: Electron.BrowserWindow | null

    constructor() {
        this.mainWindow = null
    }

    handle_event = async (
        event: IpcMainInvokeEvent,
        ...args: string[]
    ): Promise<DataTypes.Resp> => {
        if (!event) {
            console.log(`event is null`)
        }
        // console.log(`Handling event----: ${event}`)
        const req: DataTypes.Req<string> = JSON.parse(args[0])
        if (req.cmd != 'heart_beat') {
            // console.log(`Arguments: ${args}`);
        }
        if (req.cmd == 'heart_beat') {
            return appProc.cmdRespMake(await appProc.handle_heartbeat(), false)
        }
        if (workQueue.isBusy()) {
            logger.warn(`work queue is busy, cmd: ${req.cmd}, curReq: ${workQueue.curReq?.cmd}`)
            return workQueue.makeBusyResponse()
        }
        workQueue.addTask(req)
        const resp = await appProc.start_process_cmd(req, this.mainWindow)
        if (resp.bOver == true || resp.bOver == undefined) {
            workQueue.curReq = null
        }
        return resp
    }
}
