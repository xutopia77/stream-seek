import logger from './Logger'
import appCfg from './AppCfg'
import { util } from './Utils'
import { exec, execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as DataTypes from '../../bridge/dataTypedef'
// 定义响应对象的类型
interface Response {
  code: number
  status: string | Error
  data?: any
}

// 定义帧信息对象的类型
interface FrameInfo {
  pict_type: string
  pts_time: number
}

// 定义分割信息对象的类型
interface SplitInfo {
  startTime: number
  endTime: number
  isDelete?: boolean
}

// 定义文件信息对象的类型
interface FileInfo {
  splitInfo?: SplitInfo[]
  frameInfo?: {
    frames: FrameInfo[]
  }
}

// 定义请求对象的类型
interface Request {
  data: {
    filepath: string
    fileInfo: FileInfo
  }
}

// 获取帧信息
async function getFrameInfo(filepath: string): Promise<DataTypes.Resp<DataTypes.FrameInfo>> {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -i ${filepath} -skip_frame nokey -select_streams v -show_frames -show_entries frame=pict_type,pts_time -of json`
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
        jsonData.frames.forEach((frame: FrameInfo) => {
          frame.pts_time = frame.pts_time ? frame.pts_time : 0
        })
        resolve({ code: 0, status: 'success', data: jsonData })
      } catch (parseError) {
        reject({ code: 1, status: parseError })
      }
    })
  })
}

// 生成分割信息
async function make_split_info(req: Request): Promise<SplitInfo[] | Response> {
  const processSplitInKeyFrame = (
    splitInfo: SplitInfo[],
    keyFrameSplitInfo: FrameInfo[]
  ): SplitInfo[] => {
    const makeSartTime = (t: number): number => {
      return t < 0.0001 ? 0 : t - 0.0001
    }

    const splitCutInfo: SplitInfo[] = []
    for (let i = 0; i < splitInfo.length; i++) {
      const item = splitInfo[i]
      const startTime = item.startTime
      let lastKeyFrameTime = -1
      for (let j = 0; j < keyFrameSplitInfo.length; j++) {
        const keyFrameItem = keyFrameSplitInfo[j]
        if (keyFrameItem.pts_time === startTime) {
          lastKeyFrameTime = keyFrameItem.pts_time
          splitCutInfo.push({
            startTime: makeSartTime(startTime),
            endTime: item.endTime
          })
          lastKeyFrameTime = -1
          break
        } else if (keyFrameItem.pts_time < startTime) {
          lastKeyFrameTime = keyFrameItem.pts_time
        } else {
          splitCutInfo.push({
            startTime: makeSartTime(lastKeyFrameTime),
            endTime: item.endTime
          })
          lastKeyFrameTime = -1
          break
        }
      }
      if (lastKeyFrameTime !== -1) {
        splitCutInfo.push({
          startTime: makeSartTime(lastKeyFrameTime),
          endTime: item.endTime
        })
      }
    }
    return splitCutInfo
  }

  const splitInfo = req.data.fileInfo.splitInfo
  let keyFrameSplitInfo = req.data.fileInfo?.frameInfo?.frames
  if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
    const kResp = await getFrameInfo(req.data.filepath)
    if (kResp.code !== 0) {
      console.log('getFrameInfo err: ', kResp)
      return null
    }
    keyFrameSplitInfo = kResp.data.frames
  }
  if (!splitInfo || splitInfo.length === 0) {
    console.log('cut video req: ', req)
    return { code: 1, status: 'not find split info' }
  }
  splitInfo.sort((a, b) => a.startTime - b.startTime)
  const resvSplitInfo: SplitInfo[] = []
  let recvItem: SplitInfo = {
    startTime: 0,
    endTime: 0
  }

  for (let i = 0; i < splitInfo.length; i++) {
    const item = splitInfo[i]
    if (!item.isDelete) {
      if (recvItem.startTime === 0) {
        recvItem.startTime = item.startTime
      }
      recvItem.endTime = item.endTime
    } else {
      if (recvItem.endTime !== 0) {
        resvSplitInfo.push(recvItem)
      }
      recvItem = {
        startTime: 0,
        endTime: 0
      }
    }
  }
  if (recvItem.endTime !== 0) {
    resvSplitInfo.push(recvItem)
  }

  return processSplitInKeyFrame(resvSplitInfo, keyFrameSplitInfo)
}

// 切割视频
async function cutVideo(req: Request): Promise<DataTypes.Resp<string>> {
  const resp: DataTypes.Resp<string> = { code: 0, status: 'success' }
  const filepath = req.data.filepath

  function makeDistFileName(
    filepath: string,
    startTimeIn: number,
    endTimeIn: number
  ): string | null {
    const filename = path.basename(filepath)
    const startTime = util.parse_filename_mi(filename)?.startTime
    const baseStartTimeSec = util.parse_timestr_2_seconds(startTime == null ? '' : startTime)
    // startTimeSec和endTimeSec是毫秒，baseStartTimeSec是秒 现在要把startTimeSec和endTimeSec转换为秒
    const startTimeSec = startTimeIn + baseStartTimeSec
    const endTimeSec = endTimeIn + baseStartTimeSec
    logger.log(`filename ${filename}, startTime ${startTime}, baseStartTimeSec ${baseStartTimeSec}`)
    logger.log(
      `cut param: start ${startTimeIn}, end ${endTimeIn}, calc start ${startTimeSec}, end ${endTimeSec}`
    )
    if (startTimeSec >= endTimeSec) {
      logger.log(`startTimeSec > endTimeSec: ${startTimeSec}, ${endTimeSec}`)
      return null
    }
    // 现在把startTimeSec和endTimeSec转换为20250301104336格式的字符串
    const startTimeStr = util.parse_seconds_2_timestr(startTimeSec)
    const endTimeStr = util.parse_seconds_2_timestr(endTimeSec)
    const distFilename = `10_${startTimeStr}_${endTimeStr}.mp4`
    logger.log(`filename: ${filename}`)
    logger.log(
      `filename: ${filename}, startTime: ${startTime},${baseStartTimeSec}, startTimeSec:${startTimeStr},${startTimeSec}, endTimeSec:${endTimeStr},${endTimeSec}; ${distFilename}`
    )
    return distFilename
  }

  const splitCutInfo = await make_split_info(req)
  if (!splitCutInfo) {
    resp.code = 1
    resp.status = 'make_split_info err'
    return resp
  }
  console.log('splitCutInfo: ', splitCutInfo)
  const splitInfo = splitCutInfo as SplitInfo[]
  if (splitInfo.length === 0) {
    return resp
  }
  const distFolderPath = path.join(appCfg.appData, 'video_cut_tmp')
  try {
    await fs.promises.access(distFolderPath, fs.constants.F_OK)
    // 文件夹存在，先删除文件夹，再创建新文件夹
    try {
      await fs.promises.rm(distFolderPath, { recursive: true })
      await fs.promises.mkdir(distFolderPath, { recursive: true })
    } catch (rmErr) {
      console.error('remove dir err:', rmErr)
      resp.code = 1
      resp.status = String(rmErr)
      return resp
    }
  } catch (err) {
    if (err) {
      console.error('dir not exist:', distFolderPath)
    }
    try {
      await fs.promises.mkdir(distFolderPath, { recursive: true })
    } catch (mkdirErr) {
      console.error('create dir err:', mkdirErr)
      resp.code = 1
      resp.status = String(mkdirErr)
      return resp
    }
  }
  const splitFilepath: string[] = []
  for (let i = 0; i < splitInfo.length; i++) {
    const item = splitInfo[i]
    let distFilename = makeDistFileName(filepath, item.startTime, item.endTime)
    if (!distFilename) {
      resp.code = 1
      resp.status = 'makeDistFileName err'
      return resp
    }
    distFilename = path.join(distFolderPath, distFilename)
    const cmd = `ffmpeg -i ${filepath} -v error -ss ${item.startTime} -to ${item.endTime} -c copy ${distFilename}`
    console.log(cmd)
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error)
          return
        }
        if (stderr) {
          reject(new Error(stderr))
          return
        }
        splitFilepath.push(distFilename)
        resolve(undefined)
      })
    })
  }

  // 把splitFilepath中记录的文件全部放到txt中，然后使用ffmpeg -f concat -safe 0 -i files.txt -c copy output.mp4合并文件
  let filesTxt = ''
  for (let i = 0; i < splitFilepath.length; i++) {
    const item = splitFilepath[i]
    filesTxt += `file '${item}'\n`
  }

  const distFilename = path.join(distFolderPath, 'output.mp4')
  const filesTxtPath = path.join(distFolderPath, 'files.txt')
  await fs.promises.writeFile(filesTxtPath, filesTxt)
  const concatCmd = `ffmpeg -v error -f concat -safe 0 -i ${filesTxtPath} -c copy -reset_timestamps 1 ${distFilename}`
  console.log(concatCmd)
  await new Promise((resolve, reject) => {
    exec(concatCmd, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      if (stderr) {
        reject(new Error(stderr))
        return
      }
      resolve(undefined)
    })
  })
  return resp
}

class MediaProcess {
  // constructor() {}
  cutVideo = cutVideo
  get_frame_info = getFrameInfo

  async getVideoInfo(filePath: string): Promise<any> {
    // let video_path = 'D:/02_workspace/05_timeCapsule/01_stream_manager_ui/stream_manager_ui/src/data/00_20250310042708_20250310051906.mp4'
    const video_path = filePath
    const cmd = `ffprobe -v error -of json -show_format -show_streams ${video_path}`
    const output = execSync(cmd).toString()
    const jsonData = JSON.parse(output)

    const videoInfo: any = {}
    const videoStream = jsonData.streams.find((stream: any) => stream.codec_type === 'video')
    if (!videoStream) {
      console.error('未找到视频流')
    } else {
      videoInfo['codec_name'] = videoStream.codec_name
      videoInfo['codec_type'] = videoStream.codec_type
      videoInfo['width'] = videoStream.width
      videoInfo['height'] = videoStream.height
      videoInfo['pix_fmt'] = videoStream.pix_fmt
      videoInfo['bit_rate'] = videoStream.bit_rate

      const [numerator, denominator] = videoStream.r_frame_rate.split('/').map(Number)
      const frameRate = numerator / denominator
      videoInfo['frame_rate'] = frameRate
      const duration = parseFloat(videoStream.duration)
      videoInfo['nb_frames'] = duration * frameRate
    }
    const audioInfo: any = {}
    const audioStream = jsonData.streams.find((stream: any) => stream.codec_type === 'audio')
    if (!audioStream) {
      console.error('未找到音频流')
    } else {
      audioInfo['codec_name'] = audioStream.codec_name
      audioInfo['codec_type'] = audioStream.codec_type
      audioInfo['sample_rate'] = audioStream.sample_rate
      audioInfo['channels'] = audioStream.channels
      audioInfo['channel_layout'] = audioStream.channel_layout
      audioInfo['bit_rate'] = audioStream.bit_rate
    }

    const infoData = {
      nb_streams: jsonData.format.nb_streams,
      duration: jsonData.format.duration,
      size: jsonData.format.size,
      start_time: jsonData.format.start_time,
      bit_rate: jsonData.format.bit_rate,
      video: videoInfo,
      audio: audioInfo,
      frameInfo: null
    }
    return infoData
  }
}

console.log('MediaProcess.ts loaded')

const mediaProc = new MediaProcess()
export default mediaProc
