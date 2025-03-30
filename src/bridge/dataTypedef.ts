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
export interface SltMediaInfo {
  mediaInfo?: {
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
  eventInfo?: {
    start_time: string
    end_time: string
    execution_time: number
    file_name: string
    events: FileEventInfo[][]
  }
  splitInfo?: SplitInfo[]
  frameInfo?: FrameInfo
  thumbnail?: {
    filepath: string
    time: string
    indexTime: number
  }[]
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
}

export interface TraversalFolder {
  folder?: string
  files?: FileInfo[]
}

export interface Req_CutVideo {
  fileInfo: SltMediaInfo
  filepath: string
  filename: string
}

export interface FrameInfo {
  frames: {
    pict_type: string
    pts_time: number
  }[]
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

// ======================== render
export interface ClearSltInfoReq {
  clearModel?: string
}

export interface BarColorCfg {
  startTime: number
  endTime: number
  color: string
}


// ========================
export interface Resp<T = string> {
  code: number
  status: string
  bOver?: boolean
  data?: T
}

export interface Req<T = string> {
  cmd: string
  data?: T
}

