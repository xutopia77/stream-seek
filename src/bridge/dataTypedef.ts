export interface SplitInfo {
  startTime: number
  endTime: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
  duration: number // 原数据中为字符串，这里统一为数字类型，若需要字符串类型可修改
  percent: number
  color: string
  currentTime: number
  isDelete: boolean
  frameIdx: number
  frameNum: number
}

export interface BarClip {
  percent: number
  width: number
  color: string
  tip: string
}

export interface FileEventInfo {
  time: number
  area: number
  x: number
  y: number
  width: number
  height: number
  center_x: number
  center_y: number
  distance: number
  object_id: number
}

export interface MediaInfo {
  nb_streams: number
  duration: number
  size: number
  start_time: number
  bit_rate: number
  video: {
    codec_name: string
    codec_type: string
    width: number
    height: number
    pix_fmt: string
    bit_rate: number
    frame_rate: number
    nb_frames: number
  }
  audio: {
    codec_name: string
    codec_type: string
    sample_rate: number
    channels: number
    bit_rate: number
    channel_layout: string
  }
}

export interface SltMediaInfo {
  mediaInfo?: MediaInfo
  eventInfo?: {
    start_time: string
    end_time: string
    execution_time: number
    file_name: string
    events: FileEventInfo[][]
  }
  splitInfo?: SplitInfo[]
  frameInfo?: FrameInfo
  thumbnail?: FileInfo[]
  // keyFrameSplitInfo?: any[]
}

export interface SltMedia {
  title: string
  src: string
  size: number
  birthtime: string
  mtime: string
  filePath: string
}

export interface MediaItem {
  title: string
  src: string
  size: number
  birthtime: string
  mtime: string
  filePath: string
}

export interface Prj {
  name: string
  version: string
  lastOpenedFolder?: string
}

export interface Resp_Prj {
  code: number
  status: string
  data?: {
    prj?: Prj
  }
}

export interface WorkResp {
  cmd: string
  data: string
}

export interface HeartBeat {
  time: string
  appStatus: string
  workRespose?: WorkResp[]
}

export interface Req_TraversalFolder {
  folder: string
  type?: string
  startTime?: string //2025-03-25 12:00:00
  endTime?: string //2025-03-25 12:59:59
}

export interface TraversalFolder {
  folder?: string
  files?: FileInfo[]
}

export interface Req_CutVideo {
  fileInfo: SltMediaInfo
  filepath: string
  filename: string
  baseFolder: string
}

export interface Resp_CutVideo {
  traversalResp?: Resp<TraversalFolder>
}

export interface Frame {
  pict_type: string
  pts_time: number
}

export interface FrameInfo {
  frames: Frame[]
}

export interface Req_FrameInfo {
  filepath: string
}

export interface FileInfo {
  title: string
  filePath: string //文件的路径，由后端赋值
  src: string // 文件的url由前端组装
  size: number
  birthtime: string
  mtime: string
}

export interface Req_SltFile {
  filepath: string
}

export interface Req_SearchFile {
  folder: string
}

export interface Req_ClearWork {
  files?: FileInfo[]
}
export interface Req_SyncWork {
  folder: string
}

// ======================== render
export class ClearSltInfoReq {
  clearModel?: string
  bNotClear_curSltVideo?: boolean
}

// ========================
export class Resp<T = string> {
  code: number
  status: string
  bOver?: boolean
  data?: T

  constructor() {
    this.code = 0
    this.status = 'success'
    this.bOver = undefined
    this.data = undefined
  }
  err(desc: string): Resp<T> {
    this.code = 1
    this.status = desc
    return this
  }
  success(desc: string): Resp<T> {
    this.code = 0
    this.status = desc
    return this
  }
}

export interface Req<T = string> {
  cmd: string
  data?: T
}

// ======================== tools

// 定义解析文件名后的返回类型
interface ParsedFilename {
  sequence: string
  startTime: string
  endTime: string
}

export class FileTools {
  // 将秒数转换为特定格式的时间字符串 20250323140336
  static parsetimeToTimeStr(time: number): string {
    // 将秒数转换为 Date 对象
    const date = new Date(time * 1000)

    // 提取年、月、日、时、分、秒并格式化为两位数字
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')

    // 组合成 20250323140336 格式的字符串
    const picTimeStr = `${year}${month}${day}${hour}${minute}${second}`
    return picTimeStr
  }
  // 解析文件名，提取序号、开始时间和结束时间
  static parse_filename_mi(title: string | null): ParsedFilename | null {
    if (title == null) {
      return null
    }
    const [sequence, startTime, endTimeWithExtension] = title.split('_')
    if (endTimeWithExtension === undefined) {
      return null
    }
    const endTime = endTimeWithExtension.replace('.mp4', '')
    return {
      sequence,
      startTime,
      endTime
    }
  }
  // 将时间字符串转换为秒数
  static parse_timestr_2_seconds(timeStr: string): number {
    const year = parseInt(timeStr.slice(0, 4), 10)
    const month = parseInt(timeStr.slice(4, 6), 10) - 1 // 月份从0开始
    const day = parseInt(timeStr.slice(6, 8), 10)
    const hour = parseInt(timeStr.slice(8, 10), 10)
    const minute = parseInt(timeStr.slice(10, 12), 10)
    const second = parseInt(timeStr.slice(12, 14), 10)
    return new Date(year, month, day, hour, minute, second).getTime() / 1000
  }
  // 将秒数转换为时间字符串
  static parse_seconds_2_timestr(seconds: number): string {
    const date = new Date(seconds * 1000) // 将秒转换为毫秒
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const secs = String(date.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}${hours}${minutes}${secs}`
  }
}
