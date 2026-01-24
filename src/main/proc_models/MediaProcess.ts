// import logger from './Logger'
import appCfg from './AppCfg'
import { exec, execSync } from 'child_process'
// import * as path from 'path'
// import * as fs from 'fs'
import * as DataTypes from '../../bridge/dataTypedef'
// import appDb from './AppDb'
// import { TraversalFolder } from './Utils.js'
// 获取帧信息
async function getFrameInfo(filepath: string): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
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
                // 遍历jsonData，把pts_time转换为数字
                jsonData.frames.forEach((frame: DataTypes.Frame) => {
                    frame.pts_time = frame.pts_time ? frame.pts_time : 0
                })
                const resp = new DataTypes.Resp<DataTypes.FrameInfo>()
                resp.success('success').data = jsonData
                resolve(resp)
            } catch (parseError) {
                reject({ code: 1, status: parseError })
            }
        })
    })
}

// // 生成分割信息
// async function make_split_info(
//     req: DataTypes.Req<DataTypes.Req_CutVideo>
// ): Promise<DataTypes.Resp<CutSplitInfo[]>> {
//     function processSplitInKeyFrame(
//         splitInfo: CutSplitInfo[],
//         keyFrameSplitInfo: DataTypes.Frame[]
//     ): CutSplitInfo[] {
//         const makeSartTime = (t: number): number => {
//             return t < 0.0001 ? 0 : t - 0.0001
//         }

//         const splitCutInfo: CutSplitInfo[] = []
//         // ------ process splitInfo
//         for (let i = 0; i < splitInfo.length; i++) {
//             const item = splitInfo[i]
//             const startTime = item.startTime
//             let lastKeyFrameTime = -1
//             for (let j = 0; j < keyFrameSplitInfo.length; j++) {
//                 const keyFrameItem = keyFrameSplitInfo[j]
//                 if (keyFrameItem.pts_time === startTime) {
//                     lastKeyFrameTime = keyFrameItem.pts_time
//                     const cutInfoItem: CutSplitInfo = {
//                         startTime: makeSartTime(startTime),
//                         endTime: item.endTime
//                     }
//                     splitCutInfo.push(cutInfoItem)
//                     lastKeyFrameTime = -1
//                     break
//                 } else if (keyFrameItem.pts_time < startTime) {
//                     lastKeyFrameTime = keyFrameItem.pts_time
//                 } else {
//                     const cutInfoItem: CutSplitInfo = {
//                         startTime: makeSartTime(lastKeyFrameTime),
//                         endTime: item.endTime
//                     }
//                     splitCutInfo.push(cutInfoItem)
//                     lastKeyFrameTime = -1
//                     break
//                 }
//             }
//             if (lastKeyFrameTime !== -1) {
//                 const cutInfoItem: CutSplitInfo = {
//                     startTime: makeSartTime(lastKeyFrameTime),
//                     endTime: item.endTime
//                 }
//                 splitCutInfo.push(cutInfoItem)
//             }
//         }
//         return splitCutInfo
//     }

//     const resp = new DataTypes.Resp<CutSplitInfo[]>()
//     if (req.data?.fileInfo === undefined) {
//         return resp.err('fileInfo is null')
//     }

//     const splitInfo = req.data.fileInfo.splitInfo?.splits
//     let keyFrameSplitInfo = req.data.fileInfo?.frameInfo?.frames

//     if (splitInfo?.length === 1) {
//         const splitItemInfo = splitInfo[0]
//         if (splitItemInfo.isDelete !== true) {
//             return resp.success('success')
//         }
//         if (splitItemInfo.percent !== 100) {
//             logger.warn(`you cut a video but not cut all, please check it: ${req.data.filepath}`)
//         }
//         const respData = {
//             startTime: splitItemInfo.startTime,
//             endTime: splitItemInfo.endTime
//         }
//         resp.success('success').data = [respData]
//         return resp
//     }

//     if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
//         logger.log('getFrameInfo: ', req.data.filepath)
//         const kResp = await getFrameInfo(req.data.filepath)
//         if (kResp.code !== 0) {
//             logger.error('getFrameInfo err: ', kResp)
//             return resp.err('getFrameInfo err')
//         }
//         keyFrameSplitInfo = kResp.data?.frames
//     }
//     if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
//         logger.log('getFrameInfo err: ', keyFrameSplitInfo)
//         return resp.err('getFrameInfo err')
//     }
//     if (!splitInfo || splitInfo.length === 0) {
//         logger.log('cut video req: ', req)
//         return resp.err('splitInfo is null')
//     }
//     splitInfo.sort((a, b) => a.startTime - b.startTime)
//     const resvSplitInfo: CutSplitInfo[] = []
//     let recvItem: CutSplitInfo = {
//         startTime: 0.0001, //Avoid losing the first fragment
//         endTime: 0
//     }
//     //------ Merge the segment information and remove the deleted segment
//     {
//         for (let i = 0; i < splitInfo.length; i++) {
//             const item = splitInfo[i]
//             if (!item.isDelete) {
//                 if (recvItem.startTime === 0.0001) {
//                     recvItem.startTime = item.startTime
//                 }
//                 recvItem.endTime = item.endTime
//             } else {
//                 if (recvItem.endTime !== 0) {
//                     resvSplitInfo.push(recvItem)
//                 }
//                 recvItem = {
//                     startTime: 0.0001,
//                     endTime: 0
//                 }
//             }
//         }
//         if (recvItem.endTime !== 0) {
//             resvSplitInfo.push(recvItem)
//         }
//     }
//     logger.log('resvSplitInfo: ', resvSplitInfo)
//     resp.success('success').data = processSplitInKeyFrame(resvSplitInfo, keyFrameSplitInfo)
//     return resp
// }

// interface CutSplitInfo {
//     startTime: number
//     endTime: number
// }

// async function traversalFolderByFolder(
//     baseFolder: string
// ): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
//     const traversalFolder = new TraversalFolder()
//     traversalFolder.folder = baseFolder
//     const traversalResp: DataTypes.Resp<DataTypes.TraversalFolder> = await traversalFolder.start()
//     return traversalResp
// }
// async function make_trash_folder(folderPath: string): Promise<string> {
//     try {
//         await fs.promises.access(folderPath, fs.constants.F_OK)
//     } catch (err) {
//         if (err) {
//             await fs.promises.mkdir(folderPath, { recursive: true })
//         }
//     }
//     try {
//         await fs.promises.access(folderPath, fs.constants.F_OK)
//     } catch (err) {
//         if (err) {
//             logger.error('trash dir not exist:', folderPath)
//             return `trash dir not exist: ${folderPath}`
//         }
//     }
//     return ''
// }

// async function cutVideo(
//     req: DataTypes.Req<DataTypes.Req_CutVideo>
// ): Promise<DataTypes.Resp<DataTypes.Resp_CutVideo>> {
//     const resp = new DataTypes.Resp<DataTypes.Resp_CutVideo>()
//     if (!req.data?.filepath) {
//         return resp.err('filepath is null')
//     }
//     if (!req.data?.baseFolder || req.data?.baseFolder.length === 0) {
//         return resp.err('baseFolder is null')
//     }
//     const filepath = req.data.filepath
//     const baseFolder = req.data.baseFolder
//     const trashFolderPath = path.join(baseFolder, '.trash')
//     const distFolderPath = path.join(appCfg.appData, 'video_cut_tmp')

//     function makeDistFileName(
//         filepath: string,
//         startTimeIn: number,
//         endTimeIn: number
//     ): string | null {
//         const filename = path.basename(filepath)
//         const startTime = DataTypes.FileTools.parse_filename_mi(filename)?.startTime
//         const baseStartTimeSec = DataTypes.FileTools.parse_timestr_2_seconds(
//             startTime == null ? '' : startTime
//         )
//         // startTimeSec和endTimeSec是毫秒，baseStartTimeSec是秒 现在要把startTimeSec和endTimeSec转换为秒
//         const startTimeSec = startTimeIn + baseStartTimeSec
//         const endTimeSec = endTimeIn + baseStartTimeSec
//         if (startTimeSec >= endTimeSec) {
//             logger.log(`Type of startTimeSec: ${typeof startTimeSec}`)
//             logger.log(`Type of endTimeSec: ${typeof endTimeSec}`)
//             logger.log(`startTimeSec > endTimeSec: ${startTimeSec}, ${endTimeSec}`)
//             logger.log(`startTimeIn > endTimeIn: ${startTimeIn}, ${endTimeIn}`)
//             return null
//         }
//         // 现在把startTimeSec和endTimeSec转换为20250301104336格式的字符串
//         const startTimeStr = DataTypes.FileTools.parse_seconds_2_timestr(startTimeSec)
//         const endTimeStr = DataTypes.FileTools.parse_seconds_2_timestr(endTimeSec)
//         const distFilename = `10_${startTimeStr}_${endTimeStr}.mp4`
//         logger.log(
//             `cut parameter, src filename:${filename}, startTime:${startTime}(${baseStartTimeSec}), clip start:${startTimeStr}(${startTimeSec}), end:${endTimeStr}(${endTimeSec}); dest filename:${distFilename}`
//         )
//         return distFilename
//     }

//     async function clean_tmp_folder(folderPath: string): Promise<string> {
//         try {
//             await fs.promises.access(folderPath, fs.constants.F_OK)
//             // 文件夹存在，先删除文件夹，再创建新文件夹
//             try {
//                 await fs.promises.rm(folderPath, { recursive: true })
//                 await fs.promises.mkdir(folderPath, { recursive: true })
//             } catch (rmErr) {
//                 console.error('remove dir err:', rmErr)
//                 return `remove dir err: ${rmErr}`
//             }
//         } catch (err) {
//             if (err) {
//                 console.error('dir not exist:', folderPath)
//             }
//             try {
//                 await fs.promises.mkdir(folderPath, { recursive: true })
//             } catch (mkdirErr) {
//                 console.error('create dir err:', mkdirErr)
//                 return `create dir err: ${mkdirErr}`
//             }
//         }
//         return ''
//     }

//     //------ make or check trash folder
//     const resp_str = await make_trash_folder(trashFolderPath)
//     if (resp_str.length > 0) {
//         return resp.err(resp_str)
//     }
//     //------ make cut destination folder
//     const respStr = await clean_tmp_folder(distFolderPath)
//     if (respStr.length > 0) {
//         return resp.err(respStr)
//     }
//     //------ make cut split info
//     let cutSplitInfo: CutSplitInfo[] = []
//     {
//         const makeResp: DataTypes.Resp<CutSplitInfo[]> = await make_split_info(req)
//         if (makeResp.code !== 0) {
//             return resp.err(makeResp.status)
//         }
//         if (makeResp.data === undefined) {
//             return resp
//         }
//         cutSplitInfo = makeResp.data
//         if (!cutSplitInfo) {
//             return resp.err('make_split_info err')
//         }
//         logger.log('splitCutInfo: ', cutSplitInfo)
//         if (cutSplitInfo.length === 0) {
//             return resp
//         }
//     }

//     //------ cut single video
//     if (cutSplitInfo.length === 1) {
//         // if( req.data?.fileInfo.splitInfo === 0.0001) {
//         const filename = path.basename(filepath)
//         const distFilename = path.join(trashFolderPath, filename)
//         let attempts = 0
//         const maxAttempts = 3 // 最大尝试次数
//         async function attemptRename(): Promise<void> {
//             try {
//                 await fs.promises.rename(filepath, distFilename)
//                 logger.log(`delete original video: ${filepath}, move to ${distFilename}`)
//             } catch (err) {
//                 attempts++
//                 if (attempts < maxAttempts) {
//                     logger.error(
//                         `move original video attempt ${attempts} failed, retrying in 1 second...`,
//                         err
//                     )
//                     await new Promise((resolve) => setTimeout(resolve, 1000))
//                     await attemptRename()
//                 } else {
//                     logger.error('move original video err after multiple attempts:', err)
//                     throw err
//                 }
//             }
//         }
//         try {
//             await attemptRename()
//         } catch (err) {
//             return resp.err(`move original video err ${err}`)
//         }
//         const respData: DataTypes.Resp_CutVideo = {
//             traversalResp: await traversalFolderByFolder(baseFolder)
//         }
//         resp.data = respData
//         return resp
//     }

//     const splitFilepath: string[] = []
//     //------ start cut video
//     {
//         for (let i = 0; i < cutSplitInfo.length; i++) {
//             const item = cutSplitInfo[i]
//             let distFilename = makeDistFileName(filepath, item.startTime, item.endTime)
//             if (!distFilename) {
//                 return resp.err('makeDistFileName err')
//             }
//             distFilename = path.join(distFolderPath, distFilename)
//             const cmd = `${appCfg.ffmpegExe} -i ${filepath} -v error -ss ${item.startTime} -to ${item.endTime} -c copy ${distFilename}`
//             logger.log(cmd)
//             await new Promise((resolve, reject) => {
//                 exec(cmd, (error) => {
//                     if (error) {
//                         reject(error)
//                         return
//                     }
//                     splitFilepath.push(distFilename)
//                     resolve(undefined)
//                 })
//             })
//         }
//     }

//     //------ process video after cut
//     {
//         // 1 move the cut video to the dist folder
//         for (const item of splitFilepath) {
//             const filename = path.basename(item)
//             const distFilename = path.join(baseFolder, filename)
//             await fs.promises.rename(item, distFilename)
//             logger.info(`move cut video: ${item}, move to ${distFilename}`)
//         }
//         // 2 delete original video
//         {
//             const filename = path.basename(filepath)
//             const distFilename = path.join(trashFolderPath, filename)

//             try {
//                 await fs.promises.access(filepath, fs.constants.F_OK)
//             } catch (err) {
//                 if (err) {
//                     console.error('original video not exist:', filepath)
//                 }
//                 return resp.err('original video not exist')
//             }
//             // 删除原视频文件
//             // 移动原视频文件到.trash文件夹
//             try {
//                 await fs.promises.rename(filepath, distFilename)
//             } catch (err) {
//                 console.error('move original video err:', err)
//                 return resp.err('move original video err')
//             }
//             logger.log(`delete original video: ${filepath}, move to ${distFilename}`)
//         }
//     }
//     //------ traversal folder after cut
//     {
//         const respData: DataTypes.Resp_CutVideo = {
//             traversalResp: await traversalFolderByFolder(baseFolder)
//         }
//         resp.data = respData
//     }

//     // //------ 把splitFilepath中记录的文件全部放到txt中，然后使用ffmpeg -f concat -safe 0 -i files.txt -c copy output.mp4合并文件
//     // {
//     //   let filesTxt = ''
//     //   for (let i = 0; i < splitFilepath.length; i++) {
//     //     const item = splitFilepath[i]
//     //     filesTxt += `file '${item}'\n`
//     //   }
//     //   const distFilename = path.join(distFolderPath, 'output.mp4')
//     //   const filesTxtPath = path.join(distFolderPath, 'files.txt')
//     //   await fs.promises.writeFile(filesTxtPath, filesTxt)
//     //   const concatCmd = `${appCfg.ffmpegExe} -v error -f concat -safe 0 -i ${filesTxtPath} -c copy -reset_timestamps 1 ${distFilename}`
//     //   logger.log(concatCmd)
//     //   await new Promise((resolve, reject) => {
//     //     exec(concatCmd, (error, stdout, stderr) => {
//     //       if (error) {
//     //         reject(error)
//     //         return
//     //       }
//     //       if (stderr) {
//     //         reject(new Error(stderr))
//     //         return
//     //       }
//     //       resolve(undefined)
//     //     })
//     //   })
//     // }

//     return resp.success('success')
// }

class MediaProcess {
    // constructor() {}
    // cutVideo = cutVideo
    get_frame_info = getFrameInfo

    async getVideoInfo(filePath: string): Promise<DataTypes.MediaInfo> {
        // let video_path = 'D:/02_workspace/05_timeCapsule/01_stream_manager_ui/stream_manager_ui/src/data/00_20250310042708_20250310051906.mp4'
        const video_path = filePath
        const cmd = `${appCfg.ffprobeExe} -v error -of json -show_format -show_streams ${video_path}`
        const output = execSync(cmd).toString()
        const jsonData = JSON.parse(output)

        const mediaInfo: DataTypes.MediaInfo = {
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
            console.error('未找到视频流')
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
            console.error('未找到音频流')
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
