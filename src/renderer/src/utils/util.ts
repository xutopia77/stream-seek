import { AppStore } from '../stores/AppStore' // 假设 AppStore 有对应的类型定义

import * as DataTypes from '../../../bridge/dataTypedef'
import MessageShow from '../components/util/MessageShow'
import { IpcApi } from './ipcApi'
let appStore: AppStore | null = null

function updateKeyframeSplitInfo(
  frameInfo: { pict_type: string; pts_time: number }[]
): DataTypes.SplitInfo[] {
  // 根据i帧的时间信息，生成bar上的分割信息
  const frameSplitInfo: DataTypes.SplitInfo[] = []
  let lastTime = 0.0
  for (let i = 0; i < frameInfo.length; i++) {
    const frame = frameInfo[i]
    if (frame.pict_type === 'I') {
      const curTime = frame.pts_time - (appStore?.videoPlayCtrl.videoStartTime || 0)
      if (curTime > lastTime) {
        const itemInfo = util.makeSplitInfo()
        itemInfo.startTime = lastTime
        itemInfo.endTime = curTime
        itemInfo.color = 'yellow'
        frameSplitInfo.push(itemInfo)
        lastTime = curTime
      } else {
        console.log('i frame skip', curTime, lastTime)
      }
    }
  }
  if (lastTime !== 0.0) {
    const itemInfo = util.makeSplitInfo()
    itemInfo.startTime = lastTime
    itemInfo.endTime = appStore?.curVideoInfo?.mediaInfo?.duration || 0
    itemInfo.color = 'yellow'
    frameSplitInfo.push(itemInfo)
  }
  util.splitInfoCorrect(frameSplitInfo, appStore?.curVideoInfo?.mediaInfo?.duration || 0)
  return frameSplitInfo
}

async function getKeyFrameInfo(ipcAPi: IpcApi): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
  let resp: DataTypes.Resp<DataTypes.FrameInfo> = { code: 0, status: 'success' }
  if (appStore?.curSltVideo === null || appStore?.curVideoInfo?.mediaInfo === null) {
    MessageShow.info('没有选择视频文件')
    resp = { code: 1, status: 'no video selected' }
    return resp
  }
  const req: DataTypes.Req<DataTypes.Req_FrameInfo> = {
    cmd: 'get_key_frame_info',
    data: {
      filepath: appStore?.curSltVideo?.filePath
    }
  }
  if (appStore?.curVideoInfo?.frameInfo === null) {
    resp = await ipcAPi.trigger_event(req)
    return resp
  }
  return resp
}

/*
{
  clearModel: "changeToThumbnail",
}
*/
function clear_cur_slt_video_info(req: DataTypes.ClearSltInfoReq | null): void {
  function clear_videoPlayCtrl(): void {
    if (appStore) {
      appStore.videoPlayCtrl.curSrc = ''
      appStore.videoPlayCtrl.curTime = 0
      appStore.videoPlayCtrl.videoStartTime = 0
      appStore.videoPlayCtrl.isPlay = false
      if (appStore.curVideoInfo?.mediaInfo?.duration !== undefined) {
        appStore.curVideoInfo.mediaInfo.duration = 0
      }
      appStore.videoPlayCtrl.playbackRate = 1.0
    }
  }

  // 有条件的清除
  if (req != null) {
    if (req.clearModel === 'changeToThumbnail') {
      const tmpDuration = appStore?.curVideoInfo?.mediaInfo?.duration
      clear_videoPlayCtrl()
      if (appStore?.curVideoInfo?.mediaInfo?.duration !== undefined) {
        appStore.curVideoInfo.mediaInfo.duration = tmpDuration || 0
      }
      if (appStore) {
        appStore.barSeekTime = 0
      }
      return
    }
  }

  // 全部清除
  clear_videoPlayCtrl()
  if (appStore) {
    appStore.curVideoInfo = null
    appStore.barColorCfg = []
    if (appStore.curVideoInfo !== null) {
      appStore.curVideoInfo['frameInfo'] = null
    }
    appStore.bShowKeyFrameInfo = false
    appStore.barSeekTime = 0
  }
}

function folder_file_proc(resp: DataTypes.Resp<DataTypes.TraversalFolder>): void {
  if (resp.code !== 0) {
    MessageShow.error(`打开文件夹失败: ${resp.status}`)
    return
  }
  if (resp.bOver == false) {
    MessageShow.info(`正在处理...`)
    return
  }
  if (resp.data == null) {
    MessageShow.error(`打开文件夹失败: ${resp.status}`)
    return
  }
  const respData: DataTypes.TraversalFolder = resp.data
  const files = respData.files
  if (files === undefined) {
    return
  }
  for (let i = 0; i < files.length; i++) {
    files[i].src = `file://${files[i].filePath}`
  }
  appStore.videoList = files
  appStore.curOpenedFolder = respData.folder || ''
}

function process_work_response(workRespose: DataTypes.WorkResp): void {
  const cmd = workRespose.cmd

  const response = JSON.parse(workRespose.data)
  const showCtx = `命令:${cmd} 执行结果: ${response.status}`
  if (response.code !== 0) {
    MessageShow.error(showCtx)
  } else {
    MessageShow.success(showCtx)
  }

  // console.log('process_work_response', cmd, response)
  switch (cmd) {
    case 'open_folder':
      console.log('open folder', response)
      util.folder_file_proc(response)
      break
    case 'query_video':
      if (appStore) {
        // appStore.queryInfo = response.data
      }
      break
    case 'cut_video':
      if (response.code !== 0) {
        MessageShow.error(`视频裁剪失败: ${response.status}`)
      } else {
        MessageShow.info(`视频裁剪完成:${response.status}`)
      }
      break
    case 'get_key_frame_info':
      if (response.code !== 0) {
        MessageShow.error(`获取关键帧信息失败: ${response.status}`)
      } else {
        if (appStore) {
          appStore.curVideoInfo = appStore.curVideoInfo || {}
          appStore.curVideoInfo.frameInfo = response.data
        }
        MessageShow.info(`获取关键帧信息完成:${response.status}`)
      }
      break
  }
}

function processVideoEvent(events: DataTypes.FileEventInfo[][]): void {
  const videoEvent = events
  const colorSegments: { startTime: number; endTime: number; color: string }[] = []
  let startTime = 0
  const barBaseColor = '#555'
  let lastColor = barBaseColor

  let eventInTimePoint: { area: number; time: number; distance: number }[] = []
  for (const event of videoEvent) {
    if (event.length === 0) {
      continue
    }
    let maxEvent = event[0]
    for (let i = 0; i < event.length; i++) {
      const e = event[i]
      if (e.distance > maxEvent.distance) {
        maxEvent = e
      }
    }
    eventInTimePoint.push(maxEvent)
  }

  // 去掉eventInTimePoint中面积小的event
  eventInTimePoint = eventInTimePoint.filter((e) => {
    return e.area > 2000
  })

  let color = barBaseColor
  for (const event of eventInTimePoint) {
    const e = event
    if (e.area < 2000) {
      continue
    }
    const t = e.time
    const dis = e.distance
    color = barBaseColor
    if (dis > 100) {
      color = 'purple'
    } else if (dis > 50) {
      color = 'yellow'
    } else if (dis > 20) {
      color = 'blue'
    } else if (dis > 10) {
      color = 'green'
    } else if (dis > 5) {
      color = 'pink'
    } else if (dis > 2) {
      color = 'orange'
    } else if (dis > 1) {
      color = '#555555'
    } else {
      color = barBaseColor
    }
    if (color !== lastColor) {
      colorSegments.push({ startTime: startTime, endTime: t, color: lastColor })
      startTime = t
      lastColor = color
    }
  }
  colorSegments.push({ startTime: startTime, endTime: Infinity, color: lastColor })
  if (appStore) {
    appStore.barColorCfg = colorSegments
  }
}

function processSplitInfo(): void {
  if (appStore?.curVideoInfo?.splitInfo !== null) {
    // 从后台已经获取到了信息，就不用再处理了
    return
  }
  // 如果后台没有标记信息，就需要把完整的视频分段添加到splitInfo中
  const duration = appStore?.curVideoInfo?.mediaInfo?.duration || 0
  const itemInfo = util.makeSplitInfo()
  itemInfo.endTime = duration
  itemInfo.duration = duration
  itemInfo.percent = 100
  itemInfo.frameNum = util.calculateCurFrameIdx(duration)
  if (appStore?.curVideoInfo?.splitInfo === null) {
    if (appStore?.curVideoInfo) {
      appStore.curVideoInfo.splitInfo = []
    }
  }
  if (appStore?.curVideoInfo?.splitInfo) {
    appStore.curVideoInfo.splitInfo.push(itemInfo)
    appStore.curVideoInfo.splitInfo.sort((a, b) => a.percent - b.percent)
  }
}

async function get_slt_video(ipcAPi: IpcApi, video: DataTypes.FileInfo | null): Promise<void> {
  if (video == null) {
    return
  }
  console.log('slect video', video)
  const req: DataTypes.Req<DataTypes.Req_SltFile> = {
    cmd: 'slt_video',
    data: {
      filepath: video.filePath
    }
  }
  const response: DataTypes.Resp<DataTypes.SltMediaInfo> = await ipcAPi.trigger_event(req)
  if (response.code !== 0) {
    console.log('slect video failed')
  } else {
    const respData: DataTypes.SltMediaInfo | undefined = response.data
    if (respData == undefined) {
      MessageShow.error(`获取视频信息失败: ${response.status}`)
      return
    }
    appStore.curVideoInfo = response.data
    if (respData.eventInfo != null) {
      util.processVideoEvent(respData.eventInfo?.events)
    }
    util.processSplitInfo()
  }
}

// 把秒数字转换成为年月日时分秒
const formatSecond2Time = (timeSec: number): string => {
  const hours = Math.floor(timeSec / 3600)
  const minutes = Math.floor((timeSec % 3600) / 60)
  const seconds = Math.floor(timeSec % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

async function make_prj_info(): Promise<DataTypes.Req_CutVideo | null> {
  if (appStore?.curVideoInfo === null) {
    MessageShow.success(`当前没有选择视频文件`)
    return null
  }
  const prjInfo: DataTypes.Req_CutVideo = {
    fileInfo: appStore.curVideoInfo,
    filepath: appStore.curSltVideo?.filePath || '',
    filename: util.getFilenameFromPath(appStore.curSltVideo?.filePath || '')
  }
  return prjInfo
}

const save_project = async (ipcAPi: IpcApi): Promise<void> => {
  const prjInfo: DataTypes.Req_CutVideo | null = await util.make_prj_info()
  if (prjInfo == null) {
    MessageShow.success(`当前没有选择视频文件`)
    return
  }
  const req: DataTypes.Req<DataTypes.Req_CutVideo> = {
    cmd: 'save_prj',
    data: prjInfo
  }
  const response = await ipcAPi.trigger_event(req)
  if (response.code !== 0) {
    MessageShow.success(`保存失败: ${response.status}`)
  } else {
    MessageShow.success(`保存成功`)
  }
}

// function process_heartbeat(response: {
//   code: number
//   data: {
//     time: string
//     appStatus: string
//     workRespose?: { cmd: string; data: { code: number; status: string } }[]
//   }
// }): void {

function process_heartbeat(resp: DataTypes.Resp<DataTypes.HeartBeat>): void {
  if (resp.code !== 0) {
    console.log('process_heartbeat failed', resp)
    return
  }
  if (resp.data === undefined) {
    console.log('process_heartbeat failed', resp)
    return
  }
  const respData: DataTypes.HeartBeat = resp.data
  const curTime = respData.time
  const appStatus = respData.appStatus
  if (appStore) {
    appStore.documentTitle = `${curTime} ${appStatus != null ? appStatus : ''}`
  }
  if (respData.workRespose != null) {
    if (respData.workRespose.length > 0) {
      console.log('process_heartbeat', respData.workRespose)
    }
    for (const item of respData.workRespose) {
      util.process_work_response(item)
    }
  }
}

class Util {
  updateKeyframeSplitInfo = updateKeyframeSplitInfo
  process_heartbeat = process_heartbeat
  save_project = save_project
  formatSecond2Time = formatSecond2Time
  get_slt_video = get_slt_video
  processSplitInfo = processSplitInfo
  processVideoEvent = processVideoEvent
  process_work_response = process_work_response
  folder_file_proc = folder_file_proc
  getKeyFrameInfo = getKeyFrameInfo
  clear_cur_slt_video_info = clear_cur_slt_video_info
  make_prj_info = make_prj_info

  calculateCurFrameIdx(curTime: number): number {
    if (appStore?.curVideoInfo === null) return 0
    if (appStore?.curVideoInfo?.mediaInfo === null) return 0
    const frameRate = appStore.curVideoInfo.mediaInfo.video.frame_rate
    const frame = Math.floor(curTime * frameRate)
    return frame
  }

  formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time - Math.floor(time)) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }

  getFilenameFromPath(filePath: string | null | undefined): string {
    if (filePath == null || filePath === '') return ''
    const parts = filePath.split(/[\\/]/)
    const fileName = parts[parts.length - 1]
    return fileName
  }

  makeSplitInfo(): DataTypes.SplitInfo {
    // 进度条的分段信息，黄色表示是关键帧
    const sqlitInfo: DataTypes.SplitInfo = {
      startTime: 0,
      endTime: 0,
      duration: 0,
      percent: 0,
      color: 'green', //yellow
      currentTime: 0,
      isDelete: false,
      frameIdx: 0,
      frameNum: 0
    }
    return sqlitInfo
  }

  splitInfoCorrect(splitInfos: DataTypes.SplitInfo[], videoDuration: number): void {
    // 把开始时间，结束时间，颜色确定后，再矫正一些关键信息
    for (let i = 0; i < splitInfos.length; i++) {
      const splitInfo = splitInfos[i]
      splitInfo.currentTime = splitInfo.startTime
      splitInfo.percent = (splitInfo.startTime / videoDuration) * 100
      splitInfo.duration = splitInfo.endTime - splitInfo.startTime
      splitInfo.frameIdx = util.calculateCurFrameIdx(splitInfo.startTime)
      splitInfo.frameNum = util.calculateCurFrameIdx(splitInfo.duration)
    }
    splitInfos.sort((a, b) => a.percent - b.percent)
  }

  setAppStore(store: AppStore): void {
    appStore = store
  }
}

const util = new Util()
export default util
