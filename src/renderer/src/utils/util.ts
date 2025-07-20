import type { AppStore } from '../stores/AppStore'
let appStore: AppStore

import * as DataTypes from '../../../bridge/dataTypedef'
import MessageShow from '../components/util/MessageShow'
import { IpcApi } from './IpcApi'

function updateKeyframeSplitInfo(frameInfoReq: DataTypes.FrameInfo): DataTypes.SplitInfo[] {
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
        itemInfo.endTime = appStore?.curVideoInfo?.mediaInfo?.duration || 0
        itemInfo.color = 'yellow'
        frameSplitInfo.push(itemInfo)
    }
    util.splitInfoCorrect(frameSplitInfo, appStore?.curVideoInfo?.mediaInfo?.duration || 0)
    return frameSplitInfo
}

async function getKeyFrameInfo(): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
    const resp = new DataTypes.Resp<DataTypes.FrameInfo>()
    if (appStore?.curSltVideo === null || appStore?.curVideoInfo?.mediaInfo === null) {
        return resp.err('no video selected')
    }
    const req: DataTypes.Req<DataTypes.Req_FrameInfo> = {
        cmd: 'get_key_frame_info',
        data: {
            filepath: appStore?.curSltVideo?.path
        }
    }
    if (appStore?.curVideoInfo?.frameInfo == null) {
        return await IpcApi.trigger_event(req)
    }
    return resp
}

/*
{
  clearModel: "changeToThumbnail",
}
*/
function clear_cur_slt_video_info(req: DataTypes.ClearSltInfoReq | null): void {
    const clear_videoPlayCtrl = (): void => {
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
    appStore.curVideoInfo = null
    appStore.bShowKeyFrameInfo = false
    appStore.barSeekTime = 0
    if (!(req?.bNotClear_curSltVideo == true)) {
        appStore.curSltVideo = null
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
    if (appStore?.curVideoInfo === null) {
        MessageShow.success(`当前没有选择视频文件`)
        return null
    }
    const prjInfo: DataTypes.Req_CutVideo = {
        fileInfo: appStore.curVideoInfo,
        filepath: appStore.curSltVideo?.path || '',
        filename: util.getFilenameFromPath(appStore.curSltVideo?.path || '')
    }
    return prjInfo
}

function calculateCurFrameIdx(curTime: number): number {
    if (appStore?.curVideoInfo === null) return 0
    if (appStore?.curVideoInfo?.mediaInfo === null) return 0
    const frameRate = appStore.curVideoInfo?.mediaInfo?.video.frame_rate
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
    clear_cur_slt_video_info(null)
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
            MessageShow.error('video ref null')
            return
        }
        appStore.videoPlayCtrl.curTime = 0
        if (videoRef.duration != appStore.curVideoInfo?.mediaInfo?.duration) {
            console.log(
                `video duration not equal appStore.duration: ${videoRef.duration} != ${appStore.curVideoInfo?.mediaInfo?.duration}`
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
        console.log('请选择视频文件1')
        return
    }
    if (!appStore.videoPlayCtrl.isPlay) {
        videoRef.pause()
        return
    }

    console.log('play video11111111111111111')
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

    if (appStore.curVideoInfo?.mediaInfo?.duration == null) {
        return barClips
    }
    if (appStore.curVideoInfo?.splitInfo?.splits == null) {
        return barClips
    }
    if (appStore.curVideoInfo?.splitInfo.splits.length == 0) {
        return barClips
    }

    interface timeSplitInfo {
        startTime: number
        endTime: number
    }
    const timeSplitInfo: timeSplitInfo[] = appStore.curVideoInfo.splitInfo.splits.map((item) => {
        return {
            startTime: item.startTime,
            endTime: item.endTime
        }
    })
    if (timeSplitInfo.length <= 1) {
        return barClips
    }

    const duration = appStore.curVideoInfo.mediaInfo.duration
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
        MessageShow.error(`no project info`)
        return
    }
    if (appStore.curSltVideo == null) {
        MessageShow.info('请先选择一个视频')
        return
    }
    util.stop_play()

    if (cutReq?.bDelFullVideo != null) {
        if (prjInfo.fileInfo.splitInfo != null) {
            prjInfo.fileInfo.splitInfo[0].isDelete = true
        }
    }

    const req: DataTypes.Req<DataTypes.Req_CutVideo> = {
        cmd: 'cut_video',
        data: prjInfo
    }
    const response = await IpcApi.trigger_event(req)
    if (response.code === 1001) {
        return
    }
    if (response.code !== 0) {
        MessageShow.success(`剪辑失败: ${response.status}`)
    } else {
        if (response.bOver === false) {
            MessageShow.info(`正在处理...`)
        } else {
            MessageShow.success(`剪辑成功`)
        }
    }
}

class Util {
    export_cut_video = export_cut_video
    set_video_cur_time = set_video_cur_time
    update_bar_clips = update_bar_clips
    updateKeyframeSplitInfo = updateKeyframeSplitInfo
    formatSecond2Time = formatSecond2Time

    private async updateAppInfo(appStartResp: DataTypes.AppStartResp): Promise<void> {
        appStore.appInfo = appStartResp.appInfo
        if (appStartResp.prj != null) {
            appStore.prj = appStartResp.prj
            console.log('get prj success ', appStartResp.prj)
            await util.search_file()
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
        //     MessageShow.error(`遍历文件夹失败`)
        //   }
        // } else {
        //   console.log('lastOpenedFolder is null')
        // }
    }

    async start_app(): Promise<DataTypes.Resp> {
        const resp = new DataTypes.Resp()
        const req: DataTypes.Req = { cmd: 'app_start' }
        const response: DataTypes.Resp<DataTypes.AppStartResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            return resp.err(response.status)
        }
        if (response.data == null) {
            return resp.err('app start resp data is null')
        }
        this.updateAppInfo(response.data)
        return resp
    }

    update_thumbnail_images(thumbnailImages: DataTypes.Thumbnail[]): void {
        if (appStore.curVideoInfo === null) {
            return
        }
        if (appStore.curVideoInfo.thumbnail?.path == null) {
            console.log('cur video thumbnail null')
            return
        }
        for (let i = 0; i < appStore.curVideoInfo.thumbnail.path.length; i++) {
            const thumb = appStore.curVideoInfo.thumbnail.path[i]
            const thumbInfo = new DataTypes.Thumbnail()
            thumbInfo.path = thumb
            thumbInfo.indexTime = DataTypes.FileTools.parse_timestr_2_seconds(thumb)
            thumbInfo.name = util.getFilenameFromPath(thumb)
            thumbInfo.btnName = '⬜'
            thumbnailImages.push(thumbInfo)
        }
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
        const appStatus = respData.appStatus
        if (appStore) {
            appStore.documentTitle = `${curTime} ${appStatus != null ? appStatus : ''}`
        }
        if (respData.workRespose != null) {
            if (respData.workRespose.length > 0) {
                console.log('process heartbeat', respData.workRespose)
            }
            for (const item of respData.workRespose) {
                util.process_work_response(item)
            }
        }
    }

    async delete_video(reqInfo: DataTypes.DeleteFileReq): Promise<void> {
        util.stop_play()
        const req: DataTypes.Req<DataTypes.DeleteFileReq> = {
            cmd: 'delete_video',
            data: reqInfo
        }
        const response = await IpcApi.trigger_event(req)
        if (response.code === 1001) {
            return
        }
        if (response.code !== 0) {
            MessageShow.success(`删除失败: ${response.status}`)
        } else {
            if (response.bOver === false) {
                MessageShow.info(`正在处理...`)
            } else {
                // MessageShow.success(`删除成功`)
            }
        }
    }

    async get_slt_video(video: DataTypes.File | null): Promise<void> {
        const processSplitInfo = (): void => {
            if (appStore?.curVideoInfo == null) {
                return
            }
            if (appStore?.curVideoInfo?.splitInfo?.splits != null) {
                // 从后台已经获取到了信息，就不用再处理了
                if (appStore.curVideoInfo.splitInfo.splits.length > 0) {
                    return
                }
            }
            // 如果后台没有标记信息，就需要把完整的视频分段添加到splitInfo中
            const duration = appStore?.curVideoInfo?.mediaInfo?.duration || 0
            const itemInfo = util.makeSplitInfo()
            itemInfo.endTime = duration
            itemInfo.duration = duration
            itemInfo.percent = 100
            itemInfo.frameNum = util.calculateCurFrameIdx(duration)
            if (appStore?.curVideoInfo?.splitInfo == null) {
                appStore.curVideoInfo.splitInfo = new DataTypes.SqlitInfos()
                if (appStore?.curVideoInfo?.splitInfo != null) {
                    appStore.curVideoInfo.splitInfo.splits = []
                }
            }
            if (appStore?.curVideoInfo?.splitInfo.splits != null) {
                appStore.curVideoInfo.splitInfo.splits.push(itemInfo)
                appStore.curVideoInfo.splitInfo.splits.sort((a, b) => a.percent - b.percent)
            }
        }
        if (video == null) {
            return
        }
        const req: DataTypes.Req<DataTypes.Req_SltFile> = {
            cmd: 'slt_video',
            data: {
                filepath: video.path
            }
        }
        const response: DataTypes.Resp<DataTypes.File> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            console.log('slect video failed', response)
        } else {
            if (response.bOver == false) {
                MessageShow.info(`正在处理...`)
                return
            }
            const respData: DataTypes.File | undefined = response.data
            if (respData == undefined) {
                MessageShow.error(`获取视频信息失败: ${response.status}`)
                console.log('slect video failed', response)
                return
            }
            appStore.curVideoInfo = respData
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
            cmd: 'create_prj',
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
            cmd: 'sync_prj',
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
            cmd: 'files_get',
            data: reqParam == null ? new DataTypes.FilesReq() : reqParam
        }
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            MessageShow.error(`获取文件列表失败: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                MessageShow.info(`正在处理...`)
                return response
            }
        }
        appStore.videoList = response.data?.files || []
        return response
    }

    async tags_get(
        reqParam: DataTypes.TagsReq | null
    ): Promise<DataTypes.Resp<DataTypes.TagsResp>> {
        const req: DataTypes.Req<DataTypes.TagsReq> = {
            cmd: 'tags_get',
            data: reqParam == null ? new DataTypes.TagsReq() : reqParam
        }
        const response: DataTypes.Resp<DataTypes.TagsResp> = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            MessageShow.error(`获取标签列表失败: ${response.status}`)
            return response
        } else {
            if (response.bOver == false) {
                MessageShow.info(`正在处理...`)
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
            cmd: 'file_tags_set',
            data: fileTags
        }
        const response: DataTypes.Resp = await IpcApi.trigger_event(req)
        if (response.code !== 0) {
            MessageShow.error(`设置标签失败: ${response.status}`)
        } else {
            if (response.bOver == false) {
                MessageShow.info(`正在处理...`)
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

            MessageShow.info(`设置标签成功`)
        }
    }

    processVideoEvent = processVideoEvent
    folder_file_proc = folder_file_proc
    getKeyFrameInfo = getKeyFrameInfo
    clear_cur_slt_video_info = clear_cur_slt_video_info
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
        //   MessageShow.error(showCtx)
        // } else {
        //   MessageShow.success(showCtx)
        // }

        // console.log('process_work_response', cmd, response)
        switch (cmd) {
            case 'open_folder':
                console.log('open folder', response)
                util.folder_file_proc(response)
                if (response.code !== 0) {
                    MessageShow.error(`打开文件夹失败: ${response.status}`)
                } else {
                    MessageShow.success(`打开文件夹成功: ${response.status}`)
                }
                break
            case 'traversal_folder':
                {
                    console.log('traversal folder', response)
                    util.folder_file_proc(response)
                    if (response.code !== 0) {
                        MessageShow.error(`更新文件夹: ${response.status}`)
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
                    MessageShow.error(`视频裁剪失败: ${response.status}`)
                    console.log('cut video failed', response)
                } else {
                    MessageShow.success(`视频裁剪完成:${response.status}`)
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
                        MessageShow.error(`删除失败: ${response.status}`)
                        console.log('cut video failed', response)
                    } else {
                        MessageShow.success(`删除完成:${response.status}`)
                        util.search_file()
                    }
                }
                break
            case 'get_key_frame_info':
                if (response.code !== 0) {
                    MessageShow.error(`获取关键帧信息失败: ${response.status}`)
                } else {
                    if (appStore) {
                        if (appStore.curVideoInfo == null) {
                            appStore.curVideoInfo = new DataTypes.File()
                        }
                        appStore.curVideoInfo.frameInfo = response.data
                    }
                    MessageShow.info(`获取关键帧信息完成:${response.status}`)
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

    async search_file(): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const req: DataTypes.Req<DataTypes.FilesReq> = {
            cmd: 'search_file'
        }
        req.data = DataTypes.FilesReq.makeReqStatusNotDel(null, null)
        if (appStore.prj.repoType == DataTypes.RepoType.Trash) {
            req.data = DataTypes.FilesReq.makeReqStatusDel(null)
        }
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code != 0) {
            MessageShow.error(`search file failed: ${response.status}`)
            console.log(`search file failed: ${response.status}`)
            return response
        }
        console.info('search file success', response.data)
        appStore.videoList = response.data?.files || []
        return response
    }
    async search_tag(): Promise<DataTypes.Resp<DataTypes.FilesResp>> {
        const req: DataTypes.Req<DataTypes.FilesReq> = {
            cmd: 'search_tag'
        }
        req.data = DataTypes.FilesReq.makeReqStatusNotDel(null, null)
        const response: DataTypes.Resp<DataTypes.FilesResp> = await IpcApi.trigger_event(req)
        if (response.code != 0) {
            MessageShow.error(`search file failed: ${response.status}`)
            console.log(`search file failed: ${response.status}`)
            return response
        }
        console.info('search file success', response.data)
        appStore.videoList = response.data?.files || []
        return response
    }
}

const util = new Util()
export default util
