import * as path from 'path'
import * as fs from 'fs'
import { dialog } from 'electron'
import mediaProc from './MediaProcess.js'
import appCfg from './AppCfg.js'
import logger from './Logger.js'
import recordsProc from './RecordsProcess.js'
import { TraversalFolder, workQueue } from './Utils.js'

// 定义请求对象的类型
interface Request {
  cmd: string
  data?: any
}

// 定义响应对象的类型
interface Response {
  code: number
  status: string
  bOver?: boolean
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
): Promise<Response> {
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
      .then((resp: TraversalFolderResponse) => {
        const workResp = {
          cmd: req.cmd,
          data: resp
        }
        workQueue.addResp(workResp)
      })
      .catch((error: any) => {
        workQueue.addResp({ cmd: req.cmd, data: { code: 1, status: error } })
        logger.error('open folder err:', error)
      })
    const resp: Response = {
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
          workQueue.addResp({ cmd: req.cmd, data: resp })
        })
        .catch((error: any) => {
          logger.error('open folder err:', error)
          workQueue.addResp({ cmd: req.cmd, data: { code: 1, status: error } })
        })
    })
    .catch((error: any) => {
      logger.error('open folder err:', error)
      workQueue.addResp({ cmd: req.cmd, data: { code: 1, status: error } })
    })

  return { code: 0, status: 'success', bOver: false }
}

async function handle_video_event_detect(req: Request): Promise<Response> {
  const resp: Response = {
    code: 0,
    status: 'success',
    data: {
      mediaInfo: null,
      eventInfo: null
    }
  }

  const video_path = req.data.src
  const mediaInfo = await mediaProc.getVideoInfo(video_path)
  resp.data.mediaInfo = mediaInfo

  const filePath =
    'D:/02_workspace/05_timeCapsule/02_stream_manager/stream_manager/src/main/proc_models/contour_records.json'
  let data = ''
  try {
    data = fs.readFileSync(filePath, {
      encoding: 'utf-8'
    })
  } catch (error: any) {
    console.error('读取文件时出错:', error)
    resp.code = 1
    resp.status = error
    return resp
  }
  try {
    const jsonData = JSON.parse(data)
    resp.data.eventInfo = jsonData
    return resp
  } catch (error: any) {
    resp.code = 1
    resp.status = error
    return resp
  }
}

function getFilenameFromPath(filePath: string): string {
  // 检查参数是否为字符串类型
  if (typeof filePath !== 'string') {
    throw new Error('输入的文件路径必须是字符串类型')
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

async function handle_select_video(req: Request): Promise<Response> {
  const video_path = req.data.src
  const filename = getFilenameFromPath(video_path)
  const resp: Response = {
    code: 0,
    status: 'success',
    data: {
      mediaInfo: null,
      eventInfo: null,
      splitInfo: null,
      thumbnail: null,
      keyFrameSplitInfo: null
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
      } catch (error: any) {
        console.error('not find video split info:', filePrjPath, error)
      }
    }
  }

  // get media info
  {
    const mediaInfo = await mediaProc.getVideoInfo(video_path)
    resp.data.mediaInfo = mediaInfo
  }
  {
    const thubResp = await recordsProc.query_images(video_path)
    // logger.info('handle_select_video', thubResp);
    if (thubResp.code == 0) {
      resp.data.thumbnail = thubResp.data.files
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
    } catch (error: any) {
      console.error('读取文件时出错:', error)
    }
    // 解析json数据
    try {
      const jsonData = JSON.parse(data)
      resp.data.eventInfo = jsonData
    } catch (error: any) {
      console.log('err parse json:', error)
    }
  }
  return resp
}

async function handle_save_prj(req: Request): Promise<Response> {
  // 把req.data 保存到文件
  const filePath = make_file_prj_path(req.data.filename)
  const data = JSON.stringify(req.data)
  try {
    fs.writeFileSync(filePath, data)
    return { code: 0, status: 'success' }
  } catch (error: any) {
    return { code: 1, status: error }
  }
}

function handle_app_start(): Response {
  const resp: Response = { code: 0, status: 'success', bOver: true, data: {} }
  // 读取cfg.json

  const cfgPath = path.join(appCfg.appData, 'prj.json')
  let data = ''
  try {
    data = fs.readFileSync(cfgPath, {
      encoding: 'utf-8'
    })
  } catch (error: any) {
    console.error('读取文件时出错:', error)
  }
  try {
    const jsonData = JSON.parse(data)
    appCfg.prj = jsonData
    resp.data['prj'] = appCfg.prj
  } catch (error: any) {
    console.log('err parse json:', error)
  }
  return resp
}

async function handle_get_key_frame_info(req: Request): Promise<Response> {
  const filePath = req.data.filepath
  mediaProc
    .get_frame_info(filePath)
    .then((resp: Response) => {
      workQueue.addResp({ cmd: req.cmd, data: resp })
    })
    .catch((error: any) => {
      logger.error('get frame info err:', error)
      workQueue.addResp({ cmd: req.cmd, data: { code: 1, status: error } })
    })
  return { code: 0, status: 'success', bOver: false }
}

async function traversal_folder(req: Request): Promise<TraversalFolderResponse> {
  const folderpath = req.data.folder
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = req.data.type
  traversalFolder.folder = folderpath
  return await traversalFolder.start()
}

async function process_heart_beat(): Promise<Response> {
  // 获取当前的时间的字符串，精确到秒，格式为：YYYY-MM-DD hh:mm:ss
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const timeStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`
  const respData = {
    time: timeStr,
    appStatus: ''
  }
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
  return { code: 0, status: 'success', data: respData }
}

export class IpcHandlers {
  mainWindow: Electron.BrowserWindow | null

  constructor() {
    this.mainWindow = null
  }

  async start_process_cmd(req: Request): Promise<Response> {
    const cmd = req['cmd']
    switch (cmd) {
      case 'get_key_frame_info':
        logger.log(cmd, req)
        return handle_get_key_frame_info(req)
      case 'open_folder':
        logger.log(cmd, req)
        return handle_open_folder(this.mainWindow!, req)
      case 'traversal_folder':
        logger.log(cmd, req)
        return traversal_folder(req)
      case 'slt_video_event':
        logger.log(cmd, req)
        return handle_video_event_detect(req)
      case 'save_prj':
        logger.log(cmd, req.filepath)
        return handle_save_prj(req)
      case 'cut_video':
        logger.log(cmd, req.data.filepath)
        return recordsProc.start_cut_video(req)
      case 'slt_video':
        logger.log(cmd, req)
        return handle_select_video(req)
      case 'app_start':
        logger.log(cmd, req)
        return handle_app_start()
      case 'query_video':
        logger.log(cmd, req)
        return handle_query_video(req)
      default:
        console.log(`Unknown event: ${cmd}`)
        return { code: 1, status: `Unknown event: ${cmd}` }
    }
  }

  handle_event = async (event: string, ...args: string[]): Promise<Response> => {
    // console.log(`Handling event: ${event}`);
    const req = JSON.parse(args[0])
    if (req.cmd != 'heart_beat') {
      // console.log(`Arguments: ${args}`);
    }

    if (req.cmd == 'heart_beat') {
      return await process_heart_beat()
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
