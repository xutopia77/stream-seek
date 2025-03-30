import * as path from 'path'
import * as fs from 'fs'
import { dialog } from 'electron'
import mediaProc from './MediaProcess.js'
import appCfg from './AppCfg.js'
import logger from './Logger.js'
import recordsProc from './RecordsProcess.js'
import { TraversalFolder, workQueue } from './Utils.js'
// import type { WorkResp } from './Utils.js'
import * as DataTypes from '../../bridge/dataTypedef'

function make_file_prj_path(filename: string): string {
  let filePath = `${filename}_prj.json`
  filePath = path.join(appCfg.file_prj_dir, filePath)
  return filePath
}

async function handle_open_folder(
  mainWindow: Electron.BrowserWindow,
  req: DataTypes.Req
): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  let openType: string | null = null
  if (req.data != null) {
    openType = 'search'
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
    // modal: true
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

async function handle_query_video(
  req: DataTypes.Req<DataTypes.Req_SearchFile>
): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  if (req.data == null) {
    return { code: 1, status: 'req.data is null' }
  }
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = null
  traversalFolder.folder = req.data?.folder
  traversalFolder
    .start()
    .then((resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
      if (resp.data?.files != null) {
        logger.log('traversal folder:', resp.status, resp.data.files?.length)
        recordsProc
          .start_file_classify(req, resp.data.files)
          .then((resp: DataTypes.Resp) => {
            logger.log('handle_query_video after classify:', resp)
            workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
          })
          .catch((error: unknown) => {
            logger.error('open folder err:', error)
            workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
          })
      } else {
        logger.log('traversal folder:', resp.status)
        workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
      }
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

async function handle_select_video(
  req: DataTypes.Req<DataTypes.Req_SltFile>
): Promise<DataTypes.Resp<DataTypes.SltMediaInfo>> {
  const video_path = req.data?.filepath
  if (video_path == null) {
    return { code: 1, status: 'video_path is null' }
  }
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

async function handle_save_prj(
  req: DataTypes.Req<DataTypes.Req_CutVideo>
): Promise<DataTypes.Resp> {
  if (req.data == null) {
    return { code: 1, status: 'req.data is null' }
  }
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
  req: DataTypes.Req<DataTypes.Req_FrameInfo>
): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
  const resp: DataTypes.Resp<DataTypes.FrameInfo> = {
    code: 0,
    status: 'success',
    bOver: false
  }
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

async function traversal_folder(
  req: DataTypes.Req<DataTypes.Req_TraversalFolder>
): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  const folderpath = req.data?.folder
  if (folderpath == null) {
    return { code: 1, status: 'folderpath is null' }
  }
  const traversalFolder = new TraversalFolder()
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
    for (const item of workQueue.resps) {
      logger.log(`work resp:cmd: ${item.cmd}`)
    }
  }
  respData.workRespose = workQueue.resps
  workQueue.resps = []
  workQueue.processing = false
  resp.data = respData
  return resp
}

function make_cmd_response<T>(resp: DataTypes.Resp<T>): DataTypes.Resp<string> {
  const response: DataTypes.Resp<string> = {
    code: resp.code,
    status: resp.status,
    bOver: resp.bOver,
    data: JSON.stringify(resp.data)
  }
  return response
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
        data: JSON.parse(req.data ? req.data : '{}') as T
      }
      return cmdReq
    }
    const cmd = req.cmd
    switch (cmd) {
      case 'get_key_frame_info': {
        const cmdReq = convertCmdRequest<DataTypes.Req_FrameInfo>(req)
        logger.log(cmd, cmdReq.data?.filepath)
        return make_cmd_response(await handle_get_key_frame_info(cmdReq))
      }
      case 'open_folder': {
        logger.log(cmd, req)
        return make_cmd_response(await handle_open_folder(this.mainWindow!, req))
      }
      case 'traversal_folder': {
        const cmdReq = convertCmdRequest<DataTypes.Req_TraversalFolder>(req)
        logger.log(cmd, cmdReq.data?.folder)
        return make_cmd_response(await traversal_folder(cmdReq))
      }
      case 'slt_video_event': {
        logger.log(cmd, req)
        return make_cmd_response(await handle_video_event_detect())
      }
      case 'save_prj': {
        const cmdReq = convertCmdRequest<DataTypes.Req_CutVideo>(req)
        logger.log(`${cmd}, ${cmdReq.data?.filepath}`)
        return make_cmd_response(await handle_save_prj(cmdReq))
      }
      case 'cut_video': {
        const cmdReq = convertCmdRequest<DataTypes.Req_CutVideo>(req)
        return make_cmd_response(await recordsProc.start_cut_video(cmdReq))
      }
      case 'slt_video': {
        const cmdReq = convertCmdRequest<DataTypes.Req_SltFile>(req)
        logger.log(cmd, cmdReq.data?.filepath)
        return make_cmd_response(await handle_select_video(cmdReq))
      }
      case 'app_start':
        logger.log(cmd, req)
        return make_cmd_response(await handle_app_start())
      case 'query_video': {
        const cmdReq = convertCmdRequest<DataTypes.Req_SearchFile>(req)
        logger.log(cmd, cmdReq)
        return make_cmd_response(await handle_query_video(cmdReq))
      }
      default:
        console.log(`Unknown event: ${cmd}`)
        return { code: 1, status: `Unknown event: ${cmd}` }
    }
  }

  handle_event = async (event: string, ...args: string[]): Promise<DataTypes.Resp> => {
    // console.log(`Handling event: ${event}`);
    const req: DataTypes.Req<string> = JSON.parse(args[0])
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
