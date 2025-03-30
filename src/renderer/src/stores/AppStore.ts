import { defineStore } from 'pinia'

import * as DataTypes from '../../../bridge/dataTypedef'

type AppStore = {
  prj: DataTypes.Prj
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
  videoList: MediaItem[]
  curSltVideo: DataTypes.FileInfo | null
  curVideoInfo: DataTypes.SltMediaInfo | null
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
