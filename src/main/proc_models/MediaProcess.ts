import logger from './Logger'
import appCfg from './AppCfg'
import { app } from 'electron'
import { exec, execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as Dty from '../../bridge/dataTypedef'

async function getFrameInfo(filepath: string): Promise<Dty.Resp<Dty.FrameInfo>> {
    return new Promise((resolve, reject) => {
        const cmd = `${appCfg.ffprobeExe} -v error -i ${filepath} -skip_frame nokey -select_streams v -show_frames -show_entries frame=pict_type,pts_time -of json`
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject({ code: 1, status: error })
                return
            }
            if (stderr) {
                reject({ code: 1, status: new Error(stderr) })
                return
            }
            try {
                const jsonData = JSON.parse(stdout)
                jsonData.frames.forEach((frame: Dty.Frame) => {
                    frame.pts_time = frame.pts_time ? frame.pts_time : 0
                })
                const resp = new Dty.Resp<Dty.FrameInfo>()
                resp.success('success').data = jsonData
                resolve(resp)
            } catch (parseError) {
                reject({ code: 1, status: parseError })
            }
        })
    })
}

async function make_split_info(req: Dty.Req<Dty.Req_CutVideo>): Promise<Dty.Resp<CutSplitInfo[]>> {
    function processSplitInKeyFrame(
        splitInfo: CutSplitInfo[],
        keyFrameSplitInfo: Dty.Frame[]
    ): CutSplitInfo[] {
        const makeSartTime = (t: number): number => {
            return t < 0.0001 ? 0 : t - 0.0001
        }

        const splitCutInfo: CutSplitInfo[] = []
        for (let i = 0; i < splitInfo.length; i++) {
            const item = splitInfo[i]
            const startTime = item.startTime
            let lastKeyFrameTime = -1
            for (let j = 0; j < keyFrameSplitInfo.length; j++) {
                const keyFrameItem = keyFrameSplitInfo[j]
                if (keyFrameItem.pts_time === startTime) {
                    lastKeyFrameTime = keyFrameItem.pts_time
                    const cutInfoItem: CutSplitInfo = {
                        startTime: makeSartTime(startTime),
                        endTime: item.endTime
                    }
                    splitCutInfo.push(cutInfoItem)
                    lastKeyFrameTime = -1
                    break
                } else if (keyFrameItem.pts_time < startTime) {
                    lastKeyFrameTime = keyFrameItem.pts_time
                } else {
                    const cutInfoItem: CutSplitInfo = {
                        startTime: makeSartTime(lastKeyFrameTime),
                        endTime: item.endTime
                    }
                    splitCutInfo.push(cutInfoItem)
                    lastKeyFrameTime = -1
                    break
                }
            }
            if (lastKeyFrameTime !== -1) {
                const cutInfoItem: CutSplitInfo = {
                    startTime: makeSartTime(lastKeyFrameTime),
                    endTime: item.endTime
                }
                splitCutInfo.push(cutInfoItem)
            }
        }
        return splitCutInfo
    }

    const resp = new Dty.Resp<CutSplitInfo[]>()
    if (req.data?.fileInfo === undefined) {
        return resp.err('fileInfo is null')
    }

    const splitInfo = req.data.fileInfo.splitInfo?.splits
    let keyFrameSplitInfo = req.data.fileInfo?.frameInfo?.frames

    if (splitInfo?.length === 1) {
        const splitItemInfo = splitInfo[0]
        if (splitItemInfo.isDelete !== true) {
            return resp.success('success')
        }
        if (splitItemInfo.percent !== 100) {
            logger.warn(`you cut a video but not cut all, please check it: ${req.data.filepath}`)
        }
        const respData = {
            startTime: splitItemInfo.startTime,
            endTime: splitItemInfo.endTime
        }
        resp.success('success').data = [respData]
        return resp
    }

    if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
        logger.log('getFrameInfo: ', req.data.filepath)
        const kResp = await getFrameInfo(req.data.filepath)
        if (kResp.code !== 0) {
            logger.error('getFrameInfo err: ', kResp)
            return resp.err('getFrameInfo err')
        }
        keyFrameSplitInfo = kResp.data?.frames
    }
    if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
        logger.log('getFrameInfo err: ', keyFrameSplitInfo)
        return resp.err('getFrameInfo err')
    }
    if (!splitInfo || splitInfo.length === 0) {
        logger.log('cut video req: ', req)
        return resp.err('splitInfo is null')
    }
    splitInfo.sort((a, b) => a.startTime - b.startTime)
    const resvSplitInfo: CutSplitInfo[] = []
    let recvItem: CutSplitInfo = {
        startTime: 0.0001,
        endTime: 0
    }
    {
        for (let i = 0; i < splitInfo.length; i++) {
            const item = splitInfo[i]
            if (!item.isDelete) {
                if (recvItem.startTime === 0.0001) {
                    recvItem.startTime = item.startTime
                }
                recvItem.endTime = item.endTime
            } else {
                if (recvItem.endTime !== 0) {
                    resvSplitInfo.push(recvItem)
                }
                recvItem = {
                    startTime: 0.0001,
                    endTime: 0
                }
            }
        }
        if (recvItem.endTime !== 0) {
            resvSplitInfo.push(recvItem)
        }
    }
    logger.log('resvSplitInfo: ', resvSplitInfo)
    resp.success('success').data = processSplitInKeyFrame(resvSplitInfo, keyFrameSplitInfo)
    return resp
}

async function make_segment_split_info(
    req: Dty.Req<Dty.Req_CutVideo>
): Promise<Dty.Resp<CutSplitInfo[]>> {
    function findKeyFrameBefore(time: number, keyFrameSplitInfo: Dty.Frame[]): number {
        let lastKeyFrameTime = 0
        for (const frame of keyFrameSplitInfo) {
            if (frame.pts_time <= time) {
                lastKeyFrameTime = frame.pts_time
            } else {
                break
            }
        }
        return lastKeyFrameTime < 0.0001 ? 0 : lastKeyFrameTime - 0.0001
    }

    const resp = new Dty.Resp<CutSplitInfo[]>()
    if (req.data?.fileInfo === undefined) {
        return resp.err('fileInfo is null')
    }

    const splitInfo = req.data.fileInfo.splitInfo?.splits
    let keyFrameSplitInfo = req.data.fileInfo?.frameInfo?.frames

    if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
        logger.log('getFrameInfo: ', req.data.filepath)
        const kResp = await getFrameInfo(req.data.filepath)
        if (kResp.code !== 0) {
            logger.error('getFrameInfo err: ', kResp)
            return resp.err('getFrameInfo err')
        }
        keyFrameSplitInfo = kResp.data?.frames
    }
    if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
        logger.log('getFrameInfo err: ', keyFrameSplitInfo)
        return resp.err('getFrameInfo err')
    }
    if (!splitInfo || splitInfo.length === 0) {
        logger.log('cut video req: ', req)
        return resp.err('splitInfo is null')
    }

    splitInfo.sort((a, b) => a.startTime - b.startTime)
    const resvSplitInfo: CutSplitInfo[] = []

    for (const item of splitInfo) {
        if (!item.isDelete) {
            const startTime = findKeyFrameBefore(item.startTime, keyFrameSplitInfo)
            resvSplitInfo.push({
                startTime: startTime,
                endTime: item.endTime
            })
        }
    }

    logger.log('segmentSplitInfo: ', resvSplitInfo)
    resp.success('success').data = resvSplitInfo
    return resp
}

interface CutSplitInfo {
    startTime: number
    endTime: number
}

async function cutVideo(req: Dty.Req<Dty.Req_CutVideo>): Promise<Dty.Resp<Dty.Resp_CutVideo>> {
    const resp = new Dty.Resp<Dty.Resp_CutVideo>()
    if (!req.data?.filepath) {
        return resp.err('filepath is null')
    }
    const filepath = req.data.filepath
    const exportMode = req.data?.exportMode || Dty.ExportMode.Segment

    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const exportFolderName = `streamseek_${timestamp}`
    const userVideosPath = app.getPath('videos')
    const distFolderPath = path.join(userVideosPath, exportFolderName)

    function makeDistFileName(
        filepath: string,
        startTimeIn: number,
        endTimeIn: number,
        index: number
    ): string {
        const filename = path.basename(filepath)
        const startTime = Dty.FileTools.miFilenameParse(filename)?.startTime
        const baseStartTimeSec = Dty.FileTools.parse_timestr_2_seconds(
            startTime == null ? '' : startTime
        )
        const startTimeSec = startTimeIn + baseStartTimeSec
        const endTimeSec = endTimeIn + baseStartTimeSec
        const startTimeStr = Dty.FileTools.parse_seconds_2_timestr(startTimeSec)
        const endTimeStr = Dty.FileTools.parse_seconds_2_timestr(endTimeSec)
        const distFilename = `clip_${String(index + 1).padStart(2, '0')}_${startTimeStr}_${endTimeStr}.mp4`
        logger.log(
            `cut parameter, src filename:${filename}, startTime:${startTime}(${baseStartTimeSec}), clip start:${startTimeStr}(${startTimeSec}), end:${endTimeStr}(${endTimeSec}); dest filename:${distFilename}`
        )
        return distFilename
    }

    async function ensureFolder(folderPath: string): Promise<string> {
        try {
            await fs.promises.mkdir(folderPath, { recursive: true })
            return ''
        } catch (err) {
            return `create dir err: ${err}`
        }
    }

    const respStr = await ensureFolder(distFolderPath)
    if (respStr.length > 0) {
        return resp.err(respStr)
    }
    logger.info(`export folder: ${distFolderPath}`)

    let cutSplitInfo: CutSplitInfo[] = []
    {
        let makeResp: Dty.Resp<CutSplitInfo[]>
        if (exportMode === Dty.ExportMode.Merge) {
            makeResp = await make_split_info(req)
        } else {
            makeResp = await make_segment_split_info(req)
        }
        if (makeResp.code !== 0) {
            return resp.err(makeResp.status)
        }
        if (makeResp.data === undefined) {
            return resp
        }
        cutSplitInfo = makeResp.data
        if (!cutSplitInfo) {
            return resp.err('make_split_info err')
        }
        logger.log('splitCutInfo: ', cutSplitInfo)
        if (cutSplitInfo.length === 0) {
            return resp
        }
    }

    const splitFilepath: string[] = []
    for (let i = 0; i < cutSplitInfo.length; i++) {
        const item = cutSplitInfo[i]
        const distFilename = makeDistFileName(filepath, item.startTime, item.endTime, i)
        const distFilePath = path.join(distFolderPath, distFilename)
        const cmd = `${appCfg.ffmpegExe} -i "${filepath}" -v error -ss ${item.startTime} -to ${item.endTime} -c copy "${distFilePath}"`
        logger.log(cmd)
        await new Promise((resolve, reject) => {
            exec(cmd, (error) => {
                if (error) {
                    reject(error)
                    return
                }
                splitFilepath.push(distFilePath)
                resolve(undefined)
            })
        })
    }

    if (exportMode === Dty.ExportMode.Merge && splitFilepath.length > 1) {
        const concatListPath = path.join(distFolderPath, 'concat_list.txt')
        let concatContent = ''
        for (const item of splitFilepath) {
            concatContent += `file '${item.replace(/\\/g, '/')}'\n`
        }
        await fs.promises.writeFile(concatListPath, concatContent, 'utf-8')

        const mergedFilename = `merged_${timestamp}.mp4`
        const mergedFilePath = path.join(distFolderPath, mergedFilename)
        const concatCmd = `${appCfg.ffmpegExe} -f concat -safe 0 -i "${concatListPath}" -c copy "${mergedFilePath}"`
        logger.log(`merge command: ${concatCmd}`)

        await new Promise((resolve, reject) => {
            exec(concatCmd, (error) => {
                if (error) {
                    reject(error)
                    return
                }
                resolve(undefined)
            })
        })

        for (const item of splitFilepath) {
            await fs.promises.unlink(item)
        }
        await fs.promises.unlink(concatListPath)

        logger.info(`========== Export Completed ==========`)
        logger.info(`Export mode: Merge`)
        logger.info(`Export folder: ${distFolderPath}`)
        logger.info(`Merged video: ${mergedFilePath}`)
        logger.info(`======================================`)
        resp.data = {
            exportPath: distFolderPath
        }
    } else {
        logger.info(`========== Export Completed ==========`)
        logger.info(`Export mode: Segment`)
        logger.info(`Export folder: ${distFolderPath}`)
        logger.info(`Exported ${splitFilepath.length} video(s):`)
        for (let i = 0; i < splitFilepath.length; i++) {
            logger.info(`  [${i + 1}] ${splitFilepath[i]}`)
        }
        logger.info(`======================================`)
        resp.data = {
            exportPath: distFolderPath
        }
    }

    return resp.success('success')
}

class MediaProcess {
    cutVideo = cutVideo
    get_frame_info = getFrameInfo

    async getVideoInfo(filePath: string): Promise<Dty.MediaInfo> {
        const video_path = filePath
        const cmd = `${appCfg.ffprobeExe} -v error -of json -show_format -show_streams ${video_path}`
        const output = execSync(cmd).toString()
        const jsonData = JSON.parse(output)

        const mediaInfo: Dty.MediaInfo = {
            nb_streams: 0,
            duration: 0,
            size: 0,
            start_time: 0,
            bit_rate: 0,
            video: {
                codec_name: '',
                codec_type: '',
                width: 0,
                height: 0,
                pix_fmt: '',
                bit_rate: 0,
                frame_rate: 0,
                nb_frames: 0
            },
            audio: {
                codec_name: '',
                codec_type: '',
                sample_rate: 0,
                channels: 0,
                bit_rate: 0,
                channel_layout: ''
            }
        }

        interface StreamInfo {
            codec_type: string
            codec_name: string
            width?: number
            height?: number
            pix_fmt?: string
            bit_rate?: string
            r_frame_rate?: string
            duration?: string
            sample_rate?: string
            channels?: number
            channel_layout?: string
        }
        const videoStream = jsonData.streams.find(
            (stream: StreamInfo) => stream.codec_type === 'video'
        )
        if (!videoStream) {
            console.error('video stream not found')
        } else {
            mediaInfo.video.codec_name = videoStream.codec_name
            mediaInfo.video.codec_type = videoStream.codec_type
            mediaInfo.video.width = Number(videoStream.width)
            mediaInfo.video.height = Number(videoStream.height)
            mediaInfo.video.pix_fmt = videoStream.pix_fmt
            mediaInfo.video.bit_rate = Number(videoStream.bit_rate)

            const [numerator, denominator] = videoStream.r_frame_rate.split('/').map(Number)
            const frameRate = numerator / denominator
            mediaInfo.video.frame_rate = Number(frameRate)
            const duration = parseFloat(videoStream.duration)
            mediaInfo.video.nb_frames = duration * frameRate
        }
        const audioStream = jsonData.streams.find(
            (stream: StreamInfo) => stream.codec_type === 'audio'
        )
        if (!audioStream) {
            console.error('audio stream not found')
        } else {
            mediaInfo.audio.codec_name = audioStream.codec_name
            mediaInfo.audio.codec_type = audioStream.codec_type
            mediaInfo.audio.sample_rate = Number(audioStream.sample_rate)
            mediaInfo.audio.channels = Number(audioStream.channels)
            mediaInfo.audio.channel_layout = audioStream.channel_layout
            mediaInfo.audio.bit_rate = Number(audioStream.bit_rate)
        }
        mediaInfo.nb_streams = Number(jsonData.streams.length)
        mediaInfo.duration = Number(jsonData.format.duration)
        mediaInfo.size = Number(jsonData.format.size)
        mediaInfo.start_time = Number(jsonData.format.start_time)
        mediaInfo.bit_rate = Number(jsonData.format.bit_rate)
        return mediaInfo
    }
}

const mediaProc = new MediaProcess()
export default mediaProc
