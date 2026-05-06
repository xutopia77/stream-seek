import { defineStore } from 'pinia'

import * as Dty from '../../../bridge/dataTypedef'

export interface ToastMessage {
    id: number
    message: string
    type: Dty.MessageShowType
    timestamp: number // Add timestamp
}

export type AppStore = {
    appInfo: Dty.AppInfo
    prj: Dty.Prj | null
    clipProject: Dty.ClipProject | null
    recentFiles: Dty.RecentItem[]
    recentProjects: Dty.RecentItem[]
    serverUrlPrefix: string
    curWorks: Dty.WorkResp[]

    // ------ message toast
    bPageResentMsg: boolean // Open page recent messages
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
    fileSearchOrderBy: 'name' | 'startTimeSec' | 'endTimeSec' | 'size' | 'duration'
    fileSearchOrder: 'asc' | 'desc'
    videoTotalNum: number
    thumbTotalNum: number

    thumbList: Dty.File[]
    curSltThumb: Dty.File | null
    curChkThumb: Set<Dty.File>
    videoList: Dty.File[]
    curCheckedVideo: Set<Dty.File>
    curSltVideo: Dty.File | null // Updated when mouse selects in list
    curSltVideoName4Play: string // Name of currently selected video, watched in videoPreview to update playback status, don't use elsewhere
    // curVideoInfo: Dty.File | null // Get info from backend based on selected video
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
        clipProject: null,
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
        curViewModel: 'video', // Current view mode video, thumbnail
        func_nextFrame: null,
        func_prevFrame: null,
        func_get_ele_video: null,
        // ------
        rightPanel: Dty.WorkPanel.List,
        fileSearchPage: 1,
        fileSearchPageSize: 100,
        fileSearchStatus: Dty.Fstatus.Normal,
        fileSearchOrderBy: 'startTimeSec',
        fileSearchOrder: 'desc',
        videoTotalNum: 0,
        thumbTotalNum: 0,
        thumbList: [],
        curSltThumb: null,
        curChkThumb: new Set<Dty.File>(), // Currently selected thumbnail file list
        videoList: [],
        curCheckedVideo: new Set<Dty.File>(), // Currently selected video list
        curSltVideo: null, // Currently selected video
        curSltVideoName4Play: '', // Currently selected video name, used in videoPreview watch to update play status, do not use this variable elsewhere
        // curVideoInfo: null, // Currently selected video info
        // ------ Video split info
        // videoSplitInfo: [],
        bShowKeyFrameInfo: false, // Whether to show keyframe info
        barSeekTime: 0, // Progress bar drag time
        // document
        documentTitle: '',
        // thumbnail
        // thumbnailImages: [], // Thumbnail list
        thumbSeekTime: 0, // Thumbnail drag time
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
