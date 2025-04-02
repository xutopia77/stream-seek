import logger from './Logger.js'
import { TraversalFolder, workQueue } from './Utils.js'
import appCfg from './AppCfg.js'
import mediaProc from './MediaProcess.js'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import * as DataTypes from '../../bridge/dataTypedef'

// 检查文件记录时间是否连续
function check_record_time(files: DataTypes.FileInfo[]): void {
  // let lastStartTime: string = ''
  let lastEndTime: string = ''
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const parseRe = DataTypes.FileTools.parse_filename_mi(file.title)
    if (parseRe == null) {
      continue
    }
    const { startTime, endTime } = parseRe
    const lastEndTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(lastEndTime)
    const startTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(startTime)
    const timeDiff = Math.abs(startTimeSeconds - lastEndTimeSeconds)
    if (timeDiff > 1) {
      logger.log(
        `${i}file start time:${startTime} not continuous with ${i - 1}file end time ${lastEndTime}, diff seconds:${timeDiff}`
      )
    }
    // lastStartTime = startTime
    lastEndTime = endTime
  }
}

// 文件分类处理
async function file_classify(
  req: DataTypes.Req<DataTypes.Req_SearchFile>,
  files: DataTypes.FileInfo[]
): Promise<DataTypes.Resp> {
  const resp = new DataTypes.Resp()
  const folder = req.data?.folder
  if (folder === undefined) {
    return resp.err('folder is undefined')
  }

  // 计算文件信息
  function calculateFilesInfo(files: DataTypes.FileInfo[]): {
    totalSize: number
    totalCount: number
  } {
    // 计算媒体信息
    const filesInfo = {
      totalSize: 0,
      totalCount: 0
    }
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      filesInfo.totalSize += file.size
      filesInfo.totalCount += 1
    }
    return filesInfo
  }

  const filesInfo = calculateFilesInfo(files)

  // 排序文件
  const folderpath = folder
  const sortFiles = files.slice().sort((a, b) => {
    const startTimeA = DataTypes.FileTools.parse_filename_mi(a.title)?.startTime
    const startTimeB = DataTypes.FileTools.parse_filename_mi(b.title)?.startTime
    if (startTimeA === undefined) {
      return 0
    }
    if (startTimeB === undefined) {
      return 0
    }
    return startTimeA.localeCompare(startTimeB)
  })

  check_record_time(sortFiles)

  // 每 100 个文件一组进行分类
  function groupFiles(files: DataTypes.FileInfo[]): DataTypes.FileInfo[][] {
    const groupNum = 10
    const groupedFiles: DataTypes.FileInfo[][] = []
    for (let i = 0; i < files.length; i += groupNum) {
      groupedFiles.push(files.slice(i, i + groupNum))
    }
    return groupedFiles
  }

  // 创建文件夹并移动文件
  async function moveFilesToFolders(
    groupedFiles: DataTypes.FileInfo[][],
    baseDir: string
  ): Promise<void> {
    for (let i = 0; i < groupedFiles.length; i++) {
      const group = groupedFiles[i]
      const folderName = path.join(baseDir, String(i + 1))
      try {
        // 检查文件夹是否存在
        await fs.promises.access(folderName)
      } catch (error) {
        // 文件夹不存在，创建文件夹
        if (!error) {
          logger.log('folder exist')
        }
        try {
          await fs.promises.mkdir(folderName, { recursive: true })
        } catch (mkdirError) {
          console.error(`创建文件夹 ${folderName} 时出错:`, mkdirError)
          continue
        }
      }
      for (const file of group) {
        const sourcePath = file.filePath
        const fileName = path.basename(sourcePath)
        const destinationPath = path.join(folderName, fileName)
        try {
          // 移动文件
          await fs.promises.rename(sourcePath, destinationPath)
        } catch (renameError) {
          console.error(`移动文件 ${sourcePath} 到 ${destinationPath} 时出错:`, renameError)
        }
      }
    }
  }

  const baseDir = folderpath
  const groupedFiles = groupFiles(sortFiles)
  await moveFilesToFolders(groupedFiles, baseDir)

  const traversalFolder2 = new TraversalFolder()
  traversalFolder2.type = 'search'
  traversalFolder2.folder = folderpath
  const files2resp = await traversalFolder2.start()

  if (files2resp.code === 0) {
    if (files2resp.data?.files != null) {
      const filesInfo2 = calculateFilesInfo(files2resp.data.files)
      // 比较两个文件夹的信息
      let bEqual = true
      if (filesInfo.totalSize !== filesInfo2.totalSize) {
        logger.log('two folder total size are not equal')
        bEqual = false
      }
      if (filesInfo.totalCount !== filesInfo2.totalCount) {
        logger.log('two folder total count are not equal')
        bEqual = false
      }
      if (bEqual) {
        logger.log(
          `two folder are equal, file count ${filesInfo.totalCount}, size:${filesInfo.totalSize}B, ${filesInfo.totalSize / 1024 / 1024}MB, ${filesInfo.totalSize / 1024 / 1024 / 1024}GB`
        )
      } else {
        logger.log(
          `two folder are not equal, before file count ${filesInfo.totalCount}, size:${filesInfo.totalSize}B, ${filesInfo.totalSize / 1024 / 1024}MB, ${filesInfo.totalSize / 1024 / 1024 / 1024}GB`,
          `, after file count ${filesInfo2.totalCount}, size:${filesInfo2.totalSize}B, ${filesInfo2.totalSize / 1024 / 1024}MB, ${filesInfo2.totalSize / 1024 / 1024 / 1024}GB`
        )
      }
    }
  }
  return resp.success('file classify success')
}

async function gen_thumbnail(
  req: DataTypes.Req<DataTypes.Req_SearchFile>
): Promise<DataTypes.Resp> {
  logger.log('gen_thumbnail')
  const resp = new DataTypes.Resp()
  // 处理单个文件
  async function process_single_file(file: DataTypes.FileInfo): Promise<DataTypes.Resp> {
    const filepath = file.filePath
    const filename = file.title

    const thumbnail_dir = appCfg.thumbnail_dir
    const file_thubmbnail_dir = path.join(thumbnail_dir, path.basename(filepath, '.mp4'))

    let bExist = true
    // 检查对应的文件的缩略图是否已经存在
    try {
      await fs.promises.access(file_thubmbnail_dir)
    } catch (error) {
      if (!error) console.log(error)
      bExist = false
    }
    if (bExist) {
      return resp.success('thumbnail exist')
    }

    // 先删除临时文件夹，再创建新文件夹
    const tmp_thubmbnail_dir = path.join(thumbnail_dir, 'tmp')
    try {
      await fs.promises.access(tmp_thubmbnail_dir)
      await fs.promises.rm(tmp_thubmbnail_dir, { recursive: true })
    } catch (error) {
      if (!error) console.log(error)
    }
    try {
      await fs.promises.mkdir(tmp_thubmbnail_dir, { recursive: true })
    } catch (error) {
      logger.log(`mkdir error ${error}`)
      return resp.err(`mkdir error ${error}`)
    }
    const parseRe = DataTypes.FileTools.parse_filename_mi(filename)
    if (parseRe == null) {
      return resp.err(`parse filename error ${filename}`)
    }
    const { startTime, endTime } = parseRe
    const startTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(startTime)
    const endTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(endTime)
    const duration = endTimeSeconds - startTimeSeconds
    let time = 0
    let bOver = true
    while (time <= duration) {
      const picTime = startTimeSeconds + time
      const outputPath = path.join(
        tmp_thubmbnail_dir,
        `${DataTypes.FileTools.parsetimeToTimeStr(picTime)}.jpg`
      )
      const width = 640 // 设置图片宽度
      const height = 480 // 设置图片高度
      const args = [
        '-v',
        'error',
        '-ss',
        time.toString(),
        '-i',
        filepath,
        '-vframes',
        '1',
        '-s',
        `${width}x${height}`,
        outputPath
      ]

      try {
        await new Promise((resolve, reject) => {
          const child = execFile('ffmpeg', args, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve(undefined)
            }
          })
          child.on('close', () => {
            // 确保进程关闭
          })
        })
      } catch (error) {
        logger.log(`gen thumbnail error, ${error}`)
        bOver = false
        break
      }
      time += 10
    }
    if (!bOver) {
      return resp.err(`gen thumbnail error, ${filename}`)
    }

    // 移动文件到目标文件夹
    try {
      await fs.promises.rename(tmp_thubmbnail_dir, file_thubmbnail_dir)
    } catch (error) {
      logger.log(`move file error, ${error}`)
      return resp.err(`move file error, ${error}`)
    }
    return resp.success('success')
  }

  const folder = req.data?.folder
  if (folder === undefined) {
    return resp.err('folder is undefined')
  }
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = 'search'
  traversalFolder.folder = folder
  const filesResp = await traversalFolder.start()
  if (filesResp.code !== 0) {
    return resp.err(filesResp.status)
  }
  if (filesResp.data?.files != null) {
    const files = filesResp.data.files
    const fileNum = files.length
    let curProcIdx = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await process_single_file(file)
      curProcIdx += 1
      const interval = fileNum > 200 ? 1 : 10
      const curProcPercent = Math.floor((curProcIdx / fileNum) * 100)
      if (curProcPercent % interval === 0) {
        logger.log(`gen thumbnail ${curProcPercent}% ${curProcIdx}/${fileNum}`)
      }
    }
  }
  return resp.success('success')
}

async function query_images(filepath: string): Promise<DataTypes.Resp<DataTypes.TraversalFolder>> {
  const resp = new DataTypes.Resp<DataTypes.TraversalFolder>()
  const thumbnail_dir = appCfg.thumbnail_dir
  const file_thubmbnail_dir = path.join(thumbnail_dir, path.basename(filepath, '.mp4'))
  let bExist = true
  // 对应文件的缩略图存储在文件名对应的文件夹中， 文件夹不存在，返回错误
  try {
    await fs.promises.access(file_thubmbnail_dir)
  } catch (error) {
    if (!error) {
      logger.error('access error:', error)
    }
    bExist = false
  }
  if (!bExist) {
    return resp.err(`folder not exist ${file_thubmbnail_dir}`)
  }

  // 开始遍历缩略图的文件夹
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = 'search'
  traversalFolder.folder = file_thubmbnail_dir
  const response = await traversalFolder.start()
  if (response.code !== 0) {
    return response
  }
  if (response.data?.files == null) {
    return resp.err('not fund file')
  }
  // 缩略图安装时间排序
  response.data.files.sort((a, b) => {
    const timeA = DataTypes.FileTools.parse_filename_mi(a.title)?.startTime
    const timeB = DataTypes.FileTools.parse_filename_mi(b.title)?.startTime
    if (timeA === undefined) {
      return 0
    }
    if (timeB === undefined) {
      return 0
    }
    return timeA.localeCompare(timeB)
  })
  return response
}

// 开始切割视频
async function start_cut_video(
  req: DataTypes.Req<DataTypes.Req_CutVideo>
): Promise<DataTypes.Resp<string>> {
  mediaProc
    .cutVideo(req)
    .then((resp) => {
      console.log('cutVideo resp: ', resp)
      workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
    })
    .catch((error) => {
      workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
    })
  const resp = new DataTypes.Resp<string>()
  resp.code = 0
  resp.status = 'success'
  resp.bOver = false
  return resp
}

class RecordsProc {
  async start_file_classify(
    req: DataTypes.Req<DataTypes.Req_SearchFile>,
    files: DataTypes.FileInfo[]
  ): Promise<DataTypes.Resp> {
    await file_classify(req, files)
    await this.start_gen_thumbnail(req)
    return new DataTypes.Resp().success('success')
  }
  async start_gen_thumbnail(req: DataTypes.Req<DataTypes.Req_SearchFile>): Promise<DataTypes.Resp> {
    return await gen_thumbnail(req)
  }
  query_images = query_images
  start_cut_video = start_cut_video
}

const recordsProc = new RecordsProc()
export default recordsProc
