import { defineStore } from 'pinia'

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

type AppStore = {
  prj: {
    name: string
    version: string
    lastOpenedFolder: string
  }
  serverUrlPrefix: string
  curOpenedFolder: string
  videoPlayCtrl: {
    curSrc: string | null
    curTime: number
    videoStartTime: number
    isPlay: boolean
    playbackRate: number
  }
  curViewModel: 'video' | 'thumbnail'
  func_nextFrame: (() => void) | null
  func_prevFrame: (() => void) | null
  rightPanel: 'list' | 'workPanel'
  videoList: {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
  }[]
  curSltVideo: {
    title: string
    src: string
    size: number
    birthtime: string
    mtime: string
    filePath: string
  } | null
  curVideoInfo: {
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
      events: {
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
      }[][]
    }
    splitInfo?: SplitInfo[]
    frameInfo?: {
      frames: {
        pict_type: string
        pts_time: number
      }[]
    }
    thumbnail: {
      filepath: string
      time: string
      indexTime: number
    }[]
    // keyFrameSplitInfo?: any[]
  } | null
  barColorCfg: {
    startTime: number
    endTime: number
    color: string
  }[]
  //   videoSplitInfo: any[]
  bShowKeyFrameInfo: boolean
  barSeekTime: number
  documentTitle: string

  thumbSeekTime: number
  //   queryInfo: null
  queryCtrl: {
    displayOption: 'single' | 'daily'
  }
}

export const useAppStore = defineStore('app', {
  state: (): AppStore => ({
    prj: {
      name: 'AppStore',
      version: '1.0.0',
      lastOpenedFolder: ''
    },
    // utils
    // serverUrlPrefix: "http://localhost:38080",
    serverUrlPrefix: '',
    curOpenedFolder: '',
    // video play
    videoPlayCtrl: {
      curSrc: null, // 当前播放视频地址
      curTime: 0, // 当前播放时间
      videoStartTime: 0, // 播放开始的时间
      isPlay: false, // 播放状态
      playbackRate: 1 // 播放速率
    },
    curViewModel: 'video', //当前视图模式 video, thumbnail
    func_nextFrame: null,
    func_prevFrame: null,
    // ------
    rightPanel: 'list', //list, workPanel
    videoList: [],
    curSltVideo: null, // 当前选中的视频
    curVideoInfo: null, // 当前选中的视频信息
    // progress bar
    barColorCfg: [
      { startTime: 0, endTime: 10, color: 'green' },
      { startTime: 10, endTime: 20, color: '#555' },
      { startTime: 20, endTime: 30, color: 'orange' },
      { startTime: 30, endTime: Infinity, color: 'red' }
    ],
    // ------ 视频切分信息
    // videoSplitInfo: [],
    bShowKeyFrameInfo: false, // 是否显示关键帧信息
    barSeekTime: 0, // 进度条拖动时间
    // document
    documentTitle: '',
    // thumbnail
    // thumbnailImages: [], // 缩略图列表
    thumbSeekTime: 0, // 缩略图拖动时间
    // admin
    // queryInfo: null,
    queryCtrl: {
      displayOption: 'daily' //single, daily
    }
  }),
  actions: {
    setData(key: string, value: string): void {
      console.log(`setData: ${key} = ${value}`)
      // this[key] = value
    }
  }
})
