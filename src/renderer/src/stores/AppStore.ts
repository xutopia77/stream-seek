import { defineStore } from 'pinia'

import * as Dty from '../../../bridge/dataTypedef'

export interface ToastMessage {
    id: number
    message: string
    type: Dty.MessageShowType
    timestamp: number // 添加时间戳
}

export type AppStore = {
    appInfo: Dty.AppInfo
    prj: Dty.Prj
    serverUrlPrefix: string
    curWorks: Dty.WorkResp[]

    // ------ message toast
    bPageResentMsg: boolean // 打开界面 最近消息
    toasts: ToastMessage[]
    historyToasts: ToastMessage[]
    // ------
    homeNavContent: string
    // ------
    videoPlayCtrl: {
        curSrc: string // 当前播放视频地址
        curTime: number // 浮点数，秒 只读参数
        videoStartTime: number //视频文件的开始时间可能不是从0开始的，所以需要记录一下
        isPlay: boolean
        isStop: boolean
        playbackRate: number
    }
    curViewModel: 'video' | 'thumbnail'
    func_nextFrame: (() => void) | null
    func_prevFrame: (() => void) | null
    func_get_ele_video: (() => HTMLVideoElement | null) | null
    rightPanel: Dty.WorkPanel
    fileSearchPage: number
    fileSearchPageSize: number
    videoTotalNum: number
    thumbTotalNum: number

    thumbList: Dty.File[]
    curSltThumb: Dty.File | null
    curChkThumb: Set<Dty.File>
    videoList: Dty.File[]
    curCheckedVideo: Set<Dty.File>
    curSltVideo: Dty.File | null // 在列表中，鼠标选中后，更新
    curSltVideoName4Play: string // 当前选中视频的名称，在videoPreview中watch然后，更新播放状态使用，其他地方不要用这个变量
    // curVideoInfo: Dty.File | null // 根据 鼠标选中的视频，从后台获取信息，更新此信息
    //   videoSplitInfo: any[]
    bShowKeyFrameInfo: boolean
    barSeekTime: number
    documentTitle: string
    thumbSeekTime: number
    //   queryInfo: null
    queryCtrl: {
        displayOption: 'single' | 'daily'
    }
    // ------
    tags: Dty.Tag[]
    // ================
    barColorDictionary: ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
}

export const useAppStore = defineStore('app', {
    state: (): AppStore => ({
        appInfo: new Dty.AppInfo(),
        prj: new Dty.Prj(),
        // utils
        // serverUrlPrefix: "http://localhost:38080",
        serverUrlPrefix: '',
        curWorks: [],

        // ------ message toast
        bPageResentMsg: false,
        toasts: [],
        historyToasts: [],
        // ------
        homeNavContent: '',
        // video play
        videoPlayCtrl: {
            curSrc: '', // 当前播放视频地址
            curTime: 0, // 当前播放时间
            videoStartTime: 0, // 播放开始的时间
            isPlay: false, // 播放状态
            playbackRate: 1, // 播放速率
            isStop: false
        },
        curViewModel: 'video', //当前视图模式 video, thumbnail
        func_nextFrame: null,
        func_prevFrame: null,
        func_get_ele_video: null,
        // ------
        rightPanel: Dty.WorkPanel.List,
        fileSearchPage: 1,
        fileSearchPageSize: 10,
        videoTotalNum: 0,
        thumbTotalNum: 0,
        thumbList: [],
        curSltThumb: null,
        curChkThumb: new Set<Dty.File>(), // 当前选中的缩略图文件列表
        videoList: [],
        curCheckedVideo: new Set<Dty.File>(), // 当前选中的视频列表
        curSltVideo: null, // 当前选中的视频
        curSltVideoName4Play: '', // 当前选中视频的名称，在videoPreview中watch然后，更新播放状态使用，其他地方不要用这个变量
        // curVideoInfo: null, // 当前选中的视频信息
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
        },
        // ------
        tags: [],
        // ==============
        barColorDictionary: ['#FF5733', '#33FF57', '#5733FF', '#FF33E0', '#33E0FF']
    }),
    actions: {
        setData(key: string, value: string): void {
            console.log(`setData: ${key} = ${value}`)
            // this[key] = value
        }
    }
})
