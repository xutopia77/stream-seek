import logger from './Logger'
import appCfg from './AppCfg'
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

async function make_split_info(
    req: Dty.Req<Dty.Req_CutVideo>
): Promise<Dty.Resp<CutSplitInfo[]>> {
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

interface CutSplitInfo {
    startTime: number
    endTime: number
}

async function traversalFolderByFolder(
    baseFolder: string
): Promise<Dty.Resp<Dty.TraversalFolder>> {
    const resp = new Dty.Resp<Dty.TraversalFolder>()
    try {
        const files = await fs.promises.readdir(baseFolder)
        const fileList: Dty.File[] = []
        for (const file of files) {
            const filePath = path.join(baseFolder, file)
            try {
                const stats = await fs.promises.stat(filePath)
                if (stats.isFile()) {
                    fileList.push({
                        name: file,
                        path: filePath,
                        size: stats.size
                    } as Dty.File)
                }
            } catch {
                // skip files that can't be accessed
            }
        }
        resp.success('success').data = {
            folder: baseFolder,
            files: fileList
        }
    } catch (err) {
        resp.err(`failed to traverse folder: ${err}`)
    }
    return resp
}

async function make_trash_folder(folderPath: string): Promise<string> {
    try {
        await fs.promises.access(folderPath, fs.constants.F_OK)
    } catch (err) {
        if (err) {
            await fs.promises.mkdir(folderPath, { recursive: true })
        }
    }
    try {
        await fs.promises.access(folderPath, fs.constants.F_OK)
    } catch (err) {
        if (err) {
            logger.error('trash dir not exist:', folderPath)
            return `trash dir not exist: ${folderPath}`
        }
    }
    return ''
}

async function cutVideo(
    req: Dty.Req<Dty.Req_CutVideo>
): Promise<Dty.Resp<Dty.Resp_CutVideo>> {
    const resp = new Dty.Resp<Dty.Resp_CutVideo>()
    if (!req.data?.filepath) {
        return resp.err('filepath is null')
    }
    if (!req.data?.baseFolder || req.data?.baseFolder.length === 0) {
        return resp.err('baseFolder is null')
    }
    const filepath = req.data.filepath
    const baseFolder = req.data.baseFolder
    const trashFolderPath = path.join(baseFolder, '.trash')
    const distFolderPath = path.join(appCfg.appData, 'video_cut_tmp')

    function makeDistFileName(
        filepath: string,
        startTimeIn: number,
        endTimeIn: number
    ): string | null {
        const filename = path.basename(filepath)
        const startTime = Dty.FileTools.miFilenameParse(filename)?.startTime
        const baseStartTimeSec = Dty.FileTools.parse_timestr_2_seconds(
            startTime == null ? '' : startTime
        )
        const startTimeSec = startTimeIn + baseStartTimeSec
        const endTimeSec = endTimeIn + baseStartTimeSec
        if (startTimeSec >= endTimeSec) {
            logger.log(`Type of startTimeSec: ${typeof startTimeSec}`)
            logger.log(`Type of endTimeSec: ${typeof endTimeSec}`)
            logger.log(`startTimeSec > endTimeSec: ${startTimeSec}, ${endTimeSec}`)
            logger.log(`startTimeIn > endTimeIn: ${startTimeIn}, ${endTimeIn}`)
            return null
        }
        const startTimeStr = Dty.FileTools.parse_seconds_2_timestr(startTimeSec)
        const endTimeStr = Dty.FileTools.parse_seconds_2_timestr(endTimeSec)
        const distFilename = `10_${startTimeStr}_${endTimeStr}.mp4`
        logger.log(
            `cut parameter, src filename:${filename}, startTime:${startTime}(${baseStartTimeSec}), clip start:${startTimeStr}(${startTimeSec}), end:${endTimeStr}(${endTimeSec}); dest filename:${distFilename}`
        )
        return distFilename
    }

    async function clean_tmp_folder(folderPath: string): Promise<string> {
        try {
            await fs.promises.access(folderPath, fs.constants.F_OK)
            try {
                await fs.promises.rm(folderPath, { recursive: true })
                await fs.promises.mkdir(folderPath, { recursive: true })
            } catch (rmErr) {
                console.error('remove dir err:', rmErr)
                return `remove dir err: ${rmErr}`
            }
        } catch (err) {
            if (err) {
                console.error('dir not exist:', folderPath)
            }
            try {
                await fs.promises.mkdir(folderPath, { recursive: true })
            } catch (mkdirErr) {
                console.error('create dir err:', mkdirErr)
                return `create dir err: ${mkdirErr}`
            }
        }
        return ''
    }

    const resp_str = await make_trash_folder(trashFolderPath)
    if (resp_str.length > 0) {
        return resp.err(resp_str)
    }
    const respStr = await clean_tmp_folder(distFolderPath)
    if (respStr.length > 0) {
        return resp.err(respStr)
    }
    let cutSplitInfo: CutSplitInfo[] = []
    {
        const makeResp: Dty.Resp<CutSplitInfo[]> = await make_split_info(req)
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

    if (cutSplitInfo.length === 1) {
        const filename = path.basename(filepath)
        const distFilename = path.join(trashFolderPath, filename)
        let attempts = 0
        const maxAttempts = 3
        async function attemptRename(): Promise<void> {
            try {
                await fs.promises.rename(filepath, distFilename)
                logger.log(`delete original video: ${filepath}, move to ${distFilename}`)
            } catch (err) {
                attempts++
                if (attempts < maxAttempts) {
                    logger.error(
                        `move original video attempt ${attempts} failed, retrying in 1 second...`,
                        err
                    )
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                    await attemptRename()
                } else {
                    logger.error('move original video err after multiple attempts:', err)
                    throw err
                }
            }
        }
        try {
            await attemptRename()
        } catch (err) {
            return resp.err(`move original video err ${err}`)
        }
        const respData: Dty.Resp_CutVideo = {
            traversalResp: await traversalFolderByFolder(baseFolder)
        }
        resp.data = respData
        return resp
    }

    const splitFilepath: string[] = []
    {
        for (let i = 0; i < cutSplitInfo.length; i++) {
            const item = cutSplitInfo[i]
            let distFilename = makeDistFileName(filepath, item.startTime, item.endTime)
            if (!distFilename) {
                return resp.err('makeDistFileName err')
            }
            distFilename = path.join(distFolderPath, distFilename)
            const cmd = `${appCfg.ffmpegExe} -i ${filepath} -v error -ss ${item.startTime} -to ${item.endTime} -c copy ${distFilename}`
            logger.log(cmd)
            await new Promise((resolve, reject) => {
                exec(cmd, (error) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    splitFilepath.push(distFilename)
                    resolve(undefined)
                })
            })
        }
    }

    {
        for (const item of splitFilepath) {
            const filename = path.basename(item)
            const distFilename = path.join(baseFolder, filename)
            await fs.promises.rename(item, distFilename)
            logger.info(`move cut video: ${item}, move to ${distFilename}`)
        }
        {
            const filename = path.basename(filepath)
            const distFilename = path.join(trashFolderPath, filename)

            try {
                await fs.promises.access(filepath, fs.constants.F_OK)
            } catch (err) {
                if (err) {
                    console.error('original video not exist:', filepath)
                }
                return resp.err('original video not exist')
            }
            try {
                await fs.promises.rename(filepath, distFilename)
            } catch (err) {
                console.error('move original video err:', err)
                return resp.err('move original video err')
            }
            logger.log(`delete original video: ${filepath}, move to ${distFilename}`)
        }
    }
    {
        const respData: Dty.Resp_CutVideo = {
            traversalResp: await traversalFolderByFolder(baseFolder)
        }
        resp.data = respData
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
