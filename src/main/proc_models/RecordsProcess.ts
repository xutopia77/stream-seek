import logger from './Logger.js'
import { TraversalFolder, util, workQueue } from './Utils.js'
import appCfg from './AppCfg.js'
import mediaProc from './MediaProcess.js'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'

// 定义响应对象类型
interface Response {
  code: number
  status: string | Error
  data?: any
}

// 定义文件对象类型
interface File {
  src: string
  title: string
  size: number
}

// 定义请求信息对象类型
interface RequestInfo {
  req: {
    data: {
      folder: string
    }
  }
  files: File[]
}

// 定义请求对象类型
interface Request {
  data: {
    folder: string
  }
  cmd: string
}

// 将秒数转换为特定格式的时间字符串
const parsetimeToTimeStr = (time: number): string => {
  // 将秒数转换为 Date 对象
  const date = new Date(time * 1000)

  // 提取年、月、日、时、分、秒并格式化为两位数字
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  // 组合成 20250323140336 格式的字符串
  const picTimeStr = `${year}${month}${day}${hour}${minute}${second}`
  return picTimeStr
}

// 检查文件记录时间是否连续
function check_record_time(files: File[]): void {
  let lastStartTime: string | null = null
  let lastEndTime: string | null = null
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    // 20250323140336
    const { startTime, endTime } = util.parse_filename_mi(file.title)
    if (lastStartTime === null) {
      lastStartTime = startTime
      lastEndTime = endTime
      continue
    }
    const lastEndTimeSeconds = util.parse_timestr_2_seconds(lastEndTime)
    const startTimeSeconds = util.parse_timestr_2_seconds(startTime)
    const timeDiff = Math.abs(startTimeSeconds - lastEndTimeSeconds)
    if (timeDiff > 1) {
      logger.log(
        `${i}file start time:${startTime} not continuous with ${i - 1}file end time ${lastEndTime}, diff seconds:${timeDiff}`
      )
    }
    lastStartTime = startTime
    lastEndTime = endTime
  }
}

// 文件分类处理
async function file_classify(reqInfo: RequestInfo): Promise<Response> {
  const { req, files } = reqInfo
  const folder = req.data.folder

  // 计算文件信息
  function calculateFilesInfo(files: File[]): { totalSize: number; totalCount: number } {
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
    const { startTime: startTimeA } = util.parse_filename_mi(a.title)
    const { startTime: startTimeB } = util.parse_filename_mi(b.title)
    return startTimeA.localeCompare(startTimeB)
  })

  check_record_time(sortFiles)

  // 每 100 个文件一组进行分类
  function groupFiles(files: File[]): File[][] {
    const groupNum = 10
    const groupedFiles: File[][] = []
    for (let i = 0; i < files.length; i += groupNum) {
      groupedFiles.push(files.slice(i, i + groupNum))
    }
    return groupedFiles
  }

  // 创建文件夹并移动文件
  async function moveFilesToFolders(groupedFiles: File[][], baseDir: string): Promise<void> {
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
        const sourcePath = file.src
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
  return { code: 0, status: 'success' }
}

// 生成缩略图
async function gen_thumbnail(req: Request): Promise<Response> {
  logger.log('gen_thumbnail')
  // 处理单个文件
  async function process_single_file(file: File): Promise<Response> {
    const filepath = file.src
    const filename = file.title

    const thumbnail_dir = appCfg.thumbnail_dir
    const file_thubmbnail_dir = path.join(thumbnail_dir, path.basename(filepath, '.mp4'))

    let bExist = true
    // 检查文件夹是否存在
    try {
      await fs.promises.access(file_thubmbnail_dir)
    } catch (error) {
      if (!error) console.log(error)
      bExist = false
    }
    if (bExist) {
      return { code: 0, status: 'folder exist' }
    }

    // 先删除临时文件夹，再创建新文件夹
    const tmp_thubmbnail_dir = path.join(thumbnail_dir, 'tmp')
    try {
      await fs.promises.access(tmp_thubmbnail_dir)
      await fs.promises.rm(tmp_thubmbnail_dir, { recursive: true })
    } catch (error) {
      if (!error) console.log(error)
      // 文件夹不存在，无需处理
    }
    try {
      await fs.promises.mkdir(tmp_thubmbnail_dir, { recursive: true })
    } catch (error) {
      logger.log(`mkdir error ${error}`)
      return { code: 1, status: `mkdir error ${error}` }
    }

    const { startTime, endTime } = util.parse_filename_mi(filename)
    const startTimeSeconds = util.parse_timestr_2_seconds(startTime)
    const endTimeSeconds = util.parse_timestr_2_seconds(endTime)
    const duration = endTimeSeconds - startTimeSeconds
    let time = 0
    let bOver = true
    while (time <= duration) {
      const picTime = startTimeSeconds + time
      const outputPath = path.join(tmp_thubmbnail_dir, `${parsetimeToTimeStr(picTime)}.jpg`)
      const width = 640 // 设置图片宽度
      const height = 480 // 设置图片高度
      const args = [
        '-ss',
        time.toString(),
        '-i',
        file.src,
        '-vframes',
        '1',
        '-s',
        `${width}x${height}`,
        outputPath
      ]

      try {
        await new Promise((resolve, reject) => {
          const child = execFile('ffmpeg', args, (error, stdout, stderr) => {
            if (error) {
              reject(error)
            } else {
              resolve()
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
      return { code: 1, status: `gen thumbnail error` }
    }

    // 移动文件到目标文件夹
    try {
      await fs.promises.rename(tmp_thubmbnail_dir, file_thubmbnail_dir)
    } catch (error) {
      logger.log(`move file error, ${error}`)
      return { code: 1, status: `move file error, ${error}` }
    }
    return { code: 0, status: 'success' }
  }

  const folder = req.data.folder
  const traversalFolder = new TraversalFolder()
  traversalFolder.type = 'search'
  traversalFolder.folder = folder
  const filesResp = await traversalFolder.start()
  if (filesResp.code !== 0) {
    return { code: 1, status: filesResp.status }
  }
  const files = filesResp.data.files
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    await process_single_file(file)
  }
  return { code: 0, status: 'success' }
}

// 查询图片
async function query_images(filepath: string): Promise<Response> {
  const thumbnail_dir = appCfg.thumbnail_dir
  const file_thubmbnail_dir = path.join(thumbnail_dir, path.basename(filepath, '.mp4'))
  let bExist = true
  // 检查文件夹是否存在
  try {
    await fs.promises.access(file_thubmbnail_dir)
  } catch (error) {
    if (!error) {
      logger.error('access error:', error)
    }
    bExist = false
  }
  if (!bExist) {
    return { code: 0, status: `folder not exist ${file_thubmbnail_dir}` }
  }

  const traversalFolder = new TraversalFolder()
  traversalFolder.type = 'search'
  traversalFolder.folder = file_thubmbnail_dir
  const response = await traversalFolder.start()
  if (response.code !== 0) {
    return response
  }

  // 从文件名中获取时间
  function getfileTimeFromeName(filename: string): string {
    const parts = filename.split('.')
    const timeStr = parts[0]
    return timeStr
  }

  const files = response.data.files
  const images: { filepath: string; time: string; indexTime: number }[] = []
  let firstIndexTime = 0
  if (files.length > 0) {
    firstIndexTime = util.parse_timestr_2_seconds(getfileTimeFromeName(files[0].title))
  }
  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i]
    const fileTimeStr = getfileTimeFromeName(fileItem.title)

    images.push({
      filepath: fileItem.src,
      time: fileTimeStr,
      indexTime: util.parse_timestr_2_seconds(fileTimeStr) - firstIndexTime
    })
  }
  images.sort((a, b) => {
    return a.time.localeCompare(b.time)
  })
  return { code: 0, status: 'success', data: { files: images } }
}

// 开始切割视频
async function start_cut_video(req: Request): Promise<Response> {
  mediaProc
    .cutVideo(req)
    .then((resp) => {
      console.log('cutVideo resp: ', resp)
      workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
    })
    .catch((error) => {
      workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
    })
  return { code: 0, status: 'success', bOver: false }
}

// 记录处理类
class RecordsProc {
  async start_file_classify(req: Request): Promise<Response> {
    await file_classify({ req, files: [] })
    return await this.start_gen_thumbnail(req)
  }
  async start_gen_thumbnail(req: Request): Promise<Response> {
    return await gen_thumbnail(req)
  }
  query_images = query_images
  start_cut_video = start_cut_video
}

const recordsProc = new RecordsProc()
export default recordsProc
