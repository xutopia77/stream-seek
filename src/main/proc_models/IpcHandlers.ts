// import * as path from 'path'
import * as fs from 'fs'
import { dialog, IpcMainInvokeEvent } from 'electron'
import mediaProc from './MediaProcess.js'
// import appCfg from './AppCfg.js'
import logger from './Logger'
import appProc from './AppProc'
// import recordsProc from './RecordsProcess.js'
import { workQueue, Util } from './Utils.js'
// import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
import appCfg from './AppCfg.js'

// function make_file_prj_path(filename: string): string {
//     let filePath = `${filename}_prj.json`
//     filePath = path.join(appCfg.file_prj_dir, filePath)
//     return filePath
// }

// async function handle_open_folder(
//     mainWindow: Electron.BrowserWindow,
//     req: DataTypes.Req
// ): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
//     let openType: string | null = null
//     if (req.data != null) {
//         openType = 'search'
//     }

//     const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
//         properties: ['openDirectory']
//         // modal: true
//     })
//     if (!canceled) {
//         const folderPath = filePaths[0]
//         if (openType != 'search') {
//             // 查询文件夹的不用保存到工程文件
//             appCfg.prj.dataFolder = folderPath
//         }
//         logger.info('handle open folder', folderPath)
//         const traversalFolder = new TraversalFolder()
//         traversalFolder.type = openType
//         traversalFolder.bSort = true
//         traversalFolder.folder = folderPath
//         traversalFolder
//             .start()
//             .then((resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
//                 const workResp: DataTypes.WorkResp = {
//                     cmd: req.cmd,
//                     data: JSON.stringify(resp)
//                 }
//                 workQueue.addResp(workResp)
//             })
//             .catch((error: unknown) => {
//                 workQueue.addResp({
//                     cmd: req.cmd,
//                     data: JSON.stringify({ code: 1, status: error })
//                 })
//                 logger.error('open folder err:', error)
//             })
//         const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
//         resp.success('success').data = { folder: folderPath }
//         resp.bOver = false
//         logger.info('handle open folder', resp.status)
//         return resp
//     }
//     return new DataTypes.Resp<DataTypes.TraversalFolder>().err('canceled')
// }

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
        return await appProc.create_prj(req, folderPath)
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

// async function handle_query_video(
//     req: DataTypes.Req<DataTypes.Req_TraversalFolder>
// ): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
//     if (req.data == null) {
//         return new DataTypes.Resp<DataTypes.TraversalFolder>().err('req.data is null')
//     }
//     const traversalFolder = new TraversalFolder()
//     traversalFolder.type = null
//     traversalFolder.folder = req.data?.folder
//     traversalFolder
//         .start()
//         .then((resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
//             if (resp.data?.files != null) {
//                 logger.info('traversal folder:', resp.status, resp.data.files?.length)
//                 recordsProc
//                     .start_file_classify(req, resp.data.files)
//                     .then((resp: DataTypes.Resp) => {
//                         logger.info('handle_query_video after classify:', resp)
//                         workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//                     })
//                     .catch((error: unknown) => {
//                         logger.error('open folder err:', error)
//                         workQueue.addResp({
//                             cmd: req.cmd,
//                             data: JSON.stringify({ code: 1, status: error })
//                         })
//                     })
//             } else {
//                 logger.info('traversal folder:', resp.status)
//                 workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//             }
//         })
//         .catch((error: unknown) => {
//             logger.error('open folder err:', error)
//             workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
//         })
//     const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
//     resp.success('success').bOver = false
//     return resp
// }

// async function handle_clean_work(
//     req: DataTypes.Req<DataTypes.Req_ClearWork>
// ): Promise<DataTypes.Resp> {
//     const resp = new DataTypes.Resp()
//     if (req.data?.files == null) {
//         console.log('clean all work')
//         const thumbnailDir = appCfg.thumbnail_dir
//         if (fs.existsSync(thumbnailDir)) {
//             for (const file of fs.readdirSync(thumbnailDir)) {
//                 const filePath = path.join(thumbnailDir, file)
//                 await fs.promises.rm(filePath, { recursive: true })
//             }
//         }
//         const filePrjDir = appCfg.file_prj_dir
//         if (fs.existsSync(filePrjDir)) {
//             for (const file of fs.readdirSync(filePrjDir)) {
//                 const filePath = path.join(filePrjDir, file)
//                 await fs.promises.rm(filePath, { recursive: true })
//             }
//         }
//         return resp.success('success')
//     }

//     for (const item of req.data.files) {
//         const filename = item.title
//         const filePrjPath = make_file_prj_path(filename)
//         if (fs.existsSync(filePrjPath)) {
//             await fs.promises.rm(filePrjPath)
//         }
//         const thumbnailDir = path.join(appCfg.thumbnail_dir, filename)
//         if (fs.existsSync(thumbnailDir)) {
//             await fs.promises.rm(thumbnailDir, { recursive: true })
//         }
//     }
//     return resp.success('success')
// }

// async function handle_video_event_detect(): Promise<DataTypes.Resp<DataTypes.FileEventInfo[][]>> {
//     const resp = new DataTypes.Resp<DataTypes.FileEventInfo[][]>()

//     const filePath =
//         'D:/02_workspace/05_timeCapsule/02_stream_manager/stream_manager/src/main/proc_models/contour_records.json'
//     let data = ''
//     try {
//         data = fs.readFileSync(filePath, {
//             encoding: 'utf-8'
//         })
//     } catch (error: unknown) {
//         console.error('读取文件时出错:', error)
//         resp.code = 1
//         resp.status = String(error)
//         return resp
//     }
//     try {
//         const jsonData = JSON.parse(data)
//         resp.data = jsonData
//         return resp
//     } catch (error: unknown) {
//         resp.code = 1
//         resp.status = String(error)
//         return resp
//     }
// }

// function getFilenameFromPath(filePath: string): string {
//     // 检查参数是否为字符串类型
//     if (typeof filePath !== 'string') {
//         throw new Error('filepath must be a string')
//     }
//     // 去除路径前后的空白字符
//     filePath = filePath.trim()
//     // 如果路径为空字符串，直接返回空字符串
//     if (filePath === '') {
//         return ''
//     }
//     // 使用正则表达式按照反斜杠或正斜杠分割路径
//     const parts = filePath.split(/[\\/]/)
//     // 返回数组的最后一个元素，即文件名
//     return parts[parts.length - 1]
// }

// async function handle_select_video(
//     req: DataTypes.Req<DataTypes.Req_SltFile>
// ): Promise<DataTypes.Resp<DataTypes.File>> {
//     const resp = new DataTypes.Resp<DataTypes.File>()
//     resp.data = new DataTypes.File()
//     if (req.data == null) {
//         return resp.err('req.data is null')
//     }
//     if (resp.data == undefined) {
//         return resp.err('resp.data is null')
//     }
//     const video_path = req.data?.filepath
//     if (video_path == null) {
//         return resp.err('filepath is null')
//     }
//     // 先读取文件的项目信息
//     {
//         const filename = getFilenameFromPath(video_path)
//         const filePrjPath = make_file_prj_path(filename)
//         if (fs.existsSync(filePrjPath)) {
//             // 读取文件
//             let data = ''
//             try {
//                 data = fs.readFileSync(filePrjPath, {
//                     encoding: 'utf-8'
//                 })
//                 const jsonData = JSON.parse(data)
//                 resp.data = jsonData.fileInfo
//                 // 读取成功了直接返回
//                 logger.info('handle_select_video read file prj success')
//                 return resp
//             } catch (error: unknown) {
//                 console.error('not find video split info:', filePrjPath, error)
//             }
//         }
//     }

//     // get media info
//     {
//         const mediaInfo = await mediaProc.getVideoInfo(video_path)
//         respData.mediaInfo = mediaInfo
//     }
//     {
//         const thubResp = await appProc.query_images(video_path)
//         // logger.info('handle_select_video', thubResp);
//         if (thubResp.code == 0) {
//             respData.thumbnail = thubResp.data?.files
//         }
//     }
//     return resp
// }

// async function handle_save_prj(
//     req: DataTypes.Req<DataTypes.Req_CutVideo>
// ): Promise<DataTypes.Resp> {
//     const resp = new DataTypes.Resp()
//     if (req.data == null) {
//         return resp.err('req.data is null')
//     }
//     const filePath = make_file_prj_path(req.data.filename)
//     const data = JSON.stringify(req.data)
//     try {
//         fs.writeFileSync(filePath, data)
//         return resp.success('success')
//     } catch (error: unknown) {
//         return resp.err(String(error))
//     }
// }

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

/*
async function traversal_folder(
    req: DataTypes.Req<DataTypes.Req_TraversalFolder>
): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
    const folderpath = req.data?.folder
    if (folderpath == null) {
        const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
        return resp.err('folderpath is null')
    }
    const traversalFolder = new TraversalFolder()
    traversalFolder.folder = folderpath
    traversalFolder.bSort = true
    return await traversalFolder.start()
}
*/

async function process_heart_beat(): Promise<DataTypes.Resp<DataTypes.HeartBeat>> {
    const resp = new DataTypes.Resp<DataTypes.HeartBeat>()
    const respData: DataTypes.HeartBeat = {
        time: '',
        appStatus: ''
    }
    respData.time = Util.getCurTime()
    respData.appStatus = ''
    if (workQueue.curReq != null) {
        respData.appStatus = workQueue.curReq.cmd
    }
    while (workQueue.processing) {
        await new Promise((resolve) => setTimeout(resolve, 10))
    }
    workQueue.processing = true
    if (workQueue.resps.length != 0) {
        workQueue.addTask(null)
        for (const item of workQueue.resps) {
            logger.info(`work resp:cmd: ${item.cmd}`)
        }
    }
    respData.workRespose = workQueue.resps
    workQueue.resps = []
    workQueue.processing = false
    resp.data = respData
    return resp
}

function make_cmd_response<T>(cmdResp: DataTypes.Resp<T>): DataTypes.Resp<string> {
    const resp = new DataTypes.Resp<string>()
    for (const key in cmdResp) {
        if (key == 'data') {
            continue
        }
        resp[key] = cmdResp[key]
    }
    resp.data = JSON.stringify(cmdResp.data)
    if (!(cmdResp.bOver == false)) {
        workQueue.addTask(null)
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
            case 'app_start':
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.app_start())
            case 'get_key_frame_info': {
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
            case 'search_file': {
                logger.info(`cmd:${cmd}:${cseq}`)
                const cmdReq = convertCmdRequest<DataTypes.FilesReq>(req)
                return make_cmd_response(await appProc.search_file(cmdReq))
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
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.start_sync_work(cmdReq))
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
            case 'tags_get': {
                const cmdReq = convertCmdRequest<DataTypes.TagsReq>(req)
                logger.info(`cmd:${cmd}:${cseq}`)
                return make_cmd_response(await appProc.handle_tags_get(cmdReq))
            }
            case 'files_get': {
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
        // console.log(`Handling event: ${event}`);
        const req: DataTypes.Req<string> = JSON.parse(args[0])
        if (req.cmd != 'heart_beat') {
            // console.log(`Arguments: ${args}`);
        }
        if (req.cmd == 'heart_beat') {
            return make_cmd_response(await process_heart_beat())
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
