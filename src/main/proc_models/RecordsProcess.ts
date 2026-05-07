import logger from './Logger.js'
import { taskManager } from './TaskEvent.js'
import appCfg from './AppCfg.js'
import appDb from './AppDb'
import mediaProc from './MediaProcess.js'
import * as path from 'path'
import * as fs from 'fs'
import { execFile } from 'child_process'
import * as Dty from '../../bridge/dataTypedef'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { Util } from './Utils.js'

// async function checkFileExists(filePath: string): Promise<boolean> {
//     try {
//         // Try to access file
//         await fs.promises.access(filePath, fs.constants.F_OK)
//         return true
//     } catch (error) {
//         if (!error) {
//             logger.log('access error:', error)
//         }
//         return false
//     }
// }

// // Check if file record times are continuous
// function check_record_time(files: Dty.FileInfo[]): void {
//     // let lastStartTime: string = ''
//     let lastEndTime: string = ''
//     for (let i = 0; i < files.length; i++) {
//         const file = files[i]
//         const parseRe = Dty.FileTools.miFilenameParse(file.title)
//         if (parseRe == null) {
//             continue
//         }
//         const { startTime, endTime } = parseRe
//         const lastEndTimeSeconds = Dty.FileTools.parse_timestr_2_seconds(lastEndTime)
//         const startTimeSeconds = Dty.FileTools.parse_timestr_2_seconds(startTime)
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

// // File classification processing
// async function file_classify(
//     req: Dty.Req<Dty.Req_SearchFile>,
//     files: Dty.FileInfo[]
// ): Promise<Dty.Resp> {
//     const resp = new Dty.Resp()
//     const folderpath = req.data?.folder
//     if (folderpath === undefined) {
//         return resp.err('folder is undefined')
//     }

//     function calculateFilesInfo(files: Dty.FileInfo[]): {
//         totalSize: number
//         totalCount: number
//     } {
//         // Calculate media info
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

//     function groupFiles(files: Dty.FileInfo[]): Dty.FileInfo[][] {
//         // Group every 100 files for classification
//         const groupNum = appCfg.folderClassifyNum
//         const groupedFiles: Dty.FileInfo[][] = []
//         for (let i = 0; i < files.length; i += groupNum) {
//             groupedFiles.push(files.slice(i, i + groupNum))
//         }
//         return groupedFiles
//     }

//     async function moveFilesToFolders(
//         // Create folders and move files
//         groupedFiles: Dty.FileInfo[][],
//         baseDir: string
//     ): Promise<void> {
//         for (let i = 0; i < groupedFiles.length; i++) {
//             const group = groupedFiles[i]
//             const folderName = path.join(baseDir, String(i + 1))
//             try {
//                 // Check if folder exists
//                 await fs.promises.access(folderName)
//             } catch (error) {
//                 // Folder doesn't exist, create folder
//                 if (!error) {
//                     logger.log('folder exist')
//                 }
//                 try {
//                     await fs.promises.mkdir(folderName, { recursive: true })
//                 } catch (mkdirError) {
//                     console.error(`Error creating folder ${folderName}:`, mkdirError)
//                     continue
//                 }
//             }
//             for (const file of group) {
//                 const sourcePath = file.filePath
//                 const fileName = path.basename(sourcePath)
//                 const destinationPath = path.join(folderName, fileName)
//                 try {
//                     // Move file
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

//     // Sort by timestamp in filename
//     const sortFiles = files.slice().sort((a, b) => {
//         const startTimeA = Dty.FileTools.miFilenameParse(a.title)?.startTime
//         const startTimeB = Dty.FileTools.miFilenameParse(b.title)?.startTime
//         if (startTimeA === undefined) {
//             return 0
//         }
//         if (startTimeB === undefined) {
//             return 0
//         }
//         return startTimeA.localeCompare(startTimeB)
//     })

//     // Currently just checking if timestamps in filenames are continuous
//     check_record_time(sortFiles)

//     const baseDir = folderpath
//     // Group files
//     const groupedFiles = groupFiles(sortFiles)
//     // Move files according to grouping results
//     await moveFilesToFolders(groupedFiles, baseDir)

//     // Just checking if info matches before and after grouping
//     const traversalFolder2 = new TraversalFolder()
//     traversalFolder2.type = 'search'
//     traversalFolder2.folder = folderpath
//     const files2resp = await traversalFolder2.start()

//     if (files2resp.code === 0) {
//         if (files2resp.data?.files != null) {
//             const filesInfo2 = calculateFilesInfo(files2resp.data.files)
//             // Compare info of two folders
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

async function start_cut_video(
    req: Dty.Req<Dty.Req_CutVideo>
): Promise<Dty.Resp<Dty.Resp_CutVideo>> {
    const taskId = taskManager.startTask(req.cmd)
    if (!taskId) {
        const resp = new Dty.Resp<Dty.Resp_CutVideo>()
        return resp.err(taskManager.makeBusyResponse().status)
    }

    mediaProc
        .cutVideo(req)
        .then((resp) => {
            const notify: Dty.TaskNotify<Dty.Resp<Dty.Resp_CutVideo>> = {
                taskId: taskId,
                cmd: req.cmd,
                status: resp.code === 0 ? Dty.TaskStatus.Completed : Dty.TaskStatus.Failed,
                result: resp,
                error: resp.code !== 0 ? resp.status : undefined
            }
            Util.sendTaskNotify(notify)
            taskManager.completeTask(taskId, resp.code === 0)
        })
        .catch((error) => {
            const notify: Dty.TaskNotify<Dty.Resp<Dty.Resp_CutVideo>> = {
                taskId: taskId,
                cmd: req.cmd,
                status: Dty.TaskStatus.Failed,
                error: String(error)
            }
            Util.sendTaskNotify(notify)
            taskManager.completeTask(taskId, false)
        })
    const resp = new Dty.Resp<Dty.Resp_CutVideo>()
    resp.code = 0
    resp.status = 'success'
    resp.bOver = false
    return resp
}

// async function start_sync_trash(
//     req: Dty.Req<Dty.Req_SyncTrash>
// ): Promise<Dty.Resp> {
//     const resp = new Dty.Resp()
//     if (req.data?.folder === undefined) {
//         return resp.err('folder is undefined')
//     }
//     req.data.folder = path.join(req.data.folder, appCfg.trashFolder)
//     const traversalFolder = new TraversalFolder()
//     traversalFolder.type = null
//     traversalFolder.folder = req.data.folder
//     traversalFolder
//         .start()
//         .then(async (resp: Dty.Resp<Dty.TraversalFolder>) => {
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
    start_cut_video = start_cut_video
    // start_sync_trash = start_sync_trash

    file_trash_path_get(fInfo: Dty.File): string {
        const repo = Dty.DataRepo.getRepoByPath(fInfo.repo, appCfg.prj.dataRepo)
        if (repo == null) {
            return ''
        }
        if (repo.thumbnailPath == '') {
            return ''
        }
        const fTrashPath = path.join(repo.path, '.trash', fInfo.name)
        return fTrashPath
    }

    // get file thumbnail full path by file path
    thumbnail_path_get_mp4(repoName: string, fPath: string): string {
        const repo = Dty.DataRepo.getRepoByPath(repoName, appCfg.prj.dataRepo)
        if (repo == null) {
            return ''
        }
        if (repo.thumbnailPath == '') {
            return ''
        }
        return path.join(repo.thumbnailPath, path.basename(fPath, '.mp4'))
    }

    thumTrashPathGetByMp4(repoName: string, fileName: string): string {
        const repo = Dty.DataRepo.getRepoByPath(repoName, appCfg.prj.dataRepo)
        if (repo == null) {
            return ''
        }
        if (repo.thumbnailPath == '') {
            return ''
        }
        return path.join(repo.thumbnailPath, '.trash', `${fileName}_thumbnail.db`)
    }

    async thumbnail_get_mp4_path(fPath: string): Promise<Dty.Resp<string>> {
        const resp = new Dty.Resp<string>()
        const searchReq = new Dty.FilesReq()
        searchReq.path = fPath
        const searchResp = await appDb.fileViewSearch(searchReq)
        if (searchResp.code !== 0) {
            return resp.err('search file error')
        }
        if (searchResp.data?.files == null || searchResp.data.files.length === 0) {
            return resp.err('search file error')
        }
        resp.data = this.thumbnail_path_get_mp4(searchResp.data.files[0].repo, fPath)
        return resp.success('success')
    }

    /**
     * Generate thumbnail
     * @param fileInfo File info
     * @param genType Generation type
     * @returns Thumbnail path array
     */
    async gen_thumbnail(fileInfo: Dty.File, genType: Dty.ThumbType): Promise<Dty.Resp<string[]>> {
        const resp = new Dty.Resp<string[]>()
        resp.data = []
        const filepath = fileInfo.path
        const filename = fileInfo.name
        const thumbDbFilePath = Util.thumbDbPathGet(filename, genType)
        const thumbPath = Util.thumbPathGet(genType)
        const trashThumbDbPath = Util.thumbTrashDbPathGet(fileInfo.name, genType)
        if (thumbPath === '') {
            return resp.err('thumbnail dir is empty')
        }
        let bExist = true
        try {
            await fs.promises.access(thumbDbFilePath, fs.constants.F_OK)
        } catch (error) {
            if (!error) logger.error(error)
            bExist = false
        }
        if (!bExist) {
            try {
                await fs.promises.access(trashThumbDbPath, fs.constants.F_OK)
                try {
                    await fs.promises.rename(trashThumbDbPath, thumbDbFilePath)
                    logger.info(
                        `find thumbnail in trash, move ${trashThumbDbPath} to ${thumbDbFilePath}`
                    )
                    bExist = true
                } catch (error) {
                    if (!error) logger.error(error)
                    bExist = false
                }
            } catch (error) {
                if (!error) logger.error(error)
                bExist = false
            }
        }

        if (bExist) {
            resp.success('thumbnail exist')
            logger.info(`thumbnail exist: ${fileInfo.path}`)
            resp.code = Dty.RespCode.FileExist
            return resp
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

        //2, Delete temp folder first, then create new folder
        const tmpThumbDir = path.join(thumbPath, 'tmp')
        try {
            await fs.promises.access(tmpThumbDir)
            await fs.promises.rm(tmpThumbDir, { recursive: true })
        } catch (error) {
            if (!error) console.log(error)
        }
        try {
            await fs.promises.mkdir(tmpThumbDir, { recursive: true })
        } catch (error) {
            logger.log(`mkdir error ${error}`)
            return resp.err(`mkdir error ${error}`)
        }
        // 3, Get info from filename
        const parseRe = Dty.FileTools.miFilenameParse(filename)
        if (parseRe == null) {
            return resp.err(`parse filename error ${filename}`)
        }
        const { startTime, endTime } = parseRe
        const startTimeSeconds = Dty.FileTools.parse_timestr_2_seconds(startTime)
        const endTimeSeconds = Dty.FileTools.parse_timestr_2_seconds(endTime)
        const duration = endTimeSeconds - startTimeSeconds
        let time = 0
        let bOver = true
        while (time <= duration) {
            const picTime = startTimeSeconds + time
            const thumbFileName = `${Dty.FileTools.parsetimeToTimeStr(picTime)}.jpg`
            const outputPath = path.join(tmpThumbDir, thumbFileName)
            resp.data.push(thumbFileName)
            const width = 640 // Set image width
            const height = 480 // Set image height
            let args = [
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
            if (genType == Dty.ThumbType.Frame) {
                args = [
                    '-v',
                    'error',
                    '-ss',
                    time.toString(),
                    '-i',
                    filepath,
                    '-vframes',
                    '1',
                    outputPath
                ]
            }

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
                        // Ensure process is closed
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

        {
            logger.log(`gen thumbnail db: ${thumbDbFilePath}`)
            const thumbDb: Database = await open({
                filename: thumbDbFilePath,
                driver: sqlite3.Database
            })
            await thumbDb.exec(Util.thumbDbCreateSqlGet())
            await thumbDb.exec(Util.thumbDbCreateSqlInfoGet())

            // Start transaction to improve batch insert performance
            await thumbDb.run('BEGIN TRANSACTION')

            try {
                // Traverse all files under tmpThumbDir directory, and batch insert thumbnail files into thumbDb database
                const files = await fs.promises.readdir(tmpThumbDir)

                // Insert media info into infos table
                if (fileInfo.mediaInfo !== null) {
                    let infoStmt
                    try {
                        infoStmt = await thumbDb.prepare(
                            'INSERT INTO infos (name, type, content) VALUES (?, ?, ?)'
                        )
                        await infoStmt.run('mediaInfo', 1, JSON.stringify(fileInfo.mediaInfo))
                    } finally {
                        if (infoStmt) {
                            await infoStmt.finalize()
                        }
                    }
                }

                // Use prepared statement to improve insert efficiency
                const stmt = await thumbDb.prepare(
                    'INSERT INTO files (filename, raw, type, desc) VALUES (?, ?, ?, ?)'
                )

                // Control concurrency to avoid high memory usage, while improving sequential read efficiency for HDD
                const batchSize = 10
                for (let i = 0; i < files.length; i += batchSize) {
                    const batch = files.slice(i, i + batchSize)

                    // Read a batch of files in parallel
                    const filePromises = batch.map(async (file) => {
                        const filePath = path.join(tmpThumbDir, file)
                        const fileStat = await fs.promises.stat(filePath)
                        if (fileStat.isFile()) {
                            const imageData = await fs.promises.readFile(filePath)
                            return [file, imageData]
                        }
                        return null
                    })

                    const results = await Promise.all(filePromises)

                    // Batch insert into database
                    for (const result of results) {
                        if (result !== null) {
                            const [filename, imageData] = result
                            await stmt.run(filename, imageData, 1, '')
                        }
                    }
                }

                await stmt.finalize()
                await thumbDb.run('COMMIT')
            } catch (error) {
                await thumbDb.run('ROLLBACK')
                throw error
            } finally {
                await thumbDb.close()
            }
        }

        // Delete temporary folder
        try {
            await fs.promises.rm(tmpThumbDir, { recursive: true })
        } catch (error) {
            logger.log(`remove tmp folder error, ${error}`)
            return resp.err(`remove tmp folder error, ${error}`)
        }

        return resp.success('success')
    }
}

const recordsProc = new RecordsProc()
export default recordsProc
