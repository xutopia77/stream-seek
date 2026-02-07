import type { AppStore } from '../stores/AppStore'
let appStore: AppStore

import * as DataTypes from '../../../bridge/dataTypedef'
import { IpcApi } from './ipcApi'

async function getKeyFrameInfo(): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
    const resp = new DataTypes.Resp<DataTypes.FrameInfo>()
    if (appStore?.curSltVideo === null || appStore?.curSltVideo?.mediaInfo === null) {
        return resp.err('no video selected')
    }
    const req: DataTypes.Req<DataTypes.Req_FrameInfo> = {
        cmd: DataTypes.CmdType.get_key_frame_info,
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

function folder_file_proc(resp: DataTypes.Resp<DataTypes.TraversalFolder>): void {
    if (resp.code !== 0) {
        util.addToastErr(`打开文件夹失败: ${resp.status}`)
        return
    }
    if (resp.bOver == false) {
        util.addToastInfo(`正在处理...`)
        return
    }
    if (resp.data == null) {
        util.addToastErr(`打开文件夹失败: ${resp.status}`)
        return
    }
    const respData: DataTypes.TraversalFolder = resp.data
    const files = respData.files
    if (files === undefined) {
        return
    }
    // for (let i = 0; i < files.length; i++) {
    //   files[i].src = `file://${files[i].filePath}`
    // }
    appStore.videoList = files
}

function processVideoEvent(videoEvent: DataTypes.FileEventInfo[][]): void {
    const colorSegments: { startTime: number; endTime: number; color: string }[] = []
    let startTime = 0
    const barBaseColor = '#555'
    let lastColor = barBaseColor

    let eventInTimePoint: DataTypes.FileEventInfo[] = []
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

async function make_prj_info(): Promise<DataTypes.Req_CutVideo | null> {
    if (appStore?.curSltVideo === null) {
        util.addToastInfo(`当前没有选择视频文件`)
        return null
    }
    const prjInfo: DataTypes.Req_CutVideo = {
        fileInfo: appStore.curSltVideo,
        filepath: appStore.curSltVideo?.path || '',
        filename: util.getFilenameFromPath(appStore.curSltVideo?.path || '')
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

function splitInfoCorrect(splitInfos: DataTypes.SplitInfo[], videoDuration: number): void {
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

function stop_play(): void {
    if (appStore.videoPlayCtrl.isPlay == false && appStore.videoPlayCtrl.isStop == true) {
        return
    }
    console.log('stop_play')
    util.clear_cur_slt_video_info(null)
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
    let p2 = convert_filepath_to_linux_style(DataTypes.File.makePlayUrl(appStore.curSltVideo))
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
        const playReq = new PlayReq(DataTypes.File.makePlayUrl(appStore.curSltVideo))
        util.play_video(videoRef, playReq)
    } else {
        videoRef.play()
    }
}

function update_bar_clips(): DataTypes.BarClip[] {
    const barClips: DataTypes.BarClip[] = []

    if (appStore.curSltVideo?.mediaInfo?.duration == null) {
        return barClips
    }
    if (appStore.curSltVideo?.splitInfo?.splits == null) {
        return barClips
    }
    if (appStore.curSltVideo?.splitInfo.splits.length == 0) {
        return barClips
    }

    interface timeSplitInfo {
        startTime: number
        endTime: number
    }
    const timeSplitInfo: timeSplitInfo[] = appStore.curSltVideo.splitInfo.splits.map((item) => {
        return {
            startTime: item.startTime,
            endTime: item.endTime
        }
    })
    if (timeSplitInfo.length <= 1) {
        return barClips
    }

    const duration = appStore.curSltVideo.mediaInfo.duration
    for (let i = 0; i < timeSplitInfo.length; i++) {
        const config = timeSplitInfo[i]
        const startTime = config.startTime
        const endTime = config.endTime
        const startPercentage = (startTime / duration) * 100
        const endPercentage = (endTime / duration) * 100
        const width = endPercentage - startPercentage
        barClips.push({
            percent: startPercentage,
            width: width,
            color: appStore.barColorDictionary[i % appStore.barColorDictionary.length],
            tip: `Start: ${startTime.toFixed(3)}, End: ${endTime === duration ? 'End' : endTime.toFixed(3)}`
        })
    }
    // for (const config of timeSplitInfo) {
    //   const startTime = Math.min(config.startTime, duration)
    //   const endTime = config.endTime === Infinity ? duration : Math.min(config.endTime, duration)
    //   const startPercentage = (startTime / duration) * 100
    //   const endPercentage = (endTime / duration) * 100
    //   const width = endPercentage - startPercentage
    //   barClips.push({
    //     percent: startPercentage,
    //     width: width,
    //     color: config.color,
    //     tip: `Start: ${startTime.toFixed(3)}, End: ${endTime === duration ? 'End' : endTime.toFixed(3)}`
    //   })
    // }
    return barClips
}

const export_cut_video = async (cutReq: DataTypes.CutVideoReq | null): Promise<void> => {
    const prjInfo: DataTypes.Req_CutVideo | null = await util.make_prj_info()
    if (prjInfo === null) {
        util.addToastErr(`no project info`)
        return
    }
    if (appStore.curSltVideo == null) {
        util.addToastInfo('请先选择一个视频')
        return
    }
    util.stop_play()

    if (cutReq?.bDelFullVideo != null) {
        if (prjInfo.fileInfo.splitInfo != null) {
            prjInfo.fileInfo.splitInfo[0].isDelete = true
        }
    }

    const req: DataTypes.Req<DataTypes.Req_CutVideo> = {
        cmd: DataTypes.CmdType.videoCut,
        data: prjInfo
    }
    const response = await IpcApi.trigger_event(req)
    if (response.code === 1001) {
        return
    }
    if (response.code !== 0) {
        util.addToastInfo(`剪辑失败: ${response.status}`)
    } else {
        if (response.bOver === false) {
            util.addToastInfo(`正在处理...`)
        } else {
            util.addToastInfo(`剪辑成功`)
        }
    }
}

let heartbeatCnt = 0
const runFlgArray: string[] = ['🏃🏼', '🚶🏼']

class Util {
    export_cut_video = export_cut_video
    set_video_cur_time = set_video_cur_time
    update_bar_clips = update_bar_clips
    updateKeyframeSplitInfo(frameInfoReq: DataTypes.FrameInfo): DataTypes.SplitInfo[] {
        const frameInfo = frameInfoReq.frames
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
            itemInfo.endTime = appStore?.curSltVideo?.mediaInfo?.duration || 0
            itemInfo.color = 'yellow'
            frameSplitInfo.push(itemInfo)
        }
        util.splitInfoCorrect(frameSplitInfo, appStore?.curSltVideo?.mediaInfo?.duration || 0)
        return frameSplitInfo
    }

    formatSecond2Time = formatSecond2Time

    message_notify(_req: DataTypes.MessageReq): void {
        Util.addToast(_req.content, _req.type)
    }

    static addToast(message: string, type: DataTypes.MessageShowType = 'info'): void {
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

    private async updateAppInfo(appStartResp: DataTypes.AppStartResp): Promise<void> {
        appStore.appInfo = appStartResp.appInfo
        if (appStartResp.prj != null) {
            appStore.prj = appStartResp.prj
            console.log('get prj success ', appStartResp.prj)
            await util.files_get(null)
            await util.tags_get(null)
        } else {
            console.log('get prj failed')
        }
        // if (prj.dataFolder != null && prj.dataFolder !== '') {
        //   const req: DataTypes.Req<DataTypes.Req_TraversalFolder> = {
        //     cmd: 'traversal_folder',
        //     data: { folder: prj.lastOpenedFolder }
        //   }
        //   const response: DataTypes.Resp<DataTypes.TraversalFolder> = await IpcApi.trigger_event(req)
        //   if (response.code === 0) {
        //     appStore.curOpenedFolder = prj.lastOpenedFolder
        //     util.folder_file_proc(response)
        //   } else {
        //     util.addToastErr(`遍历文件夹失败`)
        //   }
        // } else {
        //   console.log('lastOpenedFolder is null')
        // }
    }

    async start_app(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        const req: DataTypes.Req = { cmd: DataTypes.CmdType.app_start }
        const response: DataTypes.Resp<DataTypes.AppStartResp> = await IpcApi.trigger_event(req)
        if (response.code != DataTypes.RespCode.Success) {
            Util.addToast('no prj found', 'warning')
            return resp.err(response.status)
        }
        if (response.data == null) {
            Util.addToast('no prj found', 'warning')
            return resp.err('app start resp data is null')
        }
        this.updateAppInfo(response.data)
        return resp
    }

    process_heartbeat(resp: DataTypes.Resp<DataTypes.HeartBeat>): void {
        if (resp.code !== 0) {
            console.log('process heartbeat failed', resp)
            return
        }
        if (resp.data === undefined) {
            console.log('process heartbeat failed', resp)
            return
        }
        const respData: DataTypes.HeartBeat = resp.data
        const curTime = respData.time
        let titleStr = curTime + ' '
        titleStr += respData.processing ? runFlgArray[heartbeatCnt++ % runFlgArray.length] : '🧍‍♂️'
        titleStr += respData.appStatus
        if (appStore) {
            appStore.documentTitle = titleStr
        }
        // console.log('process heartbeat', appStore.documentTitle)
        if (respData.workRespose != null) {
            if (respData.workRespose.length > 0) {
                // console.log('process heartbeat', respData.workRespose)
            }
            for (const item of respData.workRespose) {
                util.process_work_response(item)
            }
        }
    }

    async delete_video(reqInfo: DataTypes.DeleteFileReq): Promise<void> {
        util.stop_play()
        const req: DataTypes.Req<DataTypes.DeleteFileReq> = {
            cmd: DataTypes.CmdType.videoDel,
            data: reqInfo
        }
        const response = await IpcApi.trigger_event(req)
        if (response.code === 1001) {
            return
        }
        const delStr = reqInfo.type == 'destroy' ? '彻底删除' : '移到回收站'
        if (response.code !== 0) {
            util.addToastErr(`${delStr} 失败: ${response.status}`)
        } else {
            if (response.bOver === false) {
                util.addToastInfo(`${delStr} 正在处理...`)
            } else {
                // util.addToastInfo(`删除成功`)
                appStore.curCheckedVideo.clear()
                await this.files_get(null)
                util.addToastInfo(`${delStr} 成功`)
            }
        }
    }

    async get_slt_video(video: DataTypes.File | null): Promise<void> {
        const processSplitInfo = (): void => {
            if (appStore?.curSltVideo == null) {
                return
            }
            if (appStore?.curSltVideo?.splitInfo?.splits != null) {
                // 从后台已经获取到了信息，就不用再处理了
                if (appStore.curSltVideo.splitInfo.splits.length > 0) {
                    return
                }
            }
            // 如果后台没有标记信息，就需要把完整的视频分段添加到splitInfo中
            const duration = appStore?.curSltVideo?.mediaInfo?.duration || 0
            const itemInfo = util.makeSplitInfo()
            itemInfo.endTime = duration
            itemInfo.duration = duration
            itemInfo.percent = 100
            itemInfo.frameNum = util.calculateCurFrameIdx(duration)
            if (appStore?.curSltVideo?.splitInfo == null) {
                appStore.curSltVideo.splitInfo = new DataTypes.SqlitInfos()
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
        const req: DataTypes.Req<DataTypes.Req_SltFile> = {
            cmd: DataTypes.CmdType.sltVideo,
            data: {
                filepath: video.path
            }
        }
        const response: DataTypes.Resp<DataTypes.File> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            console.log('slect video failed', response)
        } else {
            if (response.bOver == false) {
                util.addToastInfo(`正在处理...`)
                return
            }
            const respData: DataTypes.File | undefined = response.data
            if (respData == undefined) {
                util.addToastErr(`获取视频信息失败: ${response.status}`)
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

    async create_prj(
        dataRepo: DataTypes.DataRepo[]
    ): Promise<DataTypes.Resp<DataTypes.CreatePrjResp>> {
        const req: DataTypes.Req<DataTypes.CreatePrjReq> = {
            cmd: DataTypes.CmdType.createPrj,
            data: {
                dataRepo: dataRepo
            }
        }
        const response: DataTypes.Resp<DataTypes.CreatePrjResp> = await IpcApi.trigger_event(req)
        if (response.code == 0) {
            if (response.data?.prj != null) {
                appStore.prj = response.data.prj
            }
        }
        return response
    }

    async sync_prj(types: DataTypes.SyncType[]): Promise<DataTypes.Resp<DataTypes.SyncPrjResp>> {
        const req: DataTypes.Req<DataTypes.SyncPrjReq> = {
            cmd: DataTypes.CmdType.prjSync,
            data: {
                type: types,
                prj: appStore.prj
            }
        }
        const response: DataTypes.Resp<DataTypes.SyncPrjResp> = await IpcApi.trigger_event(req)
        if (response.code == 0) {
            if (response.data?.prj != null) {
                appStore.prj = response.data?.prj
            }
        }
        return response
    }

    async files_get(
        reqParam: DataTypes.FilesReq | null
    ): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const req: DataTypes.Req<DataTypes.FilesReq> = {
            cmd: DataTypes.CmdType.filesGet,
            data: reqParam == null ? new DataTypes.FilesReq() : reqParam
        }
        if (!req.data) {
            const resp = new DataTypes.Resp<DataTypes.FilesResp>()
            resp.code = DataTypes.RespCode.Error
            return resp
        }
        req.data.page = appStore.fileSearchPage
        req.data.pageSize = appStore.fileSearchPageSize
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`获取文件列表失败: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                util.addToastInfo(`正在处理...`)
                return response
            }
        }
        appStore.videoList = response.data?.files || []
        appStore.videoTotalNum = response.data?.total || 0
        console.info('search file success', response.data)
        return response
    }

    async tags_get(
        reqParam: DataTypes.TagsReq | null
    ): Promise<DataTypes.Resp<DataTypes.TagsResp>> {
        const req: DataTypes.Req<DataTypes.TagsReq> = {
            cmd: DataTypes.CmdType.tags_get,
            data: reqParam == null ? new DataTypes.TagsReq() : reqParam
        }
        const response: DataTypes.Resp<DataTypes.TagsResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`获取标签列表失败: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                util.addToastInfo(`正在处理...`)
                return response
            }
        }
        appStore.tags = response.data?.tags || []
        return response
    }

    async file_tags_set(
        fileTags: DataTypes.FileTagsReq,
        param: DataTypes.FileTagsSetParam | null = null
    ): Promise<void> {
        const req: DataTypes.Req<DataTypes.FileTagsReq> = {
            cmd: DataTypes.CmdType.fileTagsSet,
            data: fileTags
        }
        const response: DataTypes.Resp = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            util.addToastErr(`设置标签失败: ${response.status}`)
        } else {
            if (response.bOver == false) {
                util.addToastInfo(`正在处理...`)
                return
            }
            if (param != null) {
                if (param.bNeedUpdate) {
                    await this.files_get(null)
                    await this.tags_get(null)
                }
                if (param.bNeedSltCurVideo) {
                    await this.get_slt_video(appStore.curSltVideo)
                }
            }
            util.addToastInfo(`设置标签成功`)
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
    clear_cur_slt_video_info(req: DataTypes.ClearSltInfoReq | null): void {
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
        }
    }
    make_prj_info = make_prj_info
    calculateCurFrameIdx = calculateCurFrameIdx
    formatTime = formatTime
    splitInfoCorrect = splitInfoCorrect
    stop_play = stop_play
    play_video = play_video
    toggle_play = toggle_play
    setupVideoEventListeners = setupVideoEventListeners
    setAppStore(store): void {
        appStore = store
    }

    process_work_response(workRespose: DataTypes.WorkResp): void {
        const cmd = workRespose.cmd

        const response = JSON.parse(workRespose.data)
        // const showCtx = `命令:${cmd} 执行结果: ${response.status}`
        // if (response.code !== 0) {
        //   util.addToastErr(showCtx)
        // } else {
        //   util.addToastInfo(showCtx)
        // }

        // console.log('process_work_response', cmd, response)
        switch (cmd) {
            case 'open_folder':
                console.log('open folder', response)
                util.folder_file_proc(response)
                if (response.code !== 0) {
                    util.addToastErr(`打开文件夹失败: ${response.status}`)
                } else {
                    util.addToastInfo(`打开文件夹成功: ${response.status}`)
                }
                break
            case 'traversal_folder':
                {
                    console.log('traversal folder', response)
                    util.folder_file_proc(response)
                    if (response.code !== 0) {
                        util.addToastErr(`更新文件夹: ${response.status}`)
                    }
                }
                break
            case 'query_video':
                if (appStore) {
                    // appStore.queryInfo = response.data
                }
                break
            case 'cut_video':
                if (response.code !== 0) {
                    util.addToastErr(`视频裁剪失败: ${response.status}`)
                    console.log('cut video failed', response)
                } else {
                    util.addToastInfo(`视频裁剪完成:${response.status}`)
                    const respData: DataTypes.Resp_CutVideo = response.data
                    if (respData.traversalResp != null) {
                        console.log('update file list', respData.traversalResp)
                        util.folder_file_proc(respData.traversalResp)
                    }
                }
                break
            case 'delete_video':
                {
                    if (response.code !== 0) {
                        util.addToastErr(`删除失败: ${response.status}`)
                        console.log('cut video failed', response)
                    } else {
                        util.addToastInfo(`删除完成:${response.status}`)
                        this.files_get(null)
                    }
                }
                break
            case 'get_key_frame_info':
                if (response.code !== 0) {
                    util.addToastErr(`获取关键帧信息失败: ${response.status}`)
                } else {
                    if (appStore) {
                        if (appStore.curSltVideo == null) {
                            appStore.curSltVideo = new DataTypes.File()
                        }
                        appStore.curSltVideo.frameInfo = response.data
                        console.log('get key frame info', appStore.curSltVideo.frameInfo)
                        util.addToastInfo(`获取关键帧信息完成:${response.status}`)
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
    makeSplitInfo(): DataTypes.SplitInfo {
        // 进度条的分段信息，黄色表示是关键帧
        const splitInfo: DataTypes.SplitInfo = {
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
        return splitInfo
    }

    async thumbGet(): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const req: DataTypes.Req<DataTypes.FilesReq> = {
            cmd: DataTypes.CmdType.search_file
        }
        req.data = DataTypes.FilesReq.makeReqStatusNotDel(null, null)
        if (appStore.prj.repoType == DataTypes.RepoType.Trash) {
            req.data = DataTypes.FilesReq.makeReqStatusDel(null)
        }
        if (!req.data) {
            const resp = new DataTypes.Resp<DataTypes.FilesResp>()
            resp.code = DataTypes.RespCode.Error
            return resp
        }
        req.data.page = appStore.fileSearchPage
        req.data.pageSize = appStore.fileSearchPageSize
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code != 0) {
            util.addToastErr(`search file failed: ${response.status}`)
            console.log(`search file failed: ${response.status}`)
            return response
        }
        console.info('search file success', response.data)
        appStore.thumbList = response.data?.files || []
        if (appStore.thumbList.length == 0) {
            util.addToastInfo(
                `没有文件，当前模式:${appStore.prj.repoType == DataTypes.RepoType.Trash ? '回收站' : '正常'}`
            )
        }
        return response
    }

    async search_tag(): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const req: DataTypes.Req<DataTypes.FilesReq> = {
            cmd: DataTypes.CmdType.tagsSearch
        }
        req.data = DataTypes.FilesReq.makeReqStatusNotDel(null, null)
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
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
        const showCtx = appStore.curViewModel === 'video' ? `视频播放模式` : `缩略图模式`
        util.addToast(showCtx, 'info')
    }
}

const util = new Util()
export default util
