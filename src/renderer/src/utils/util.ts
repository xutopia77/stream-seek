import type { AppStore } from '../stores/AppStore'
let appStore: AppStore

import * as Dty from '../../../bridge/dataTypedef'
import { IpcApi } from './ipcApi'

// 创建一个可以在Vue组件中使用的国际化函数
let t: (key: string, values?: Record<string, unknown>) => string = (key: string) => key

// 设置国际化函数，由Vue组件调用
export function setI18nFunction(
    i18nFunction: (key: string, values?: Record<string, unknown>) => string
): void {
    t = i18nFunction
}

async function getKeyFrameInfo(): Promise<Dty.Resp<Dty.FrameInfo>> {
    const resp = new Dty.Resp<Dty.FrameInfo>()
    if (appStore?.curSltVideo === null || appStore?.curSltVideo?.mediaInfo === null) {
        return resp.err('no video selected')
    }
    const req: Dty.Req<Dty.Req_FrameInfo> = {
        cmd: Dty.CmdType.get_key_frame_info,
        data: {
            filepath: appStore?.curSltVideo?.path
        }
    }
    if (
        appStore?.curSltVideo?.frameInfo == null ||
        (typeof appStore?.curSltVideo?.frameInfo === 'object' &&
            Object.keys(appStore?.curSltVideo?.frameInfo).length === 0)
    ) {
        return await IpcApi.trigger_event(req)
    }
    return resp
}

function folder_file_proc(resp: Dty.Resp<Dty.TraversalFolder>): void {
    if (resp.code !== 0) {
        util.addToastErr(`${t('util.openFolderFailed')}: ${resp.status}`)
        return
    }
    if (resp.bOver == false) {
        util.addToastInfo(t('util.processing'))
        return
    }
    if (resp.data == null) {
        util.addToastErr(`${t('util.openFolderFailed')}: ${resp.status}`)
        return
    }
    const respData: Dty.TraversalFolder = resp.data
    const files = respData.files
    if (files === undefined) {
        return
    }
    // for (let i = 0; i < files.length; i++) {
    //   files[i].src = `file://${files[i].filePath}`
    // }
    appStore.videoList = files
}

function processVideoEvent(videoEvent: Dty.FileEventInfo[][]): void {
    const colorSegments: { startTime: number; endTime: number; color: string }[] = []
    let startTime = 0
    const barBaseColor = '#555'
    let lastColor = barBaseColor

    let eventInTimePoint: Dty.FileEventInfo[] = []
    // 首先把二维数组中每个数组的最大值取出来，变成一维数组
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
    // [todo] 事件的数据暂时不处理
}

// 把秒数字转换成为年月日时分秒
const formatSecond2Time = (timeSec: number): string => {
    const hours = Math.floor(timeSec / 3600)
    const minutes = Math.floor((timeSec % 3600) / 60)
    const seconds = Math.floor(timeSec % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

async function make_prj_info(): Promise<Dty.Req_CutVideo | null> {
    if (appStore?.curSltVideo === null) {
        util.addToastInfo(t('util.noVideoFileSelected'))
        return null
    }
    const videoPath = appStore.curSltVideo?.path || ''
    const lastSepIndex = Math.max(videoPath.lastIndexOf('/'), videoPath.lastIndexOf('\\'))
    const baseFolder = lastSepIndex > 0 ? videoPath.substring(0, lastSepIndex) : ''
    const prjInfo: Dty.Req_CutVideo = {
        fileInfo: appStore.curSltVideo,
        filepath: videoPath,
        filename: util.getFilenameFromPath(videoPath),
        baseFolder: baseFolder
    }
    return prjInfo
}

function calculateCurFrameIdx(curTime: number): number {
    if (appStore?.curSltVideo === null) return 0
    if (appStore?.curSltVideo?.mediaInfo === null) return 0
    const frameRate = appStore.curSltVideo?.mediaInfo?.video.frame_rate
    if (frameRate === undefined) return 0
    const frame = Math.floor(curTime * frameRate)
    return frame
}

const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time - Math.floor(time)) * 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

function splitInfoCorrect(splitInfos: Dty.SplitInfo[], videoDuration: number): void {
    // 把开始时间，结束时间，颜色确定后，再矫正一些关键信息
    for (let i = 0; i < splitInfos.length; i++) {
        const splitInfo = splitInfos[i]
        splitInfo.currentTime = splitInfo.startTime
        splitInfo.percent = (splitInfo.startTime / videoDuration) * 100
        splitInfo.duration = splitInfo.endTime - splitInfo.startTime
        splitInfo.frameIdx = util.calculateCurFrameIdx(splitInfo.startTime)
        splitInfo.frameNum = util.calculateCurFrameIdx(splitInfo.duration)
        // splitInfo.color = colors[i % colors.length]
    }
    splitInfos.sort((a, b) => a.percent - b.percent)
}

function stop_play(bClearCurSltVideo: boolean = true): void {
    if (appStore.videoPlayCtrl.isPlay == false && appStore.videoPlayCtrl.isStop == true) {
        return
    }
    console.log('stop_play')
    if (bClearCurSltVideo) {
        util.clear_cur_slt_video_info(null)
    } else {
        const clearReq = new Dty.ClearSltInfoReq()
        clearReq.bNotClear_curSltVideo = true
        util.clear_cur_slt_video_info(clearReq)
    }
}

export class PlayReq {
    src: string
    playStartTimeSec?: number
    onPlayCbk?: () => void
    beforePlayCbk?: () => void
    constructor(src: string) {
        this.src = src
    }
}

// 封装视频事件监听函数
function setupVideoEventListeners(videoRef: HTMLVideoElement, bRemoveEvent: boolean = false): void {
    // 监听视频加载元数据事件，获取视频总时长
    const onLoadedMetadata = (): void => {
        appStore.videoPlayCtrl.videoStartTime = 0
    }
    videoRef.addEventListener('loadedmetadata', onLoadedMetadata)

    // 监听视频时间更新事件，更新当前播放时间
    const onTimeUpdate = (): void => {
        if (videoRef != null) {
            // if (appStore.videoPlayCtrl.videoStartTime == 0) {
            //   appStore.videoPlayCtrl.videoStartTime = videoRef.currentTime
            // }
            // 减去起始时间，得到从视频起始点开始的播放时间
            appStore.videoPlayCtrl.curTime =
                videoRef.currentTime - appStore.videoPlayCtrl.videoStartTime
        }
    }
    videoRef.addEventListener('timeupdate', onTimeUpdate)

    // Listen for video play events and update the playback status
    const onPlay = (): void => {
        console.log(`on play ${videoRef.currentTime}`)
        appStore.videoPlayCtrl.isPlay = true
    }
    videoRef.addEventListener('play', onPlay)

    // Listen for video pause events and update the playback status
    const onPause = (): void => {
        appStore.videoPlayCtrl.isPlay = false
    }
    videoRef.addEventListener('pause', onPause)

    if (bRemoveEvent) {
        videoRef.removeEventListener('loadedmetadata', onLoadedMetadata)
        videoRef.removeEventListener('timeupdate', onTimeUpdate)
        videoRef.removeEventListener('play', onPlay)
        videoRef.removeEventListener('pause', onPause)
    }
}

function set_video_cur_time(videoRef: HTMLVideoElement, curTime: number): void {
    if (videoRef == null) {
        console.log('video ref null')
        return
    }
    console.log(`set video cur time ${curTime}`)
    videoRef.currentTime = curTime + appStore.videoPlayCtrl.videoStartTime
}

function play_video(videoRef: HTMLVideoElement, req: PlayReq): void {
    if (videoRef == null) {
        console.log('video ref null')
        return
    }
    if (appStore.curViewModel != 'video') {
        return
    }
    videoRef.pause()
    appStore.videoPlayCtrl.curSrc = req.src
    videoRef.load()

    setupVideoEventListeners(videoRef, true)
    // 监听 canplay 事件
    const onCanPlay = (): void => {
        if (videoRef == null) {
            util.addToastErr('video ref null')
            return
        }
        appStore.videoPlayCtrl.curTime = 0
        if (videoRef.duration != appStore.curSltVideo?.mediaInfo?.duration) {
            console.log(
                `video duration not equal appStore.duration: ${videoRef.duration} != ${appStore.curSltVideo?.mediaInfo?.duration}`
            )
        }
        if (req.beforePlayCbk != null) {
            req.beforePlayCbk()
        }
        videoRef.play()
        setupVideoEventListeners(videoRef)
        // 移除监听器，避免重复触发
        videoRef.removeEventListener('canplay', onCanPlay)
        if (req.playStartTimeSec != null) {
            appStore.barSeekTime = req.playStartTimeSec
        }
        console.log(`video can play seek ${req.playStartTimeSec}`)
    }
    videoRef.addEventListener('canplay', onCanPlay)

    videoRef.addEventListener('error', () => {
        console.log(`video err: ${videoRef.error?.message}`)
    })
}

function toggle_play(videoRef: HTMLVideoElement): void {
    // 首先判断是否有视频被选中
    if (appStore.curSltVideo == null) {
        return
    }
    if (!appStore.videoPlayCtrl.isPlay) {
        videoRef.pause()
        return
    }

    function convert_filepath_to_linux_style(filepath: string | null): string | null {
        if (filepath == null) {
            return null
        }
        return filepath.replace(/\\/g, '/')
    }
    let p1 = convert_filepath_to_linux_style(videoRef.src)
    let p2 = convert_filepath_to_linux_style(Dty.File.makePlayUrl(appStore.curSltVideo))
    // 再去掉p1，p2的前缀file:// 或者 file:///
    if (p1?.startsWith('file:///')) {
        p1 = p1.substring(8)
    } else if (p1?.startsWith('file://')) {
        p1 = p1.substring(7)
    }
    if (p2?.startsWith('file:///')) {
        p2 = p2.substring(8)
    } else if (p2?.startsWith('file://')) {
        p2 = p2.substring(7)
    }
    if (p1 !== p2) {
        const playReq = new PlayReq(Dty.File.makePlayUrl(appStore.curSltVideo))
        util.play_video(videoRef, playReq)
    } else {
        videoRef.play()
    }
}

function set_volume(volume: number): void {
    const videoRef = appStore.func_get_ele_video?.()
    if (videoRef) {
        videoRef.volume = volume
    }
}

function set_volume_muted(muted: boolean): void {
    const videoRef = appStore.func_get_ele_video?.()
    if (videoRef) {
        videoRef.muted = muted
    }
}

function update_bar_clips(): Dty.BarClip[] {
    const barClips: Dty.BarClip[] = []

    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return barClips
    }
    if (appStore.curSltVideo?.splitInfo?.splits == null) {
        return barClips
    }
    if (appStore.curSltVideo?.splitInfo.splits.length == 0) {
        return barClips
    }

    const splits = appStore.curSltVideo.splitInfo.splits
    const duration = appStore.curSltVideo.mediaInfo.duration

    for (let i = 0; i < splits.length; i++) {
        const splitInfo = splits[i]
        const startTime = splitInfo.startTime
        const endTime = splitInfo.endTime
        const startPercentage = (startTime / duration) * 100
        const endPercentage = (endTime / duration) * 100
        const width = endPercentage - startPercentage
        const color = splitInfo.isDelete ? '#555555' : splitInfo.color
        barClips.push({
            percent: startPercentage,
            width: width,
            color: color,
            tip: `Start: ${startTime.toFixed(3)}, End: ${endTime === duration ? 'End' : endTime.toFixed(3)}`
        })
    }
    return barClips
}

const export_cut_video = async (exportMode: Dty.ExportMode | null): Promise<void> => {
    const prjInfo: Dty.Req_CutVideo | null = await util.make_prj_info()
    if (prjInfo === null) {
        util.addToastErr(`no project info`)
        return
    }
    if (appStore.curSltVideo == null) {
        util.addToastInfo(t('util.selectVideoFirst'))
        return
    }
    
    if (!prjInfo.fileInfo.splitInfo || prjInfo.fileInfo.splitInfo.splits.length === 0) {
        util.addToastErr(t('util.noSplitInfo'))
        return
    }
    
    util.stop_play()

    prjInfo.exportMode = exportMode || Dty.ExportMode.Segment

    console.log('export_cut_video prjInfo:', prjInfo)
    
    const req: Dty.Req<Dty.Req_CutVideo> = {
        cmd: Dty.CmdType.videoCut,
        data: prjInfo
    }
    const response = await IpcApi.trigger_event<Dty.Req_CutVideo, Dty.Resp_CutVideo>(req)
    console.log('export_cut_video response:', response)
    if (response.code === 1001) {
        return
    }
    if (response.code !== 0) {
        util.addToastErr(`${t('util.clipFailed')}: ${response.status}`)
    } else {
        if (response.bOver === false) {
            util.addToastInfo(t('util.processing'))
        } else {
            const exportPath = response.data?.exportPath
            if (exportPath) {
                util.addToastInfo(`${t('util.clipSuccess')}! ${t('util.exportPath')}: ${exportPath}`)
                console.log(`========== Export Completed ==========`)
                console.log(`Export path: ${exportPath}`)
                console.log(`======================================`)
            } else {
                util.addToastInfo(t('util.clipSuccess'))
            }
        }
    }
}

let heartbeatCnt = 0
const runFlgArray: string[] = ['🏃🏼', '🚶🏼']

function makeClipProject(): Dty.ClipProject | null {
    if (!appStore.curSltVideo) {
        return null
    }
    const video = appStore.curSltVideo
    const existingProject = appStore.clipProject
    return {
        type: Dty.ProjectType.ClipEdit,
        version: '1.0.0',
        name: existingProject?.name || video.name.replace(/\.[^/.]+$/, ''),
        path: existingProject?.path || '',
        filePath: video.path,
        fileName: video.name,
        fileSize: video.size,
        duration: video.mediaInfo?.duration || 0,
        splitInfo: video.splitInfo?.splits || [],
        createdAt: existingProject?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
}

async function saveClipProject(): Promise<Dty.Resp<string>> {
    const resp = new Dty.Resp<string>()
    const clipProject = makeClipProject()
    if (!clipProject) {
        return resp.err('no video selected')
    }
    const req: Dty.Req<Dty.ClipProject> = {
        cmd: Dty.CmdType.clipProjectSave,
        data: clipProject
    }
    const response = await IpcApi.trigger_event(req)
    if (response.code === 0 && response.data) {
        appStore.clipProject = clipProject
        appStore.clipProject.path = response.data
    }
    return response
}

async function saveFileManagementProject(): Promise<Dty.Resp<string>> {
    const resp = new Dty.Resp<string>()
    if (!appStore.prj) {
        return resp.err('no project opened')
    }
    const req: Dty.Req<Dty.Prj> = {
        cmd: Dty.CmdType.prjSave,
        data: appStore.prj
    }
    return await IpcApi.trigger_event(req)
}

class Util {
    export_cut_video = export_cut_video
    saveClipProject = saveClipProject
    saveFileManagementProject = saveFileManagementProject
    makeClipProject = makeClipProject
    set_video_cur_time = set_video_cur_time
    update_bar_clips = update_bar_clips
    updateKeyframeSplitInfo(frameInfoReq: Dty.FrameInfo): Dty.SplitInfo[] {
        const frameInfo = frameInfoReq.frames
        // 根据i帧的时间信息，生成bar上的分割信息
        const frameSplitInfo: Dty.SplitInfo[] = []
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
            itemInfo.endTime = appStore?.curSltVideo?.mediaInfo?.duration || 0
            itemInfo.color = 'yellow'
            frameSplitInfo.push(itemInfo)
        }
        util.splitInfoCorrect(frameSplitInfo, appStore?.curSltVideo?.mediaInfo?.duration || 0)
        return frameSplitInfo
    }

    formatSecond2Time = formatSecond2Time

    message_notify(_req: Dty.MessageReq): void {
        Util.addToast(_req.content, _req.type)
    }

    static addToast(message: string, type: Dty.MessageShowType = 'info'): void {
        const id = Date.now()
        const timestamp = Date.now()
        const toast = { id, message, type, timestamp }

        // 添加到当前消息和历史消息
        appStore.toasts.push(toast)
        appStore.historyToasts.push(toast)

        // 限制历史消息数量，最多保留100条
        if (appStore.historyToasts.length > 100) {
            appStore.historyToasts.shift()
        }

        // 3秒后自动移除当前显示的消息
        setTimeout(() => {
            // this.removeToast(id)
            const index = appStore.toasts.findIndex((toast) => toast.id === id)
            if (index !== -1) {
                appStore.toasts.splice(index, 1)
            }
        }, 3000)
    }
    addToast = Util.addToast
    addToastInfo = (message: string): void => {
        Util.addToast(message, 'info')
    }
    addToastErr = (message: string): void => {
        Util.addToast(message, 'error')
    }
    // 清空所有历史消息
    clearHistoryToasts(): void {
        appStore.historyToasts = []
    }

    private async updateAppInfo(appStartResp: Dty.AppStartResp): Promise<void> {
        appStore.appInfo = appStartResp.appInfo
        appStore.recentFiles = appStartResp.appInfo.recentFiles || []
        appStore.recentProjects = appStartResp.appInfo.recentProjects || []
    }

    async start_app(): Promise<Dty.Resp> {
        const resp = new Dty.Resp()
        const req: Dty.Req = { cmd: Dty.CmdType.app_start }
        const response: Dty.Resp<Dty.AppStartResp> = await IpcApi.trigger_event(req)
        if (response.code != Dty.RespCode.Success) {
            return resp.err(response.status)
        }
        if (response.data == null) {
            return resp.err('app start resp data is null')
        }
        this.updateAppInfo(response.data)
        return resp
    }

    process_heartbeat(resp: Dty.Resp<Dty.HeartBeat>): void {
        if (resp.code != Dty.RespCode.Success || resp.data === undefined) {
            console.log('process heartbeat failed', resp)
            return
        }
        const respData: Dty.HeartBeat = resp.data
        const curTime = respData.time
        let titleStr = curTime + ' '
        titleStr += respData.processing ? runFlgArray[heartbeatCnt++ % runFlgArray.length] : '🧍‍♂️'
        titleStr += respData.appStatus
        if (appStore) {
            appStore.documentTitle = titleStr
        }
    }

    processMsgNotify(data: string): void {
        util.process_work_response(data)
    }

    processTaskNotify(data: string): void {
        try {
            const notify: Dty.TaskNotify = JSON.parse(data)
            console.log(`Task [${notify.taskId}] ${notify.cmd} - ${notify.status}`)
            
            if (notify.status === Dty.TaskStatus.Completed && notify.result) {
                const workResp: Dty.WorkResp = {
                    cmd: notify.cmd,
                    data: JSON.stringify(notify.result)
                }
                util.process_work_response(JSON.stringify(workResp))
            } else if (notify.status === Dty.TaskStatus.Failed) {
                util.addToastErr(`${t('util.taskFailed')}: ${notify.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('processTaskNotify error:', error)
        }
    }

    async thumbsDel(reqInfo: Dty.DeleteFileReq): Promise<void> {
        const req: Dty.Req<Dty.DeleteFileReq> = {
            cmd: Dty.CmdType.thumbDel,
            data: reqInfo
        }
        const response = await IpcApi.trigger_event(req)
        if (response.code === 1001) {
            return
        }
        const delStr =
            reqInfo.type == 'destroy' ? t('util.permanentlyDelete') : t('util.moveToTrash')
        if (response.code !== 0) {
            util.addToastErr(`${delStr} ${t('util.failed')}: ${response.status}`)
        } else {
            if (response.bOver === false) {
                util.addToastInfo(`${delStr} ${t('util.processing')}`)
            } else {
                const searchReq = new Dty.FilesReq()
                searchReq.status.push(Dty.Fstatus.Destroy)
                await this.thumbsGet(searchReq)
                util.addToastInfo(`${delStr} ${t('util.success')}`)
            }
        }
    }

    async filesDel(reqInfo: Dty.DeleteFileReq): Promise<void> {
        util.stop_play()
        const req: Dty.Req<Dty.DeleteFileReq> = {
            cmd: Dty.CmdType.videoDel,
            data: reqInfo
        }
        const response = await IpcApi.trigger_event(req)
        if (response.code === 1001) {
            return
        }
        const delStr =
            reqInfo.type == 'destroy' ? t('util.permanentlyDelete') : t('util.moveToTrash')
        if (response.code !== 0) {
            util.addToastErr(`${delStr} ${t('util.failed')}: ${response.status}`)
        } else {
            if (response.bOver === false) {
                util.addToastInfo(`${delStr} ${t('util.processing')}`)
            } else {
                // util.addToastInfo(`删除成功`)
                appStore.curCheckedVideo.clear()
                const searchReq = new Dty.FilesReq()
                searchReq.status.push(appStore.fileSearchStatus)
                await this.files_get(searchReq)
                util.addToastInfo(`${delStr} ${t('util.success')}`)
            }
        }
    }

    async get_slt_video(video: Dty.File | null): Promise<void> {
        const processSplitInfo = (): void => {
            if (appStore?.curSltVideo == null) {
                return
            }
            if (appStore?.curSltVideo?.splitInfo?.splits != null) {
                if (appStore.curSltVideo.splitInfo.splits.length > 0) {
                    for (let i = 0; i < appStore.curSltVideo.splitInfo.splits.length; i++) {
                        const splitInfo = appStore.curSltVideo.splitInfo.splits[i]
                        splitInfo.color = appStore.barColorDictionary[i % appStore.barColorDictionary.length]
                    }
                    return
                }
            }
            const duration = appStore?.curSltVideo?.mediaInfo?.duration || 0
            const itemInfo = util.makeSplitInfo(0)
            itemInfo.endTime = duration
            itemInfo.duration = duration
            itemInfo.percent = 100
            itemInfo.frameNum = util.calculateCurFrameIdx(duration)
            if (appStore?.curSltVideo?.splitInfo == null) {
                appStore.curSltVideo.splitInfo = new Dty.SqlitInfos()
                if (appStore?.curSltVideo?.splitInfo != null) {
                    appStore.curSltVideo.splitInfo.splits = []
                }
            }
            if (appStore?.curSltVideo?.splitInfo.splits != null) {
                appStore.curSltVideo.splitInfo.splits.push(itemInfo)
                appStore.curSltVideo.splitInfo.splits.sort((a, b) => a.percent - b.percent)
            }
        }
        if (video == null) {
            return
        }
        const req: Dty.Req<Dty.Req_SltFile> = {
            cmd: Dty.CmdType.sltVideo,
            data: {
                filepath: video.path
            }
        }
        const response: Dty.Resp<Dty.File> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            console.log('slect video failed', response)
        } else {
            if (response.bOver == false) {
                util.addToastInfo(t('util.processing'))
                return
            }
            const respData: Dty.File | undefined = response.data
            if (respData == undefined) {
                util.addToastErr(`${t('util.getVideoInfoFailed')}: ${response.status}`)
                console.log('slect video failed', response)
                return
            }
            appStore.curSltVideo = respData
            // if (respData.eventInfo != null) {
            //     util.processVideoEvent(respData.eventInfo?.events)
            // }
            processSplitInfo()
            // {
            //   const thumbs = respData.thumbnail
            //   if (thumbs != null) {
            //     for (const item of thumbs) {
            //       item.src = `file://${item.filePath}`
            //     }
            //   }
            // }
        }
    }

    async create_prj_with_path(
        dataRepo: Dty.DataRepo[],
        projectPath: string
    ): Promise<Dty.Resp<Dty.CreatePrjResp>> {
        const req: Dty.Req<Dty.CreatePrjWithPathReq> = {
            cmd: Dty.CmdType.createPrjWithPath,
            data: {
                dataRepo: dataRepo,
                projectPath: projectPath
            }
        }
        const response: Dty.Resp<Dty.CreatePrjResp> = await IpcApi.trigger_event(req)
        if (response.code == 0) {
            if (response.data?.prj != null) {
                appStore.prj = response.data.prj
                appStore.appInfo.prjFile = response.data.prjFile
            }
        }
        return response
    }

    async sync_prj(types: Dty.SyncType[]): Promise<Dty.Resp<Dty.SyncPrjResp>> {
        util.addToastInfo(t('util.syncStarted'))
        const req: Dty.Req<Dty.SyncPrjReq> = {
            cmd: Dty.CmdType.prjSync,
            data: {
                type: types,
                prj: appStore.prj!
            }
        }
        const response: Dty.Resp<Dty.SyncPrjResp> = await IpcApi.trigger_event(req)
        if (response.code == 0) {
            if (response.data?.prj != null) {
                appStore.prj = response.data?.prj
            }
        }
        return response
    }

    async thumbsGet(reqParam: Dty.FilesReq | null): Promise<Dty.Resp<Dty.FilesResp>> {
        const req: Dty.Req<Dty.FilesReq> = {
            cmd: Dty.CmdType.thumbGet,
            data: reqParam == null ? new Dty.FilesReq() : reqParam
        }
        if (!req.data) {
            const resp = new Dty.Resp<Dty.FilesResp>()
            resp.code = Dty.RespCode.Error
            return resp
        }
        req.data.page = appStore.fileSearchPage
        req.data.pageSize = appStore.fileSearchPageSize
        const response: Dty.Resp<Dty.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code != 0) {
            util.addToastErr(`search file failed: ${response.status}`)
            console.log(`search file failed: ${response.status}`)
            return response
        }
        console.info('search thumb success', response.data)
        appStore.thumbList = response.data?.files || []
        appStore.thumbTotalNum = response.data?.total || 0
        if (appStore.thumbList.length == 0) {
            util.addToastInfo(
                `${t('util.noFiles')}，${t('util.currentMode')}:${appStore.fileSearchStatus == Dty.Fstatus.Deleted ? t('util.trashMode') : t('util.normalMode')}`
            )
        }
        return response
    }

    async thumb_img_get(videoName: string, thumbName: string): Promise<string | null> {
        const req: Dty.Req<Dty.ThumbImgGetReq> = {
            cmd: Dty.CmdType.thumbImgGet,
            data: { videoName, thumbName }
        }
        const response: Dty.Resp<Dty.ThumbImgGetResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0 || !response.data) {
            console.error(`get thumb image failed: ${response.status}`)
            return null
        }
        return `data:${response.data.mimeType};base64,${response.data.data}`
    }

    async files_get(reqParam: Dty.FilesReq | null): Promise<Dty.Resp<Dty.FilesResp>> {
        const req: Dty.Req<Dty.FilesReq> = {
            cmd: Dty.CmdType.filesGet,
            data: reqParam == null ? new Dty.FilesReq() : reqParam
        }
        if (!req.data) {
            const resp = new Dty.Resp<Dty.FilesResp>()
            resp.code = Dty.RespCode.Error
            return resp
        }
        req.data.page = appStore.fileSearchPage
        req.data.pageSize = appStore.fileSearchPageSize
        const response: Dty.Resp<Dty.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`${t('util.getFileListFailed')}: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                util.addToastInfo(t('util.processing'))
                return response
            }
        }
        appStore.videoList = response.data?.files || []
        appStore.videoTotalNum = response.data?.total || 0
        console.info('search file success', response.data)
        return response
    }

    async tags_get(reqParam: Dty.TagsReq | null): Promise<Dty.Resp<Dty.TagsResp>> {
        const req: Dty.Req<Dty.TagsReq> = {
            cmd: Dty.CmdType.tags_get,
            data: reqParam == null ? new Dty.TagsReq() : reqParam
        }
        const response: Dty.Resp<Dty.TagsResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`${t('util.getTagListFailed')}: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                util.addToastInfo(t('util.processing'))
                return response
            }
        }
        appStore.tags = response.data?.tags || []
        return response
    }

    async tag_update(reqParam: Dty.TagUpdateReq): Promise<Dty.Resp> {
        const req: Dty.Req<Dty.TagUpdateReq> = {
            cmd: Dty.CmdType.tagUpdate,
            data: reqParam
        }
        const response: Dty.Resp = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`${t('adminTagMng.updateFailed')}: ${response.status}`)
        } else {
            util.addToastInfo(t('adminTagMng.updateSuccess'))
            await this.tags_get(null)
        }
        return response
    }

    async tag_delete(tagId: number): Promise<Dty.Resp> {
        const req: Dty.Req<Dty.TagDeleteReq> = {
            cmd: Dty.CmdType.tagDelete,
            data: { id: tagId } as Dty.TagDeleteReq
        }
        const response: Dty.Resp = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`${t('adminTagMng.deleteFailed')}: ${response.status}`)
        } else {
            util.addToastInfo(t('adminTagMng.deleteSuccess'))
            await this.tags_get(null)
        }
        return response
    }

    async file_tags_set(
        fileTags: Dty.FileTagsReq,
        param: Dty.FileTagsSetParam | null = null
    ): Promise<void> {
        const req: Dty.Req<Dty.FileTagsReq> = {
            cmd: Dty.CmdType.fileTagsSet,
            data: fileTags
        }
        const response: Dty.Resp = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`${t('util.setTagFailed')}: ${response.status}`)
        } else {
            if (response.bOver == false) {
                util.addToastInfo(t('util.processing'))
                return
            }
            if (param != null) {
                if (param.bNeedUpdate) {
                    const searchReq = new Dty.FilesReq()
                    searchReq.status.push(appStore.fileSearchStatus)
                    await this.files_get(searchReq)
                    await this.tags_get(null)
                }
                if (param.bNeedSltCurVideo) {
                    await this.get_slt_video(appStore.curSltVideo)
                }
            }
            util.addToastInfo(t('util.setTagSuccess'))
        }
    }

    processVideoEvent = processVideoEvent
    folder_file_proc = folder_file_proc
    getKeyFrameInfo = getKeyFrameInfo
    /*
    {
    clearModel: "changeToThumbnail",
    }
    */
    clear_cur_slt_video_info(req: Dty.ClearSltInfoReq | null): void {
        const clear_videoPlayCtrl = (): void => {
            if (appStore) {
                appStore.videoPlayCtrl.curSrc = ''
                appStore.videoPlayCtrl.curTime = 0
                appStore.videoPlayCtrl.videoStartTime = 0
                appStore.videoPlayCtrl.isPlay = false
                // if (appStore.curSltVideo?.mediaInfo?.duration !== undefined) {
                //     appStore.curSltVideo.mediaInfo.duration = 0
                // }
                appStore.videoPlayCtrl.playbackRate = 1.0
            }
        }

        // 有条件的清除
        if (req != null) {
            if (req.clearModel === 'changeToThumbnail') {
                const tmpDuration = appStore?.curSltVideo?.mediaInfo?.duration
                clear_videoPlayCtrl()
                if (appStore?.curSltVideo?.mediaInfo?.duration !== undefined) {
                    appStore.curSltVideo.mediaInfo.duration = tmpDuration || 0
                }
                if (appStore) {
                    appStore.barSeekTime = 0
                }
                return
            }
        }

        // 全部清除
        clear_videoPlayCtrl()
        appStore.bShowKeyFrameInfo = false
        appStore.barSeekTime = 0
        if (!(req?.bNotClear_curSltVideo == true)) {
            appStore.curSltVideo = null
            appStore.curSltVideoName4Play = ''
        }
    }
    make_prj_info = make_prj_info
    calculateCurFrameIdx = calculateCurFrameIdx
    formatTime = formatTime
    splitInfoCorrect = splitInfoCorrect
    stop_play = stop_play
    play_video = play_video
    toggle_play = toggle_play
    set_volume = set_volume
    set_volume_muted = set_volume_muted
    setupVideoEventListeners = setupVideoEventListeners
    setAppStore(store): void {
        appStore = store
    }

    process_work_response(data: string): void {
        // const showCtx = `命令:${cmd} 执行结果: ${response.status}`
        // if (response.code !== 0) {
        //   util.addToastErr(showCtx)
        // } else {
        //   util.addToastInfo(showCtx)
        // }

        // console.log('process_work_response', cmd, response)
        const datCmd: Dty.WorkResp = JSON.parse(data)
        const cmd = datCmd.cmd
        switch (cmd) {
            case Dty.CmdType.prjOpen:
                {
                    const workRespose: Dty.WorkResp<Dty.Resp<Dty.TraversalFolder>> =
                        JSON.parse(data)
                    const response = workRespose.data
                    util.folder_file_proc(response)
                    if (response.code !== 0) {
                        util.addToastErr(`${t('util.openFolderFailed')}: ${response.status}`)
                    } else {
                        util.addToastInfo(`${t('util.openFolderSuccess')}: ${response.status}`)
                    }
                }

                break
            case Dty.CmdType.videoCut:
                {
                    const workRespose: Dty.WorkResp<Dty.Resp<Dty.Resp_CutVideo>> = JSON.parse(data)
                    const response = workRespose.data
                    if (response.code !== 0) {
                        util.addToastErr(`${t('util.videoCropFailed')}: ${response.status}`)
                        console.log('cut video failed', response)
                    } else {
                        const exportPath = response.data?.exportPath
                        if (exportPath) {
                            util.addToastInfo(`${t('util.videoCropCompleted')}! ${t('util.exportPath')}: ${exportPath}`)
                            console.log(`========== Export Completed ==========`)
                            console.log(`Export path: ${exportPath}`)
                            console.log(`======================================`)
                        } else {
                            util.addToastInfo(`${t('util.videoCropCompleted')}: ${response.status}`)
                        }
                        if (response.data != null) {
                            const respData: Dty.Resp_CutVideo = response.data
                            if (respData.traversalResp != null) {
                                console.log('update file list', respData.traversalResp)
                                util.folder_file_proc(respData.traversalResp)
                            }
                        }
                    }
                }

                break
            case Dty.CmdType.videoDel:
                {
                    const workRespose: Dty.WorkResp<Dty.Resp> = JSON.parse(data)
                    const response = workRespose.data
                    if (response.code !== 0) {
                        util.addToastErr(`${t('util.deleteFailed')}: ${response.status}`)
                        console.log('cut video failed', response)
                    } else {
                        util.addToastInfo(`${t('util.deleteCompleted')}:${response.status}`)
                        const searchReq = new Dty.FilesReq()
                        searchReq.status.push(appStore.fileSearchStatus)
                        this.files_get(searchReq)
                    }
                }
                break
            case Dty.CmdType.get_key_frame_info:
                {
                    const workRespose: Dty.WorkResp<Dty.Resp<Dty.FrameInfo>> = JSON.parse(data)
                    const response = workRespose.data
                    if (response.code !== 0) {
                        util.addToastErr(`${t('util.getKeyFrameInfoFailed')}: ${response.status}`)
                    } else {
                        if (appStore) {
                            if (appStore.curSltVideo == null) {
                                appStore.curSltVideo = new Dty.File()
                            }
                            if (null != response.data) {
                                appStore.curSltVideo.frameInfo = response.data
                                console.log('get key frame info', appStore.curSltVideo.frameInfo)
                                util.addToastInfo(
                                    `${t('util.getKeyFrameInfoCompleted')}:${response.status}`
                                )
                            }
                        }
                    }
                }

                break
        }
    }

    getFilenameFromPath(filePath: string | null | undefined): string {
        if (filePath == null || filePath === '') return ''
        const parts = filePath.split(/[\\/]/)
        const fileName = parts[parts.length - 1]
        return fileName
    }
    makeSplitInfo(colorIndex?: number): Dty.SplitInfo {
        const colors = appStore.barColorDictionary
        const color = colors[colorIndex !== undefined ? colorIndex % colors.length : 0]
        const splitInfo: Dty.SplitInfo = {
            startTime: 0,
            endTime: 0,
            duration: 0,
            percent: 0,
            color: color,
            currentTime: 0,
            isDelete: false,
            frameIdx: 0,
            frameNum: 0
        }
        return splitInfo
    }

    async search_tag(): Promise<Dty.Resp<Dty.FilesResp>> {
        const req: Dty.Req<Dty.FilesReq> = {
            cmd: Dty.CmdType.tagsSearch
        }
        req.data = Dty.FilesReq.makeReqStatusNormal(null, null)
        const response: Dty.Resp<Dty.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code != 0) {
            util.addToastErr(`search file failed: ${response.status}`)
            console.log(`search file failed: ${response.status}`)
            return response
        }
        console.info('search file success', response.data)
        appStore.videoList = response.data?.files || []
        return response
    }

    viewModelChange(viewModel: 'video' | 'thumbnail'): void {
        if (viewModel === 'video') {
            appStore.curViewModel = 'video'
        } else if (viewModel === 'thumbnail') {
            appStore.curViewModel = 'thumbnail'
        }
        const showCtx =
            appStore.curViewModel === 'video'
                ? t('util.videoPlaybackMode')
                : t('util.thumbnailMode')
        util.addToast(showCtx, 'info')
    }
}

const util = new Util()
export default util
