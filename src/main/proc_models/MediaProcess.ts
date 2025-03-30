import logger from './Logger'
import appCfg from './AppCfg'
import { util } from './Utils'
import { exec, execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as DataTypes from '../../bridge/dataTypedef'

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
        jsonData.frames.forEach((frame: DataTypes.Frame) => {
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
async function make_split_info(
  req: DataTypes.Req<DataTypes.Req_CutVideo>
): Promise<DataTypes.Resp<CutSplitInfo[]>> {
  const processSplitInKeyFrame = (
    splitInfo: CutSplitInfo[],
    keyFrameSplitInfo: DataTypes.Frame[]
  ): CutSplitInfo[] => {
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
  if (req.data?.fileInfo === undefined) {
    return { code: 1, status: 'fileInfo is null' }
  }

  const splitInfo = req.data.fileInfo.splitInfo
  let keyFrameSplitInfo = req.data.fileInfo?.frameInfo?.frames
  if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
    const kResp = await getFrameInfo(req.data.filepath)
    if (kResp.code !== 0) {
      console.log('getFrameInfo err: ', kResp)
      return { code: 1, status: 'getFrameInfo err' }
    }
    keyFrameSplitInfo = kResp.data?.frames
  }
  if (!keyFrameSplitInfo || keyFrameSplitInfo.length === 0) {
    console.log('getFrameInfo err: ', keyFrameSplitInfo)
    return { code: 1, status: 'getFrameInfo err' }
  }
  if (!splitInfo || splitInfo.length === 0) {
    console.log('cut video req: ', req)
    return { code: 1, status: 'not find split info' }
  }
  splitInfo.sort((a, b) => a.startTime - b.startTime)
  const resvSplitInfo: CutSplitInfo[] = []
  let recvItem: CutSplitInfo = {
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
  return {
    code: 0,
    status: 'success',
    data: processSplitInKeyFrame(resvSplitInfo, keyFrameSplitInfo)
  }
}

interface CutSplitInfo {
  startTime: number
  endTime: number
}

// 切割视频
async function cutVideo(
  req: DataTypes.Req<DataTypes.Req_CutVideo>
): Promise<DataTypes.Resp<string>> {
  const resp: DataTypes.Resp<string> = { code: 0, status: 'success' }
  if (!req.data?.filepath) {
    resp.code = 1
    resp.status = 'filepath is null'
    return resp
  }
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

  const makeResp: DataTypes.Resp<CutSplitInfo[]> = await make_split_info(req)
  if (makeResp.code !== 0) {
    resp.code = 1
    resp.status = makeResp.status
    return resp
  }
  const cutSplitInfo = makeResp.data
  if (!cutSplitInfo) {
    resp.code = 1
    resp.status = 'make_split_info err'
    return resp
  }
  console.log('splitCutInfo: ', cutSplitInfo)
  if (cutSplitInfo.length === 0) {
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
  for (let i = 0; i < cutSplitInfo.length; i++) {
    const item = cutSplitInfo[i]
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

  async getVideoInfo(filePath: string): Promise<DataTypes.MediaInfo> {
    // let video_path = 'D:/02_workspace/05_timeCapsule/01_stream_manager_ui/stream_manager_ui/src/data/00_20250310042708_20250310051906.mp4'
    const video_path = filePath
    const cmd = `ffprobe -v error -of json -show_format -show_streams ${video_path}`
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
    const videoStream = jsonData.streams.find((stream: StreamInfo) => stream.codec_type === 'video')
    if (!videoStream) {
      console.error('未找到视频流')
    } else {
      mediaInfo.video.codec_name = videoStream.codec_name
      mediaInfo.video.codec_type = videoStream.codec_type
      mediaInfo.video.width = videoStream.width
      mediaInfo.video.height = videoStream.height
      mediaInfo.video.pix_fmt = videoStream.pix_fmt
      mediaInfo.video.bit_rate = videoStream.bit_rate

      const [numerator, denominator] = videoStream.r_frame_rate.split('/').map(Number)
      const frameRate = numerator / denominator
      mediaInfo.video.frame_rate = frameRate
      const duration = parseFloat(videoStream.duration)
      mediaInfo.video.nb_frames = duration * frameRate
    }
    const audioStream = jsonData.streams.find((stream: StreamInfo) => stream.codec_type === 'audio')
    if (!audioStream) {
      console.error('未找到音频流')
    } else {
      mediaInfo.audio.codec_name = audioStream.codec_name
      mediaInfo.audio.codec_type = audioStream.codec_type
      mediaInfo.audio.sample_rate = audioStream.sample_rate
      mediaInfo.audio.channels = audioStream.channels
      mediaInfo.audio.channel_layout = audioStream.channel_layout
      mediaInfo.audio.bit_rate = audioStream.bit_rate
    }
    mediaInfo.nb_streams = jsonData.format.nb_streams
    mediaInfo.duration = jsonData.format.duration
    mediaInfo.size = jsonData.format.size
    mediaInfo.start_time = jsonData.format.start_time
    mediaInfo.bit_rate = jsonData.format.bit_rate
    return mediaInfo
  }
}

console.log('MediaProcess.ts loaded')

const mediaProc = new MediaProcess()
export default mediaProc
