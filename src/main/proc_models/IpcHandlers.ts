import * as path from 'path'
import * as fs from 'fs'
import { Data, dialog } from 'electron'
import mediaProc from './MediaProcess.js'
import appCfg from './AppCfg.js'
import logger from './Logger.js'
import recordsProc from './RecordsProcess.js'
import { TraversalFolder, workQueue } from './Utils.js'
// import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'
// 定义请求对象的类型
interface Request {
  cmd: string
  data?: any
}

// 定义 TraversalFolder 类的响应类型
interface TraversalFolderResponse {
  code: number
  status: string
  data: {
    folder: string
    files: any[]
  }
}

function make_file_prj_path(filename: string): string {
  let filePath = `${filename}_prj.json`
  filePath = path.join(appCfg.file_prj_dir, filePath)
  return filePath
}

async function handle_open_folder(
  mainWindow: Electron.BrowserWindow,
  req: Request
): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  let openType: string | null = null
  if (req.data != null) {
    openType = req.data.type
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    modal: true
  })
  if (!canceled) {
    const folderPath = filePaths[0]
    if (openType != 'search') {
      // 查询文件夹的不用保存到工程文件
      appCfg.prj['lastOpenedFolder'] = folderPath
    }
    logger.log('handle_open_folder', folderPath)
    const traversalFolder = new TraversalFolder()
    traversalFolder.type = openType
    traversalFolder.folder = folderPath
    traversalFolder
      .start()
      .then((resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
        const workResp: DataTypes.WorkResp = {
          cmd: req.cmd,
          data: JSON.stringify(resp)
        }
        workQueue.addResp(workResp)
      })
      .catch((error: unknown) => {
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
        logger.error('open folder err:', error)
      })
    const resp: DataTypes.Resp<DataTypes.TraversalFolder> = {
      code: 0,
      status: 'success',
      bOver: false,
      data: { folder: folderPath }
    }
    logger.log('handle_open_folder', resp.status)
    return resp
  }
  return { code: 0, status: 'canceled' }
}

async function handle_query_video(req: Request): Promise<Response> {
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = req.data.type
  traversalFolder.folder = req.data.folder
  traversalFolder
    .start()
    .then((resp: TraversalFolderResponse) => {
      logger.log('traversal folder:', resp.status, resp.data.files.length)
      recordsProc
        .start_file_classify({ req, files: resp.data.files })
        .then((resp: Response) => {
          logger.log('handle_query_video after classify:', resp)
          workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
        })
        .catch((error: unknown) => {
          logger.error('open folder err:', error)
          workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
        })
    })
    .catch((error: unknown) => {
      logger.error('open folder err:', error)
      workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
    })

  return { code: 0, status: 'success', bOver: false }
}

async function handle_video_event_detect(): Promise<DataTypes.Resp<DataTypes.FileEventInfo[][]>> {
  const resp: DataTypes.Resp<DataTypes.FileEventInfo[][]> = {
    code: 0,
    status: 'success',
    data: []
  }

  const filePath =
    'D:/02_workspace/05_timeCapsule/02_stream_manager/stream_manager/src/main/proc_models/contour_records.json'
  let data = ''
  try {
    data = fs.readFileSync(filePath, {
      encoding: 'utf-8'
    })
  } catch (error: unknown) {
    console.error('读取文件时出错:', error)
    resp.code = 1
    resp.status = String(error)
    return resp
  }
  try {
    const jsonData = JSON.parse(data)
    resp.data = jsonData
    return resp
  } catch (error: unknown) {
    resp.code = 1
    resp.status = String(error)
    return resp
  }
}

function getFilenameFromPath(filePath: string): string {
  // 检查参数是否为字符串类型
  if (typeof filePath !== 'string') {
    throw new Error('filepath must be a string')
  }
  // 去除路径前后的空白字符
  filePath = filePath.trim()
  // 如果路径为空字符串，直接返回空字符串
  if (filePath === '') {
    return ''
  }
  // 使用正则表达式按照反斜杠或正斜杠分割路径
  const parts = filePath.split(/[\\/]/)
  // 返回数组的最后一个元素，即文件名
  return parts[parts.length - 1]
}

async function handle_select_video(req: Request): Promise<DataTypes.Resp<DataTypes.SltMediaInfo>> {
  const video_path = req.data.src
  const filename = getFilenameFromPath(video_path)
  const resp: DataTypes.Resp<DataTypes.SltMediaInfo> = {
    code: 0,
    status: 'success',
    data: {
      mediaInfo: undefined
    }
  }
  {
    const filePrjPath = make_file_prj_path(filename)
    if (fs.existsSync(filePrjPath)) {
      // 读取文件
      let data = ''
      try {
        data = fs.readFileSync(filePrjPath, {
          encoding: 'utf-8'
        })
        const jsonData = JSON.parse(data)
        resp.data = jsonData.fileInfo
        // 读取成功了直接返回
        logger.log('handle_select_video read file prj success')
        return resp
      } catch (error: unknown) {
        console.error('not find video split info:', filePrjPath, error)
      }
    }
  }

  // get media info
  {
    const mediaInfo = await mediaProc.getVideoInfo(video_path)
    if (resp.data) {
      resp.data.mediaInfo = mediaInfo
    }
  }
  {
    const thubResp = await recordsProc.query_images(video_path)
    // logger.info('handle_select_video', thubResp);
    if (thubResp.code == 0) {
      if (resp.data != null) {
        resp.data.thumbnail = thubResp.data?.files
      }
    }
  }
  {
    const filePath =
      'D:/02_workspace/05_timeCapsule/02_stream_manager/stream_manager/src/main/proc_models/contour_records.json'
    let data = ''
    try {
      data = fs.readFileSync(filePath, {
        encoding: 'utf-8'
      })
    } catch (error: unknown) {
      console.error('读取文件时出错:', error)
    }
    // 解析json数据
    try {
      const jsonData = JSON.parse(data)
      if (resp.data != null) {
        resp.data.eventInfo = jsonData
      }
    } catch (error: unknown) {
      console.log('err parse json:', error)
    }
  }
  return resp
}

async function handle_save_prj(req: Request): Promise<DataTypes.Resp<string>> {
  // 把req.data 保存到文件
  const filePath = make_file_prj_path(req.data.filename)
  const data = JSON.stringify(req.data)
  try {
    fs.writeFileSync(filePath, data)
    return { code: 0, status: 'success' }
  } catch (error: unknown) {
    return { code: 1, status: String(error) }
  }
}

function handle_app_start(): DataTypes.Resp<DataTypes.Prj> {
  const resp: DataTypes.Resp<DataTypes.Prj> = { code: 0, status: 'success', bOver: true }
  const cfgPath = path.join(appCfg.appData, 'prj.json')
  let data = ''
  try {
    data = fs.readFileSync(cfgPath, {
      encoding: 'utf-8'
    })
  } catch (error: unknown) {
    console.error('读取文件时出错:', error)
  }
  try {
    const jsonData = JSON.parse(data)
    appCfg.prj = jsonData
    resp.data = appCfg.prj
  } catch (error: unknown) {
    console.log('err parse json:', error)
  }
  return resp
}

async function handle_get_key_frame_info(
  req: Request
): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
  const resp: DataTypes.Resp<DataTypes.FrameInfo> = {
    code: 0,
    status: 'success',
    bOver: false
  }
  const filePath = req.data.filepath
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

async function traversal_folder(req: Request): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  const folderpath = req.data.folder
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = req.data.type
  traversalFolder.folder = folderpath
  return await traversalFolder.start()
}

async function process_heart_beat(): Promise<DataTypes.Resp<DataTypes.HeartBeat>> {
  const resp: DataTypes.Resp<DataTypes.HeartBeat> = {
    code: 0,
    status: 'success'
  }
  const respData: DataTypes.HeartBeat = {
    time: '',
    appStatus: ''
  }

  // 获取当前的时间的字符串，精确到秒，格式为：YYYY-MM-DD hh:mm:ss
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const timeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`
  respData.time = timeStr
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
  }
  respData['workRespose'] = workQueue.resps
  workQueue.resps = []
  workQueue.processing = false
  resp.data = respData
  return resp
}

interface CmdResponse<T> {
  code: number
  status: string
  data?: T
}

function make_cmd_response<T>(resp: CmdResponse<T>): DataTypes.Resp<string> {
  const response: DataTypes.Resp<string> = {
    code: resp.code,
    status: resp.status,
    data: JSON.stringify(resp.data)
  }
  return response
}

export class IpcHandlers {
  mainWindow: Electron.BrowserWindow | null

  constructor() {
    this.mainWindow = null
  }

  async start_process_cmd(req: Request): Promise<DataTypes.Resp> {
    const cmd = req['cmd']
    switch (cmd) {
      case 'get_key_frame_info':
        logger.log(cmd, req)
        return make_cmd_response(await handle_get_key_frame_info(req))
      case 'open_folder': {
        logger.log(cmd, req)
        return make_cmd_response(await handle_open_folder(this.mainWindow!, req))
      }
      case 'traversal_folder':
        logger.log(cmd, req)
        return make_cmd_response(await traversal_folder(req))
      case 'slt_video_event':
        logger.log(cmd, req)
        return make_cmd_response(await handle_video_event_detect())
      case 'save_prj':
        logger.log(cmd)
        return make_cmd_response(await handle_save_prj(req))
      case 'cut_video':
        logger.log(cmd, req.data.filepath)
        return make_cmd_response(await recordsProc.start_cut_video(req))
      case 'slt_video':
        logger.log(cmd, req)
        return make_cmd_response(await handle_select_video(req))
      case 'app_start':
        logger.log(cmd, req)
        return make_cmd_response(await handle_app_start())
      case 'query_video':
        logger.log(cmd, req)
        return make_cmd_response(await handle_query_video(req))
      default:
        console.log(`Unknown event: ${cmd}`)
        return { code: 1, status: `Unknown event: ${cmd}` }
    }
  }

  handle_event = async (event: string, ...args: string[]): Promise<DataTypes.Resp> => {
    // console.log(`Handling event: ${event}`);
    const req = JSON.parse(args[0])
    if (req.cmd != 'heart_beat') {
      // console.log(`Arguments: ${args}`);
    }

    if (req.cmd == 'heart_beat') {
      return make_cmd_response(await process_heart_beat())
    }
    if (workQueue.isBusy()) {
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
