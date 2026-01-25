// import * as path from 'path'
import * as fs from 'fs'
import { dialog, IpcMainInvokeEvent } from 'electron'
import mediaProc from './MediaProcess.js'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appProc from './AppProc'
// import recordsProc from './RecordsProcess.js'
import { Util } from './Utils.js'
import { workQueue } from './TaskEvent'
// import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'

async function handle_create_prj(
    req: DataTypes.Req<DataTypes.CreatePrjReq>,
    mainWindow: Electron.BrowserWindow
): Promise<DataTypes.Resp<DataTypes.CreatePrjResp>> {
    const resp = new DataTypes.Resp<DataTypes.CreatePrjResp>()
    try {
        // 显示文件夹选择对话框
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        })

        if (canceled) {
            // 用户取消选择，返回取消状态
            return resp.err('User canceled the folder selection')
        }
        const folderPath = filePaths[0]
        // 获取当前文件夹下内容是否为空
        const folderContent = fs.readdirSync(folderPath)
        if (folderContent.length > 0) {
            logger.info('The selected folder is not empty')
            return resp.err('The selected folder is not empty')
        }
        return await appProc.create_prj(req, Util.pathToLinuxStyle(folderPath))
    } catch (error) {
        logger.error('Error creating project file:', error)
        return resp.err(
            `Error creating project file: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function handle_open_prj(
    mainWindow: Electron.BrowserWindow
): Promise<DataTypes.Resp<DataTypes.Prj>> {
    const resp = new DataTypes.Resp<DataTypes.Prj>()
    try {
        // 显示文件选择对话框
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [
                { name: 'Project Files', extensions: ['json'] }, // 可根据实际需求修改文件类型
                { name: 'All Files', extensions: ['*'] }
            ]
        })

        if (canceled) {
            // 用户取消选择，返回取消状态
            return resp.err('User canceled the file selection')
        }

        const filePath = filePaths[0]
        logger.info('Selected file path:', filePath)
        const fileContent = await fs.promises.readFile(filePath, 'utf-8')
        const prjInfo = JSON.parse(fileContent) as DataTypes.Prj
        appCfg.prj = prjInfo
        appCfg.appInfo.prjFile = filePath
        appProc.saveAppCfg()
        resp.success('File opened successfully').data = prjInfo
        return resp
    } catch (error) {
        // 处理异常，返回错误信息
        logger.error('Error opening project file:', error)
        return resp.err(
            `Error opening project file: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

async function handle_get_key_frame_info(
    req: DataTypes.Req<DataTypes.Req_FrameInfo>
): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
    const resp = new DataTypes.Resp<DataTypes.FrameInfo>()
    resp.bOver = false
    const filePath = req.data?.filepath
    if (filePath == null) {
        resp.code = 1
        resp.status = 'filePath is null'
        return resp
    }
    mediaProc
        .get_frame_info(filePath)
        .then((resp: DataTypes.Resp<DataTypes.FrameInfo>) => {
            workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        })
        .catch((error: unknown) => {
            logger.error('get frame info err:', error)
            workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
        })
    resp.code = 0
    resp.status = 'success'
    resp.bOver = false
    return resp
}

function make_cmd_response<T>(
    cmdResp: DataTypes.Resp<T>,
    bDoClear: boolean = true
): DataTypes.Resp<string> {
    const resp = new DataTypes.Resp<string>()
    for (const key in cmdResp) {
        if (key == 'data') {
            continue
        }
        resp[key] = cmdResp[key]
    }
    resp.data = JSON.stringify(cmdResp.data)
    if (appCfg.bPrtWorkQueue) {
        logger.info(`cmd response: ${cmdResp.bOver}, cur cmd ${workQueue.curReq?.cmd}`)
    }
    if (bDoClear) {
        if (!(cmdResp.bOver == false)) {
            workQueue.addTask(null)
        }
    }
    return resp
}

export class IpcHandlers {
    mainWindow: Electron.BrowserWindow | null

    constructor() {
        this.mainWindow = null
    }

    async start_process_cmd(req: DataTypes.Req): Promise<DataTypes.Resp> {
        function convertCmdRequest<T>(req: DataTypes.Req): DataTypes.Req<T> {
            const cmdReq: DataTypes.Req<T> = {
                cmd: req.cmd,
                cseq: req.cseq,
                data: JSON.parse(req.data ? req.data : '{}') as T
            }
            return cmdReq
        }
        const cmd = req.cmd
        const cseq = req.cseq
        switch (cmd) {
            case DataTypes.CmdType.app_start:
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.handle_app_start())
            case DataTypes.CmdType.get_key_frame_info: {
                const cmdReq = convertCmdRequest<DataTypes.Req_FrameInfo>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return make_cmd_response(await handle_get_key_frame_info(cmdReq))
            }
            case 'create_prj': {
                const cmdReq = convertCmdRequest<DataTypes.CreatePrjReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${req}`)
                return make_cmd_response(await handle_create_prj(cmdReq, this.mainWindow!))
            }
            case 'open_prj': {
                logger.info(`cmd:${cmd}:${cseq}, ${req}`)
                return make_cmd_response(await handle_open_prj(this.mainWindow!))
            }
            case DataTypes.CmdType.search_file: {
                logger.info(`cmd:${cmd}:${cseq}`)
                const cmdReq = convertCmdRequest<DataTypes.FilesReq>(req)
                return make_cmd_response(await appProc.handle_search_file(cmdReq))
            }
            // case 'traversal_folder': {
            //     const cmdReq = convertCmdRequest<DataTypes.Req_TraversalFolder>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.folder}`)
            //     return make_cmd_response(await traversal_folder(cmdReq))
            // }
            // case 'slt_video_event': {
            //     logger.info(`cmd:${cmd}:${cseq}, ${req}`)
            //     return make_cmd_response(await handle_video_event_detect())
            // }
            // case 'cut_video': {
            //     const cmdReq = convertCmdRequest<DataTypes.Req_CutVideo>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
            //     return make_cmd_response(await recordsProc.start_cut_video(cmdReq))
            // }
            case 'delete_video': {
                const cmdReq = convertCmdRequest<DataTypes.DeleteFileReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, length=${cmdReq.data?.files.length}`)
                return make_cmd_response(await appProc.handle_delete_file(cmdReq))
            }
            case 'slt_video': {
                const cmdReq = convertCmdRequest<DataTypes.Req_SltFile>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.filepath}`)
                return make_cmd_response(await appProc.handle_select_video(cmdReq))
            }
            // case 'query_video': {
            //     const cmdReq = convertCmdRequest<DataTypes.Req_TraversalFolder>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq}`)
            //     return make_cmd_response(await handle_query_video(cmdReq))
            // }
            case 'sync_prj': {
                const cmdReq = convertCmdRequest<DataTypes.SyncPrjReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.type}`)
                return make_cmd_response(await appProc.handle_sync_work(cmdReq))
            }
            // case 'sync_trash': {
            //     const cmdReq = convertCmdRequest<DataTypes.Req_SyncTrash>(req)
            //     logger.info(`cmd:${cmd}:${cseq}, ${cmdReq.data?.folder}`)
            //     return make_cmd_response(await recordsProc.start_sync_trash(cmdReq))
            // }
            case 'file_tags_set': {
                const cmdReq = convertCmdRequest<DataTypes.FileTagsReq>(req)
                logger.info(`cmd:${cmd}:${cseq}, fileTags len:${cmdReq.data?.fileTags.length}`)
                return make_cmd_response(await appProc.handle_file_tags_set(cmdReq))
            }
            case DataTypes.CmdType.tags_get: {
                const cmdReq = convertCmdRequest<DataTypes.TagsReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.handle_tags_get(cmdReq))
            }
            case DataTypes.CmdType.files_get: {
                const cmdReq = convertCmdRequest<DataTypes.FilesReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.handle_files_get(cmdReq))
            }
            default: {
                console.log(`Unknown event: ${cmd}:${cseq}`)
                const resp = new DataTypes.Resp()
                return resp.err(`Unknown event: ${cmd}`)
            }
        }
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
            return make_cmd_response(await appProc.handle_heartbeat(), false)
        }
        if (workQueue.isBusy()) {
            logger.warn(`work queue is busy, cmd: ${req.cmd}, curReq: ${workQueue.curReq?.cmd}`)
            return workQueue.makeBusyResponse()
        }
        workQueue.addTask(req)
        const resp = await this.start_process_cmd(req)
        if (resp.bOver == true || resp.bOver == undefined) {
            workQueue.curReq = null
        }
        return resp
    }
}
