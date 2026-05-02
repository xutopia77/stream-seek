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
    prj: Dty.Prj | null
    recentFiles: Dty.RecentItem[]
    recentProjects: Dty.RecentItem[]
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
        curSrc: string // current video source url
        curTime: number // float, seconds, read-only
        videoStartTime: number // video file may not start from 0
        isPlay: boolean
        isStop: boolean
        playbackRate: number
        volume: number // 0-1
        muted: boolean
    }
    curViewModel: 'video' | 'thumbnail'
    func_nextFrame: (() => void) | null
    func_prevFrame: (() => void) | null
    func_get_ele_video: (() => HTMLVideoElement | null) | null
    rightPanel: Dty.WorkPanel
    fileSearchPage: number
    fileSearchPageSize: number
    fileSearchStatus: Dty.Fstatus
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
    thumbnailCardSize: number // columns per row: 2-8
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
        prj: null,
        recentFiles: [],
        recentProjects: [],
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
            curSrc: '', // current video source url
            curTime: 0, // current playback time
            videoStartTime: 0, // playback start time
            isPlay: false, // play status
            playbackRate: 1, // playback rate
            isStop: false,
            volume: 1, // volume 0-1
            muted: false // mute status
        },
        curViewModel: 'video', //当前视图模式 video, thumbnail
        func_nextFrame: null,
        func_prevFrame: null,
        func_get_ele_video: null,
        // ------
        rightPanel: Dty.WorkPanel.List,
        fileSearchPage: 1,
        fileSearchPageSize: 100,
        fileSearchStatus: Dty.Fstatus.Normal,
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
        thumbnailCardSize: 4, // default 4 columns per row
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
    getters: {
        isProjectMode: (state): boolean => {
            return state.appInfo.prjFile !== ''
        }
    },
    actions: {
        setData(key: string, value: string): void {
            console.log(`setData: ${key} = ${value}`)
            // this[key] = value
        }
    }
})
