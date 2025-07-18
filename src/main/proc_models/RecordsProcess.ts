import logger from './Logger.js'
// import { workQueue } from './Utils.js'
import appCfg from './AppCfg.js'
import appDb from './AppDb'
// import mediaProc from './MediaProcess.js'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import * as DataTypes from '../../bridge/dataTypedef'

// async function checkFileExists(filePath: string): Promise<boolean> {
//     try {
//         // 尝试访问文件
//         await fs.promises.access(filePath, fs.constants.F_OK)
//         return true
//     } catch (error) {
//         if (!error) {
//             logger.log('access error:', error)
//         }
//         return false
//     }
// }

// // 检查文件记录时间是否连续
// function check_record_time(files: DataTypes.FileInfo[]): void {
//     // let lastStartTime: string = ''
//     let lastEndTime: string = ''
//     for (let i = 0; i < files.length; i++) {
//         const file = files[i]
//         const parseRe = DataTypes.FileTools.parse_filename_mi(file.title)
//         if (parseRe == null) {
//             continue
//         }
//         const { startTime, endTime } = parseRe
//         const lastEndTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(lastEndTime)
//         const startTimeSeconds = DataTypes.FileTools.parse_timestr_2_seconds(startTime)
//         const timeDiff = Math.abs(startTimeSeconds - lastEndTimeSeconds)
//         if (timeDiff > 1) {
//             logger.log(
//                 `${i}file start time:${startTime} not continuous with ${i - 1}file end time ${lastEndTime}, diff seconds:${timeDiff}`
//             )
//         }
//         // lastStartTime = startTime
//         lastEndTime = endTime
//     }
// }

// // 文件分类处理
// async function file_classify(
//     req: DataTypes.Req<DataTypes.Req_SearchFile>,
//     files: DataTypes.FileInfo[]
// ): Promise<DataTypes.Resp> {
//     const resp = new DataTypes.Resp()
//     const folderpath = req.data?.folder
//     if (folderpath === undefined) {
//         return resp.err('folder is undefined')
//     }

//     function calculateFilesInfo(files: DataTypes.FileInfo[]): {
//         totalSize: number
//         totalCount: number
//     } {
//         // 计算媒体信息
//         const filesInfo = {
//             totalSize: 0,
//             totalCount: 0
//         }
//         for (let i = 0; i < files.length; i++) {
//             const file = files[i]
//             filesInfo.totalSize += file.size
//             filesInfo.totalCount += 1
//         }
//         return filesInfo
//     }

//     function groupFiles(files: DataTypes.FileInfo[]): DataTypes.FileInfo[][] {
//         // 每 100 个文件一组进行分类
//         const groupNum = appCfg.folderClassifyNum
//         const groupedFiles: DataTypes.FileInfo[][] = []
//         for (let i = 0; i < files.length; i += groupNum) {
//             groupedFiles.push(files.slice(i, i + groupNum))
//         }
//         return groupedFiles
//     }

//     async function moveFilesToFolders(
//         // 创建文件夹并移动文件
//         groupedFiles: DataTypes.FileInfo[][],
//         baseDir: string
//     ): Promise<void> {
//         for (let i = 0; i < groupedFiles.length; i++) {
//             const group = groupedFiles[i]
//             const folderName = path.join(baseDir, String(i + 1))
//             try {
//                 // 检查文件夹是否存在
//                 await fs.promises.access(folderName)
//             } catch (error) {
//                 // 文件夹不存在，创建文件夹
//                 if (!error) {
//                     logger.log('folder exist')
//                 }
//                 try {
//                     await fs.promises.mkdir(folderName, { recursive: true })
//                 } catch (mkdirError) {
//                     console.error(`创建文件夹 ${folderName} 时出错:`, mkdirError)
//                     continue
//                 }
//             }
//             for (const file of group) {
//                 const sourcePath = file.filePath
//                 const fileName = path.basename(sourcePath)
//                 const destinationPath = path.join(folderName, fileName)
//                 try {
//                     // 移动文件
//                     const fileExists = await checkFileExists(destinationPath)
//                     await fs.promises.rename(sourcePath, destinationPath)
//                     if (!fileExists) {
//                         logger.log(`move ${sourcePath} to ${destinationPath} success`)
//                     }
//                 } catch (renameError) {
//                     console.error(`move ${sourcePath} to ${destinationPath} error:`, renameError)
//                 }
//             }
//         }
//     }

//     const filesInfo = calculateFilesInfo(files)

//     // 根据文件名中的时间戳进行排序
//     const sortFiles = files.slice().sort((a, b) => {
//         const startTimeA = DataTypes.FileTools.parse_filename_mi(a.title)?.startTime
//         const startTimeB = DataTypes.FileTools.parse_filename_mi(b.title)?.startTime
//         if (startTimeA === undefined) {
//             return 0
//         }
//         if (startTimeB === undefined) {
//             return 0
//         }
//         return startTimeA.localeCompare(startTimeB)
//     })

//     // 目前仅仅是检查文件名中的时间戳是否连续
//     check_record_time(sortFiles)

//     const baseDir = folderpath
//     // 文件分组
//     const groupedFiles = groupFiles(sortFiles)
//     // 安装分组结果移动文件夹
//     await moveFilesToFolders(groupedFiles, baseDir)

//     // 仅仅是 检查分组后的文件夹和分组前的文件夹的信息是否相同
//     const traversalFolder2 = new TraversalFolder()
//     traversalFolder2.type = 'search'
//     traversalFolder2.folder = folderpath
//     const files2resp = await traversalFolder2.start()

//     if (files2resp.code === 0) {
//         if (files2resp.data?.files != null) {
//             const filesInfo2 = calculateFilesInfo(files2resp.data.files)
//             // 比较两个文件夹的信息
//             let bEqual = true
//             if (filesInfo.totalSize !== filesInfo2.totalSize) {
//                 logger.log('two folder total size are not equal')
//                 bEqual = false
//             }
//             if (filesInfo.totalCount !== filesInfo2.totalCount) {
//                 logger.log('two folder total count are not equal')
//                 bEqual = false
//             }
//             if (bEqual) {
//                 logger.log(
//                     `two folder are equal, file count ${filesInfo.totalCount}, size:${filesInfo.totalSize}B, ${filesInfo.totalSize / 1024 / 1024}MB, ${filesInfo.totalSize / 1024 / 1024 / 1024}GB`
//                 )
//             } else {
//                 logger.log(
//                     `two folder are not equal, before file count ${filesInfo.totalCount}, size:${filesInfo.totalSize}B, ${filesInfo.totalSize / 1024 / 1024}MB, ${filesInfo.totalSize / 1024 / 1024 / 1024}GB`,
//                     `, after file count ${filesInfo2.totalCount}, size:${filesInfo2.totalSize}B, ${filesInfo2.totalSize / 1024 / 1024}MB, ${filesInfo2.totalSize / 1024 / 1024 / 1024}GB`
//                 )
//             }
//         }
//     }
//     return resp.success('file classify success')
// }

// // 开始切割视频
// async function start_cut_video(
//     req: DataTypes.Req<DataTypes.Req_CutVideo>
// ): Promise<DataTypes.Resp<DataTypes.Resp_CutVideo>> {
//     mediaProc
//         .cutVideo(req)
//         .then((resp) => {
//             workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//         })
//         .catch((error) => {
//             workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
//         })
//     const resp = new DataTypes.Resp<DataTypes.Resp_CutVideo>()
//     resp.code = 0
//     resp.status = 'success'
//     resp.bOver = false
//     return resp
// }

// async function start_sync_trash(
//     req: DataTypes.Req<DataTypes.Req_SyncTrash>
// ): Promise<DataTypes.Resp> {
//     const resp = new DataTypes.Resp()
//     if (req.data?.folder === undefined) {
//         return resp.err('folder is undefined')
//     }
//     req.data.folder = path.join(req.data.folder, appCfg.trashFolder)
//     const traversalFolder = new TraversalFolder()
//     traversalFolder.type = null
//     traversalFolder.folder = req.data.folder
//     traversalFolder
//         .start()
//         .then(async (resp: DataTypes.Resp<DataTypes.TraversalFolder>) => {
//             if (resp.data?.files != null) {
//                 logger.log(
//                     `traversal folder ${traversalFolder.folder} : ${resp.status}, ${resp.data.files?.length}`
//                 )
//                 const resp_classify = await recordsProc.start_file_classify(req, resp.data.files)
//                 if (resp_classify.code !== 0) {
//                     workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//                     return
//                 }
//                 workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//             } else {
//                 logger.log('traversal folder:', resp.status)
//                 workQueue.addResp({ cmd: req.cmd, data: JSON.stringify(resp) })
//             }
//         })
//         .catch((error: unknown) => {
//             logger.error('open folder err:', error)
//             workQueue.addResp({ cmd: req.cmd, data: JSON.stringify({ code: 1, status: error }) })
//         })
//     return resp.success('success')
// }

class RecordsProc {
    // start_file_classify = file_classify
    // start_cut_video = start_cut_video
    // start_sync_trash = start_sync_trash


    thumbnail_path_get_mp4(repoName: string, fPath: string): string {
        const repo = DataTypes.DataRepo.getRepoByPath(repoName, appCfg.prj.dataRepo)
        if (repo == null) {
            return ''
        }
        if (repo.thumbnailPath == '') {
            return ''
        }
        return path.join(repo.thumbnailPath, path.basename(fPath, '.mp4'))
    }

    async thumbnail_get_mp4_path(fPath: string): Promise<DataTypes.Resp<string>> {
        const resp = new DataTypes.Resp<string>()
        const searchReq = new DataTypes.FilesReq()
        searchReq.path = fPath
        const searchResp = await appDb.file_view_search(searchReq)
        if (searchResp.code !== 0) {
            return resp.err('search file error')
        }
        if (searchResp.data?.files == null || searchResp.data.files.length === 0) {
            return resp.err('search file error')
        }
        resp.data = this.thumbnail_path_get_mp4(searchResp.data.files[0].repo, fPath)
        return resp.success('success')
    }

    async gen_thumbnail(fileInfo: DataTypes.File): Promise<DataTypes.Resp<string[]>> {
        const resp = new DataTypes.Resp<string[]>()
        resp.data = []
        const filepath = fileInfo.path
        const filename = fileInfo.name
        const repo = DataTypes.DataRepo.getRepoByPath(fileInfo.repo, appCfg.prj.dataRepo)
        if (repo == null) {
            return resp.err('repo is null')
        }

        const thumbnail_dir = repo.thumbnailPath
        if (thumbnail_dir === '') {
            return resp.err('thumbnail dir is empty')
        }
        const file_thubmbnail_dir = this.thumbnail_path_get_mp4(fileInfo.repo, filepath)
        // logger.info(`gen thumbnail: ${filepath}, ${file_thubmbnail_dir}`)
        let bExist = true
        //1, 检查对应的文件的缩略图是否已经存在
        try {
            await fs.promises.access(file_thubmbnail_dir)
        } catch (error) {
            if (!error) console.log(error)
            bExist = false
        }
        if (bExist) {
            return resp.success('thumbnail exist')
        }

        let timePeriod = 10
        {
            const size = fileInfo.size
            const duration = fileInfo.duration
            const totalThumbNum = Math.floor(duration * appCfg.prj.thumbEachSec)
            if (totalThumbNum > 24) {
                timePeriod = duration / 24
                timePeriod = Math.floor(timePeriod)
            }
            logger.info(
                `thumb size=${size},duration=${duration},total=${totalThumbNum}, period=${timePeriod}`
            )
        }

        //2, 先删除临时文件夹，再创建新文件夹
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
        // 3, 获取文件名称中的信息
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
            const realThumbPath = path.join(
                file_thubmbnail_dir,
                `${DataTypes.FileTools.parsetimeToTimeStr(picTime)}.jpg`
            )
            resp.data.push(realThumbPath)
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
                    const child = execFile(`${appCfg.ffmpegExe}`, args, (error) => {
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
            time += timePeriod
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
}

const recordsProc = new RecordsProc()
export default recordsProc
